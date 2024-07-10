import { KyInstance, Options } from "ky";
import { ModelConfig, defaultModelConfig } from "./config/models";
import { PromptConfig, PromptTemplate } from "./config/prompts";
import { Job } from "./job";
import { logger } from "./utils/logging-utils";

/**
 * The response from the backend/model including the number of tokens in and out.
 *
 * @export
 * @interface JobResponse
 */
export interface JobResponse {
	id: string;
	response: string | undefined;
	input_tokens: number | undefined;
	output_tokens: number | undefined;

	/** The following properties are unavailable in OpenAI-compatible response schema */
	// status: string | undefined;
	// error: string | boolean | undefined;
	// runtime: number | undefined;
}

export type Messages = {
	role: string,
	content: string,
}[];

type OptionalPropsType<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type GenerationParams = OptionalPropsType<ModelConfig, 'extra'>;
interface RequestPayload extends GenerationParams {
	prompt?: string,
	messages?: Messages,
	preset?: string,
	chat_id?: string,
	situation_id?: string,
	interaction_id?: string,
}

/**
 * Custom error class to wrap the job response
 *
 * @export
 * @class ModelError
 * @extends {Error}
 */
export class ModelError extends Error {
	reason: string;
	job: Job;
	jobResponse?: JobResponse;
	error?: Error;

	constructor(msg: string, reason: string, job: Job, jobResponse?: JobResponse, error?: Error) {
		super(msg);
		this.reason = reason;
		this.job = job;
		this.jobResponse = jobResponse;
		this.error = error;

		// Set the prototype explicitly.
		Object.setPrototypeOf(this, ModelError.prototype);
	}
}

/**
 * A model is an abstraction of a language model.
 *
 * @export
 * @class Model
 */
export class Model {
	private modelConfig: ModelConfig = defaultModelConfig;
	private path: string;

	/**
	 * All tokens sent to the model
	 *
	 * @type {number}
	 * @memberof Model
	 */
	inputTokens: number = 0;
	/**
	 * All tokens received from the model
	 *
	 * @type {number}
	 * @memberof Model
	 */
	outputTokens: number = 0;
	/**
	 * Accumulated runtime
	 *
	 * @type {number}
	 * @memberof Model
	 */
	runtime: number = 0.0;
	promptTemplate: PromptTemplate = this.modelConfig.extra.template;
	promptConfig: PromptConfig = this.modelConfig.extra.promptConfig;

	/**
	 * Creates an instance of Model.
	 * @param {string}
	 * @memberof Model
	 */
	constructor(path: string) {
		this.path = path.startsWith('/') ? path.slice(1) : path;
		return this;
	}

	private jsonToJobResponse = (jsonResponse: any) => {
		try {
			const jobResponse: JobResponse = {
				id: jsonResponse.id, // job_id
				response: jsonResponse.response || jsonResponse.choices[0]?.text || jsonResponse.choices[0]?.message?.content, // generated text - change this if n > 1 in inference params
				input_tokens: jsonResponse.usage?.prompt_tokens, // runtime of the request
				output_tokens: jsonResponse.usage?.completion_tokens, // runtime of the request

				/** The following properties are unavailable in OpenAI-compatible response schema */
				// status: jsonResponse.data?.status, // job status
				// error: !jsonResponse.status ? jsonResponse.detail : false, // API-response status or a detail
				// runtime: jsonResponse.runtime, // runtime of the request
			}
			return jobResponse;
		}
		catch (error) {
			logger.error('Error parsing JSON:', error);
			throw new Error("JSON Parsing error.");
		}
	}


	/**
	 * Builds a complete response object from an event-stream response.
	 *
	 * Useful, when streaming directly to user-facing components is not available.
	 *
	 * Waits for the streaming response to end and builds a response object that is the same
	 * as the response object when not streaming i.e., json response.
	 *
	 * @private
	 * @param {Response} response
	 * @memberof Model
	 */
	private buildResponseFromStream = async (response: Response) => {
		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error('Response body is not readable.');
		}

