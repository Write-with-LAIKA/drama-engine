import { Template } from "@huggingface/jinja";
import { ChatMessage } from "./chat";
import { Companion } from "./companions/companion";
import { evaluateCondition } from "./conditions";
import { PromptConfig, PromptTemplate, defaultPromptConfig } from "./config/prompts";
import { Context, ContextDataTypes, ContextDecorator, defaultDecorators } from "./context";
import { KeyValueRecord } from "./db/database";
import { getRandomElement } from "./utils/array-utils";
import { logger } from "./utils/logging-utils";
import { unixTimestampToDate } from "./utils/time-utils";
import { Messages } from "./model";

/**
 * A simple wrapper to make it possible to append text if and only if the text is not undefined. Separator between old
 * and new text can be set. Always appends at the end.
 *
 * @class Prompt
 */
class Prompt {
	/**
	 * The current prompt
	 *
	 * @type {string}
	 * @memberof Prompt
	 */
	prompt: string;
	constructor(basePrompt: string) { this.prompt = basePrompt; return this; };

	append = (data?: string, separator = "\n") => {
		data && (this.prompt = this.prompt + separator + data);
		return this;
	}
}

/**
 * Assemble the prompt.
 *
 * @export
 * @class Prompter
 */
export class Prompter {
	/**
	 * The (jinja) prompt template to use
	 *
	 * @private
	 * @type {Template}
	 * @memberof Prompter
	 */
	private template: Template;
	/**
	 * A template for the template
	 *
	 * @private
	 * @type {PromptTemplate}
	 * @memberof Prompter
	 */
	private config: PromptTemplate;

	/**
	 * Creates an instance of Prompter.
	 * @param {PromptTemplate} config
	 * @memberof Prompter
	 */
	constructor(config: PromptTemplate) {
		this.template = new Template(config.chat_template);
		this.config = config;
	}

	/**
	 * Decorate the prompt using data.
	 *
	 * @private
	 * @param {ContextDataTypes} type
	 * @param {string} [text]
	 * @param {ContextDecorator[]} [decorators]
	 * @memberof Prompter
	 */
	private decorate = (type: ContextDataTypes, text?: string, decorators?: ContextDecorator[]) => {
		if (!text || !decorators) return undefined;
		const decorator = decorators.find(d => d.type == type);
		return decorator && decorator.replacement.replace("{{DATA}}", text);
	}

	/**
	 * Clean the string
	 *
	 * @private
	 * @param {string} text
	 * @memberof Prompter
	 */
	private sanitize = (text: string) => {
		return text.replace(/<.*>/gi, "").trim();
	}

	/**
	 * Use jinja to render the prompt using the current configuration and template.
	 *
	 * @param {string} speaker
	 * @param {{ role: string, content: string }[]} chat
	 * @param {Template} [template=this.template]
	 * @memberof Prompter
	 */
	renderPrompt = (speaker: string, chat: { role: string, content: string }[], template: Template = this.template) => {
		const result = template.render({
			messages: chat,
			bos_token: this.config.bos_token,
			eos_token: this.config.eos_token,
			speaker: speaker,
		});

		if (true) {
			logger.debug("Prompt: ", result);
		}

		return result;
	}

