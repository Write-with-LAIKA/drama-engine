import { AutoCompanion } from "./companions/auto-companion";
import { CompanionConfig } from "./companions/companion";
import { JobResponse } from "./model";
import { logger } from "./utils/logging-utils";

export type ContextDataTypes =
	// everywhere
	"companionNames" |		// The other companions around
	"error" |			// An error that occurred
	"conversationID" |	// A conversation can have multiple turns. They all share an ID

	// downstream (chat/app > companion / prompt])
	"chat" |			// The compressed chat history (only for the moderator & care bot)
	"knowledge" |		// Unlocked knowledge
	"text" |			// A line of text provided by the client
	"paragraph" |		// A paragraph of text provided by the client
	"epilogue" |		// Text that should always go to the end of the system prompt
	"input" |			// An input provided by a user
	"action" |			// An active action

	// midstream (companion > prompt)
	"persona" |			// The parts of the person that should be exhibited in this prompt
	"job" |				// The instruction to the LLM
	"mood" |			// Change the mood of the companion

	// upstream (companion > chat/app)
	"question" |		// A question by the deputy
	"answer" |			// An answer returned by a deputy
	"excerpt" |			// An item that should be added to the chat instead of the "message".
	"quote" |			// An item that should be added to the chat instead of a chat message
	"message" |			// The message to be added to the chat history. Also goes into the prompt.

	// tool usage
	"tool" 				// A tool to use
;

export type ContextDecorator = { type: ContextDataTypes, replacement: string };
export type ContextData = { type: ContextDataTypes, data: string };

export const defaultDecorators: ContextDecorator[] = [
	{ type: "persona", replacement: "{{DATA}}" },
	{ type: "text", replacement: "USER TEXT=\"{{DATA}}\"." },
	// { type: "input", replacement: "USER TEXT=\"{{DATA}}\"." },
	{ type: "paragraph", replacement: "USER PARAGRAPH=\"{{DATA}}\"" },
	{ type: "companionNames", replacement: "OTHER CHAT PARTICIPANTS:\n{{DATA}}" },
	// { type: "job", replacement: "JOB=\"{{DATA}}\"" },
	{ type: "job", replacement: "{{DATA}}" },
	{ type: "chat", replacement: "\n{{DATA}}" },
	{ type: "knowledge", replacement: "\n{{DATA}}" },
	{ type: "epilogue", replacement: "{{DATA}}" },
]

export class Context {

	// everywhere
	companionNames?: string;	// The other companions around
	error?: string;				// An error that occurred
	conversationID?: string;	// A conversation can have multiple turns. They all share an ID
	interactionID?: string;		// An interaction is one string of activity triggered by the user (e.g. an action and all responses)
	sequenceID?: string;		// ID for a sequence of actions

	// downstream (user > companion)
	chat?: string;				// The compressed chat history (only for the moderator & care bot)
	knowledge?: string;			// Unlocked knowledge
	text?: string;				// A line of text provided by the client
	paragraph?: string;			// A paragraph of text provided by the client
	epilogue?: string;			// Text that should always go to the end of the system prompt
	input?: string;				// An input provided by a user
	action?: string;			// An active action

	// midstream (companion > prompt)
	persona?: string;			// The parts of the person that should be exhibited in this prompt
	job?: string;				// The instruction to the LLM
	mood?: string;				// Change the mood of the companion

	// upstream (companion > user)
	question?: string;			// A question by the deputy
	answer?: string;			// An answer returned by a deputy
	excerpt?: string;			// An item that should be added to the chat instead of the "message".
	quote?: string;				// An item that should be added to the chat instead of a chat message
	message?: string;			// The message to be added to the chat history. Also goes into the prompt.

	// tool usage
	tool?: string; 				// A tool to use


	// INPUT: these go into the next companion
	recipient?: AutoCompanion;		// Will be the next speaker (and receive this context) if set.
	companions: AutoCompanion[];	// Companions to be added as other chat participants in the prompt
	chatID: string;					// The chat this context belongs to
	situation: string;				// An identifier of the situation
	// data: ContextData[];

	// TRACKING: these get set whenever there's relevant activity
	input_tokens: number = 0;
	output_tokens: number = 0;
	runtime: number = 0;
	response_id?: string;

	constructor(recipient: AutoCompanion | undefined, companions: AutoCompanion[], chatID: string, situation: string, data?: ContextData[]) {
		this.recipient = recipient;
		this.companions = companions;
		this.chatID = chatID;
		this.situation = situation;

		if (data) {
			this.companionNames = data.find(d => d.type == "companionNames")?.data;
			this.error = data.find(d => d.type == "error")?.data;
			this.conversationID = data.find(d => d.type == "conversationID")?.data;
			this.chat = data.find(d => d.type == "chat")?.data;
			this.knowledge = data.find(d => d.type == "knowledge")?.data;
			this.text = data.find(d => d.type == "text")?.data;
			this.paragraph = data.find(d => d.type == "paragraph")?.data;
			this.epilogue = data.find(d => d.type == "epilogue")?.data;
			this.input = data.find(d => d.type == "input")?.data;
			this.action = data.find(d => d.type == "action")?.data;
			this.persona = data.find(d => d.type == "persona")?.data;
			this.job = data.find(d => d.type == "job")?.data;
			this.mood = data.find(d => d.type == "mood")?.data;
			this.question = data.find(d => d.type == "question")?.data;
			this.answer = data.find(d => d.type == "answer")?.data;
			this.excerpt = data.find(d => d.type == "excerpt")?.data;
			this.quote = data.find(d => d.type == "quote")?.data;
			this.message = data.find(d => d.type == "message")?.data;
			this.tool = data.find(d => d.type == "tool")?.data;
		}
	}

	addUsage = (response: JobResponse) => {
		this.response_id = response.id;
		this.input_tokens += response.input_tokens || 0;
		this.output_tokens += response.output_tokens || 0;
		// this.runtime += response.runtime || 0;
	}

	findActionConfiguration = (configuration: CompanionConfig) => configuration.actions?.find(a => a.id == this.action);

	findDelegate = (configuration: CompanionConfig, companions: AutoCompanion[]) => {
		const action = this.findActionConfiguration(configuration);
		const answer = this.hasAnswer();

		logger.debug("ACTION: " + action?.id);
		logger.debug("ANSWER: " + answer);

		// reply with deputy if there's an action but there's no answer yet. This will delegate the action.
		if (action && !answer) {
			const deputy = companions.find(c => c.id == action.deputy);

			logger.debug("Action " + action.id + " => " + deputy + " found.");

			if (deputy) {
				// the deputy sets the next speaker
				return deputy;
			} else {
				logger.debug("Deputy " + action.deputy + " not found.");

				logger.debug(companions)
			}
		}
		return undefined;
	}

	hasAnswer = () => this.answer || this.question || this.quote;

	// whether there is a field with context info or the deputy needs to ask for more information
	query = () => this.text || this.input || this.paragraph;


	// getData = (type: ContextDataTypes) => this.data.find(d => d.type == type)?.data;
	// setData = (type: ContextDataTypes, data: string | undefined) => {
	// 	if (!data) {
	// 		// remove entry if data is undefined
	// 		this.removeData(type);
	// 		return;
	// 	}
	// 	this.data = [...this.data.filter(d => d.type != type), { type: type, data: data }];
	// }
	// removeData = (type: ContextDataTypes) => this.data = this.data.filter(d => d.type != type);

}