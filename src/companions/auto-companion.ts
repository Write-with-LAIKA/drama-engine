import { Chat, ChatMessage } from "../chat";
import { ActionDescription, Companion, CompanionConfig } from "./companion";
import { Context, ContextDataTypes, ContextDecorator } from "../context";
import { Drama } from "../drama";
import { Job } from "../job";
import { Deputy } from "./deputy";

export type CompanionReply = [boolean, Context | undefined];
export type ReplyTriggerTypes = undefined | number | AutoCompanion | string | ((context: Context, sender?: AutoCompanion) => boolean);
export type ReplyFunctionAsync = (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion) => Promise<CompanionReply>;

export class AutoCompanion extends Companion {

	protected drama: Drama;
	protected decorators: ContextDecorator[] = [];
	protected replyFunctions: { trigger: ReplyTriggerTypes | ReplyTriggerTypes[], replyFunction: ReplyFunctionAsync }[];

	constructor(configuration: CompanionConfig, drama: Drama) {
		super(configuration);
		this.drama = drama;
		this.replyFunctions = [];
		return this;
	}

	evaluateReplyTrigger = (replyTrigger: ReplyTriggerTypes | ReplyTriggerTypes[], context: Context, sender?: AutoCompanion): boolean => {
		if (replyTrigger == undefined) return sender == undefined;
		if (typeof replyTrigger == "string")
			return replyTrigger == "*" ||																			// fallback reply
				(context.action == replyTrigger) || 																// filter for action
				(sender != undefined && replyTrigger.search(sender.id) > 0);										// filter for sender name
		if (replyTrigger instanceof AutoCompanion) return sender != undefined && replyTrigger.id == sender.id;		// filter for sender object
		if (typeof replyTrigger == "function") return replyTrigger(context, sender);								// filter for callback function being true
		if (typeof replyTrigger == "number") return Math.random() <= replyTrigger;									// random trigger
		return replyTrigger.reduce<boolean>((previousValue, currentValue) => previousValue || this.evaluateReplyTrigger(currentValue, context, sender), false);
	}

	registerReply = (trigger: ReplyTriggerTypes | ReplyTriggerTypes[], replyFunction: ReplyFunctionAsync, front: boolean = false) => {
		if (front) { // prepend
			this.replyFunctions = [{ trigger: trigger, replyFunction: replyFunction }, ...this.replyFunctions];
		} else { // append			
			this.replyFunctions.push({ trigger: trigger, replyFunction: replyFunction })
		}
	}

	generateReply = async (chat: Chat, context: Context, sender?: AutoCompanion): Promise<Context> => {

		for (const replyFunction of this.replyFunctions) {
			if (this.evaluateReplyTrigger(replyFunction.trigger, context, sender)) {
				const [final, newContext] = await replyFunction.replyFunction(chat, context, this, sender);
				if (final) {
					return newContext || context;
				} else { 
					if (newContext)
						context = newContext;
				}
			}
		}

		return context;
	}

	runInference = async (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion): Promise<CompanionReply> => {
		const deputyDecorators = context && sender && (sender as Deputy)?.decorators;
		
		const newContext: Context = context || new Context(this, chat.companions, chat.id, chat.situation, []);
		const input = chat.drama.getInput(this, chat.history, context, deputyDecorators);

		const job: Job = {
			id: "internal",
			remoteID: "",
			status: "new",
			prompt: typeof input === "string" ? input : undefined,
			messages: typeof input !== "string" ? input : undefined,
			context: newContext,
			timeStamp: Date.now()
		}

		const jobResponse = await chat.drama.runJob(job);

		if (jobResponse && jobResponse.response) { 
			job.context.message = jobResponse.response;
			return [true, job.context];
		}

		return [false, job.context];

	}

}