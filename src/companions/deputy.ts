import { cleanText, findCut, getLastParagraph, getLastSentence, getRandomParagraph } from "@/lib/string-utils";
import { Chat, ChatMessage } from "../chat";
import { Context, ContextDataTypes } from "../context";
import { Drama } from "../drama";
import { Job } from "../job";
import { AutoCompanion, CompanionReply } from "./auto-companion";
import { CompanionConfig } from "./companion";
import { largeContextModelConfig } from "../model-config";

/**
 * Deputies are agents that companions can use for specific purposes. The user never interacts with a deputy directly.
 * @date 11/01/2024 - 14:45:47
 *
 * @export
 * @class Deputy
 * @typedef {Deputy}
 * @extends {AutoCompanion}
 */
export abstract class Deputy extends AutoCompanion { 

	/**
	 * Creates an instance of Deputy. Deputies can use a different prompter than companions in the chat.
	 * @date 11/01/2024 - 14:45:47
	 *
	 * @constructor
	 * @param {CompanionConfig} configuration
	 * @param {?Prompter} [prompter]
	 */
	constructor(configuration: CompanionConfig, drama: Drama) {
		super(configuration, drama);

		switch (configuration.scope) {
			case "screen":
			case "some": this.registerReply("*", this.checkForSelection); 
			case "document": this.registerReply(this.wantsToSummarise, this.summariseDocumentInference, true); break;
			case "random_paragraph": this.registerReply("*", this.pickRandomParagraph, true); break;
			case "last_paragraph": this.registerReply("*", this.pickLastParagraph, true); break;
			case "last_sentence": this.registerReply("*", this.pickLastSentence, true); break;
			default: break;
		}

		return this;
	}

	wantsToSummarise = (context: Context, sender?: AutoCompanion) => { 		
		const document = context.query();
		return document != undefined && document.trim().length >= 2000;
	};

	protected abstract runAction(chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion): Promise<CompanionReply>;

	protected newDeputyJob = (prompt: string, context?: Context, situation?: string) => {
		const newContext: Context = context || new Context(this, [], "", situation || "deputy", []);
		
		const job: Job = {
			id: "internal",
			remoteID: "",
			status: "new",
			modelConfig: this.modelConfig,
			prompt: prompt,
			context: newContext,
			timeStamp: Date.now()
		}

		return job;

	}

	// return "true" (== finished) if no selection
	private checkForSelection = async (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion): Promise<CompanionReply> => {
		const document = context.query();
		context.error = "Not enough context";
		return [document == undefined || document.length == 0, context];
	}

	protected pickRandomParagraph = async (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion): Promise<CompanionReply> => {
		console.log("pickRandomParagraph", context)
		
		const document = context.query();
		if (!document) return [false, undefined];

		context.text = getRandomParagraph(document);
		context.paragraph = undefined;
		context.input = undefined;

		// console.log("result: " + context.text);

		return [false, context];
	}

	protected pickLastParagraph = async (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion): Promise<CompanionReply> => {
		console.log("pickLastParagraph", context)

		const document = context.query();
		if (!document) return [false, undefined];

		context.text = getLastParagraph(document);
		context.paragraph = undefined;
		context.input = undefined;
		return [false, context];
	}
	protected pickLastSentence = async (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion): Promise<CompanionReply> => {
		console.log("pickLastSentence", context)

		const document = context.query();
		if (!document) return [false, undefined];

		context.text = getLastSentence(document);
		context.paragraph = undefined;
		context.input = undefined;
		return [false, context];
	}
	/*
		4 characters / token
		32k tokens -> 120k characters

		5.44 characters / word
		1,800 characters / page => 450 tokens / page
	*/

	protected summariseDocumentInference = async (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion): Promise<CompanionReply> => {
		// console.log("summariseDocumentInference", { ...context })

		const document = context.query();
		if (!document) return [false, undefined];

		// console.log("document", document.substring(0, 250));

		let trimmedDocument = cleanText(document.trim()); // cut off if too long

		if (trimmedDocument.length < 2000) {
			// no summary needed because already short enough
			return [false, context];
		}

		if (trimmedDocument.length > 100000) {
			// we can only work with up to 120k characters so we cut this one into three 30k chunks
			// the first 40k, the last 40, and the 40k in the middle

			const documentSize = trimmedDocument.length;

			const shorter =
				trimmedDocument.substring(0, findCut(trimmedDocument, 30000)) + "\n\n" +
				trimmedDocument.substring(findCut(trimmedDocument, documentSize / 2 - 30000 / 2), findCut(trimmedDocument, documentSize / 2 + 30000 / 2)) + "\n\n" +
				trimmedDocument.substring(findCut(trimmedDocument, documentSize - 30000));
			
			trimmedDocument = shorter;
			
			console.log("Gigantic document cut down from " + documentSize + " to " + trimmedDocument.length + " characters before summary.");
		}

		const tempContext: Context =
			new Context(this, [], "", context.situation, [
				{ type: "job", data: "Read the following document and reply with a one page summary." },
				{ type: "action", data: "SUMMARISE_DOCUMENT" },
			]);
		
		// use our own prompter. make the context short because we only want to send the last part of the dialog
		// const prompt = chat.drama.prompter.assemblePrompt(this, chat.drama.worldState, tempContext,
		// 	[{
		// 		companion: this.drama.companions.find(c => c.configuration.kind == "user") || this,
		// 		message: trimmedDocument,
		// 		timeStamp: Date.now(),
		// 	 }],
		// 	undefined,
		// 	{ max_prompt_length: 100000, job_in_chat: true });

		const prompt = chat.drama.prompter.assemblePrompt(this, chat.drama.worldState, { ...tempContext, input: trimmedDocument },
			undefined,
			undefined,
			{ max_prompt_length: 100000, job_in_chat: false });
		
		const job = this.newDeputyJob(prompt, tempContext);

		// large model needed
		if (trimmedDocument.length > 30000) {
			job.modelConfig = largeContextModelConfig;
			console.log("Using large model");
		}

		try {
			const jobResponse = await chat.drama.runJob(job);
			context.text = jobResponse!.response;
			context.paragraph = undefined;
			context.input = undefined;

			// console.log("summariseDocumentInference", context)

			return [false, context];
		} catch (e) {
			console.error(e);
			return [true, undefined];
		}


	}


}