		let buffer = '';
		let completeResponse: string[] = []
		let completedData: any = null;

		const processTextStreamChunk = (chunk: Uint8Array) => {
			buffer += new TextDecoder('utf-8').decode(chunk);
			const lines = buffer.split('\r\n');

			for (let i = 0; i < lines.length - 1; i++) {
				const line = lines[i].trim();

				if (!line) continue;

				if (line.startsWith('data:')) {
					const dataMessage = line.substring(5).trim();
					// logger.debug(`Data: ${dataMessage}\n`);
					if (dataMessage && dataMessage !== '[DONE]') {
						try {
							const dataObject = JSON.parse(dataMessage);
							completedData = dataObject;
							/**
							 * NOTE: In streaming, `dataObject.choices[0]?.text` contains a single token.
							 *
							 * If streaming directly to UI components, this object can be used instead
							 * of waiting for the response to end.
							 */
							completeResponse.push(dataObject.choices[0]?.text)
						} catch (error) {
							logger.error('Error parsing JSON:', error);
							throw new Error("JSON Parsing error.")
						}
					}
					continue;
				}
			}

			buffer = lines[lines.length - 1];
		};

		while (true) {
			const { done, value } = await reader.read();

			if (done) {
				if (completedData) {
					completedData.choices[0].text = completeResponse.join('');
					return completedData;
				}
				throw new Error("Error in response stream or incomplete stream received.")
			}
			processTextStreamChunk(value!);
		}

	};

	private processPOSTResponse = async (response: Response): Promise<JobResponse> => {
		let jsonResponse;

		const contentType = response.headers.get('content-type');
		const responseIsStream = contentType && contentType.includes('text/event-stream')

		if (!responseIsStream) {
			jsonResponse = await response.json();
		} else {
			jsonResponse = await this.buildResponseFromStream(response);
		}

		const dataObject: JobResponse = this.jsonToJobResponse(jsonResponse);
		return dataObject;
	};


	/**
	 * Call this function to run a job. Returns a job response and updates the local db.
	 *
	 * @param {Job} job
	 * @param {KyInstance} instance
	 * @param {Options} [additionalOptions]
	 * @memberof Model
	 */
	runJob = async (job: Job, instance: KyInstance, additionalOptions?: Options): Promise<JobResponse | undefined> => {
		let jobResponse: JobResponse | undefined = undefined;

		const presetAction = job.context.action;

		if (!(job.prompt || job.messages)) throw new ModelError("Can not run inference", "No prompt or messages array found.", job);

		const postData: RequestPayload = {
			prompt: job.prompt,
			messages: job.messages,
			preset: presetAction,
			chat_id: job.context.chatID,
			situation_id: job.context.situation,
			interaction_id: job.context.interactionID,
			...(job.modelConfig || this.modelConfig),	// job can override parameters
		}
		delete postData["extra"];

		return instance.post(this.path, {
			json: postData,
			...additionalOptions
		}).then(async (res) => {
			jobResponse = await this.processPOSTResponse(res);

			// keep track of stats
			jobResponse.input_tokens && (this.inputTokens += jobResponse.input_tokens);
			jobResponse.output_tokens && (this.outputTokens += jobResponse.output_tokens);
			// jobResponse.runtime && (this.runtime += jobResponse.runtime);

			if (!jobResponse.id) {
				// logger.debug(jobResponse);
				throw new Error("Job ID not found!");
			}
			// if (jobResponse.status != "COMPLETED") {
			// 	throw new ModelError("Job failed! COMPLETED not set.", "Invalid response status.", job, jobResponse);
			// }

			return jobResponse;
		}).catch((e) => {
			// db.prompts.add({ timeStamp: Date.now(), prompt: job.prompt || "No prompt found", result: "ERROR: " + JSON.stringify(e), config: JSON.stringify(this.modelConfig) });

			logger.error(e);

			throw new ModelError("Job failed!", "Invalid response.", job, undefined, e instanceof Error ? e : undefined);
		})
	}
}