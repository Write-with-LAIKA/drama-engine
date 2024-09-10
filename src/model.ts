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
	private modelConfig: ModelConfig;
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
	get promptTemplate(): PromptTemplate {
		return this.modelConfig.extra.template;
	}
	get promptConfig(): PromptConfig {
		return this.modelConfig.extra.promptConfig;
	}

	// promptTemplate: PromptTemplate = this.modelConfig.extra.template;
	// promptConfig: PromptConfig = this.modelConfig.extra.promptConfig;

	/**
	 * Creates an instance of Model.
	 * @param {string}
	 * @memberof Model
	 */
	constructor(path: string, modelConfig: ModelConfig = defaultModelConfig) {
		this.modelConfig = modelConfig;
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
		// Mostly taken from https://stackoverflow.com/a/75751803

		let buffer: string = '';
		let completeResponse: string[] = []
		let completedData: any = null;

		const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader();
		if (!reader) {
			throw new Error('Response body is unreadable or cannot be decoded as text.');
		};

		while (true) {
			let dataDone = false;
			const { done, value } = await reader.read();

			if (done || dataDone) {
				if (completedData) {
					completedData.response = completeResponse.join('');
					return completedData;
				}
				throw new Error("Error in response stream or incomplete stream received.")
			}

			buffer += value;
			const lines = buffer.split('\n');

			lines.forEach((data) => {
				const line = data.trim();

				if (!line) return;
				if (!line.startsWith('data:')) return;
				if (line === 'data: [DONE]') return;

				const dataMessage = line.substring(5).trim();
				logger.debug(`Data: ${dataMessage}\n`);

				try {
					const dataObject = JSON.parse(dataMessage);
					completedData = dataObject;

					/**
					 * NOTE:
					 * In a streaming response, `responseChunk` will contain a single token.
					 * If streaming directly to UI components, yield every `responseChunk`.
					 */
					const responseChunk: string = dataObject.choices[0]?.text || dataObject.choices[0]?.delta?.content || '';
					completeResponse.push(responseChunk);
					buffer = '';
				} catch (error) {
					logger.debug('Received non-JSON stream chunk:', line);
				}
			});
		}

	};

	private processPOSTResponse = async (response: Response): Promise<JobResponse> => {
		let jsonResponse;

		const contentType = response.headers.get('content-type');
		const responseIsStream = contentType && contentType.includes('text/event-stream')

		logger.debug("Response is of type " + contentType);

		if (!responseIsStream) {
			jsonResponse = await response.json();
		} else {
			jsonResponse = await this.buildResponseFromStream(response);
		}

		const dataObject: JobResponse = this.jsonToJobResponse(jsonResponse);
		return dataObject;
	};

	private constructUrl = (url: string) => {
		const baseUrl = (process.env.DE_BASE_URL || process.env.NEXT_PUBLIC_DE_BASE_URL || "");
		const newUrl = (baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl) + "/" + (url.startsWith("/") ? url.slice(1) : url);
		return newUrl;
	}

	private isAuthTokenAvailable(headers?: Headers | HeadersInit): boolean {
		if (headers) {
			const newHeaders = new Headers(headers as HeadersInit);

			const authHeaderExists = (newHeaders?.get("authorization")?.length || 0) > 0;
			const apiKeyHeaderExists = (newHeaders?.get("x-api-key")?.length || 0) > 0;
			const authTokenHeaderExists = (newHeaders?.get("x-auth-token")?.length || 0) > 0;

			return authHeaderExists || apiKeyHeaderExists || authTokenHeaderExists;
		}
		return false;
	}

	private addHeaders(headers?: Headers | HeadersInit): Headers {
		const newHeaders = new Headers(headers);
		newHeaders.append("Accept", "application/json, text/event-stream");
		newHeaders.append("Content-Type", "application/json");

		const authTokenAvailable = this.isAuthTokenAvailable(newHeaders);

		if (!authTokenAvailable) {
			let apiKey = process.env.DE_BACKEND_API_KEY;
			if (!apiKey) {
				apiKey = process.env.NEXT_PUBLIC_DE_BACKEND_API_KEY;
				if (apiKey) {
					logger.warn("API key was found in a publicly exposed variable, `NEXT_PUBLIC_DE_BACKEND_API_KEY`. Ensure this was intended behaviour.");
				} else {
					logger.warn("No API keys were found. Checked the following headers: Authorization, X-API-KEY, X-Auth-Token. And the following variables: DE_BACKEND_API_KEY, NEXT_PUBLIC_DE_BACKEND_API_KEY. Ensure this was intended behaviour.");
				}
			}

			if (apiKey) {
				newHeaders.set('Authorization', `Bearer ${apiKey}`,)
			}
		}
		return newHeaders;
	}

	private postRequest = async (url: string, requestData: any, headers: Headers = new Headers()): Promise<Response> => {
		return fetch(url, {
			method: "POST",
			headers: headers,
			body: JSON.stringify(requestData),
		});
	}

	/**
	 * Call this function to run a job. Returns a job response and updates the local db.
	 *
	 * @param {Job} job
	 * @memberof Model
	 */
	runJob = async (job: Job, httpClient: any = this.postRequest): Promise<JobResponse | undefined> => {
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

		const newUrl = this.constructUrl(this.path);
		const newHeaders = this.addHeaders();

		return httpClient(newUrl, postData, newHeaders).then(async (res: Response) => {
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
		}).catch((e: Error | undefined) => {
			// db.prompts.add({ timeStamp: Date.now(), prompt: job.prompt || "No prompt found", result: "ERROR: " + JSON.stringify(e), config: JSON.stringify(this.modelConfig) });

			logger.error(e);

			throw new ModelError("Job failed!", "Invalid response.", job, undefined, e instanceof Error ? e : undefined);
		})
	}
}