	/**
	 * Assemble the prompt for one inference using the supplied data and world state.
	 *
	 * @param {Companion} companion
	 * @param {KeyValueRecord[]} worldState
	 * @param {Context} context
	 * @param {ChatMessage[]} [history]
	 * @param {ContextDecorator[]} [decorators=[]]
	 * @param {PromptConfig} [config=defaultPromptConfig]
	 * @param {PromptTemplate} [promptTemplate]
	 * @param {returnChat} [returnChat]
	 */
	assemblePrompt = (companion: Companion,
		worldState: KeyValueRecord[],
		context: Context,
		history?: ChatMessage[],
		decorators: ContextDecorator[] = [],	// eventual additional decorators
		config: PromptConfig = defaultPromptConfig,
		promptTemplate?: PromptTemplate,
		returnChat: boolean = false): string | Messages => {

		let tags: string[] = [];
		companion.configuration.knowledge && companion.configuration.knowledge
			.filter((knowledge) => knowledge.condition && evaluateCondition(knowledge.condition, worldState))
			.forEach((knowledge) => tags.push(getRandomElement(knowledge.lines)));

		const allDecorators = defaultDecorators.concat(decorators);

		const questionData = this.decorate("question", context.question, allDecorators);
		const personaData = this.decorate("persona", context.persona, allDecorators);
		const jobData = config.job_in_chat ? undefined : this.decorate("job", context.job, allDecorators);
		const answerData = this.decorate("answer", context.answer, allDecorators);
		const messageData = this.decorate("message", context.message, allDecorators);
		const quoteData = this.decorate("quote", context.quote, allDecorators);
		const epilogueData = this.decorate("epilogue", context.epilogue, allDecorators);
		const chatData = this.decorate("chat", context.chat, allDecorators);

		const textData = this.decorate("text", context.text, allDecorators);
		const paragraphData = this.decorate("paragraph", context.paragraph, allDecorators);
		const inputData = textData || paragraphData || this.decorate("text", context.input, allDecorators);;

		logger.debug("context", { ...context });
		logger.debug("input data", context.query()?.substring(0, 250));

		const moodData = companion.mood.prompt;

		// leave out shell companions because they are never a part of the chat history
		const otherCompanions = context.companions.filter(c => c.configuration.kind != "shell" && c.id != companion.id).map(c => c.configuration.name + ": " + c.configuration.description);
		const companionList = otherCompanions && otherCompanions.join("\n");

		// if there's an action we exclude knowledge, companions & situation
		const isAction = context.action != undefined;
		const knowledgeData = isAction ? undefined : this.decorate("knowledge", tags.join("\n"), allDecorators);
		const situationData = isAction ? undefined : companion.configuration.situations?.find(s => s.id == context.situation)?.prompt;
		const companionData = isAction ? undefined : (companionList && this.decorate("companionNames", companionList, allDecorators));
		const currentTimeData = isAction ? undefined : "It is currently " + unixTimestampToDate(Date.now());

		const system_prompt = new Prompt("")
			.append(companion.getBasePrompt())
			.append(personaData || situationData)
			.append(currentTimeData)
			.append(companionData)
			.append(knowledgeData)
			.append(moodData)
			.append(jobData)
			.append(inputData)
			.append(messageData)
			.append(answerData)
			.append(questionData)
			.append(quoteData)
			.append(chatData)
			.append(epilogueData)
			;



		// only add history if there is one and if we don't have answerData
		const chat: { role: string, content: string }[] = [];
		let cutoff = 0;
		if (history && (history.length > 0) && !answerData && !epilogueData && !jobData && !chatData) {

			const username = worldState.find(w => w.key == "USERNAME")?.value;

			history
				.filter(m => m.companion.configuration.kind != "shell")
				.forEach(line => chat.push(
					{
						role: (line.companion.id == "you") ?
							((!returnChat && username && typeof (username) == "string") ? username : 'user')
							:
							((line.companion.id == companion.id) ? "assistant" : !returnChat ? line.companion.configuration.name : "user"),
						content: this.sanitize(line.message)
					}));

			let budget = config.max_prompt_length - system_prompt.prompt.length - 255; // keep a little bit of buffer for tokens
			chat.reverse()
				.every((entry, index) => {
					budget -= entry.content.length + entry.role.length + 6; // colon, space, 2x newline, start and end token
					if (budget < 0) {
						cutoff = index;
						return false; // early exit
					}
					return true;
				})
		}

		const start = 0
		const end = cutoff !== 0 ? cutoff : history?.length
		const cleaned_chat = [{ role: config.system_role_allowed ? "system" : "user", content: this.sanitize(system_prompt.prompt) }, ...chat.slice(start, end).reverse()];

		// append the job if configured as such
		const job = context.job;
		if (config.job_in_chat && job) {
			cleaned_chat.push({ role: "user", content: this.sanitize(job) })
		}

		if (returnChat) {
			return cleaned_chat;
		}

		const name = "assistant"; //companion.configuration.kind == "shell" ? "assistant" : companion.id;

		// If a template is provided, use that
		// Else, check if the companion uses a different model/template
		// Else, use the default template
		let template = promptTemplate?.chat_template || companion.configuration.modelConfig?.extra?.template?.chat_template;

		return this.renderPrompt(name, cleaned_chat, template ? new Template(template) : undefined);
	}


}

