import { Template } from "@huggingface/jinja";
import { Companion } from "./companions/companion";
import { Context, ContextData, ContextDataTypes, ContextDecorator, defaultDecorators } from "./context";
import { PromptConfig, PromptTemplate, defaultPromptConfig, defaultPromptTemplates } from "./prompt-config";
import { KeyValueRecord } from "./database/database";
import { evaluateCondition } from "./conditions";
import { getRandomElement } from "./utils/array-utils";
import { ChatMessage } from "./chat";
import { unixTimestampToDate } from "./utils/time-utils";

class Prompt {
	prompt: string;
	constructor(basePrompt: string) { this.prompt = basePrompt; return this; };

	append = (data?: string, separator = "\n") => {
		data && (this.prompt = this.prompt + separator + data);
		return this;
	}
}

export class Prompter {
	private template: Template;
	private config: PromptTemplate;

	constructor(config: PromptTemplate) {
		this.template = new Template(config.chat_template);
		this.config = config;
	}

	private decorate = (type: ContextDataTypes, text?: string, decorators?: ContextDecorator[]) => {
		if (!text || !decorators) return undefined;
		const decorator = decorators.find(d => d.type == type);
		return decorator && decorator.replacement.replace("{{DATA}}", text);
	}

	private sanitize = (text: string) => {
		return text.replace(/<.*>/gi, "").trim();
	}

	renderPrompt = (speaker: string, chat: { role: string, content: string }[], template: Template = this.template) => {
		const result = template.render({
			messages: chat,
			bos_token: this.config.bos_token,
			eos_token: this.config.eos_token,
			speaker: speaker,
		});

		if (true) {
			console.log("Prompt: ", result);
		}

		return result;
	}

	assemblePrompt = (companion: Companion,
		worldState: KeyValueRecord[],
		context: Context,
		history?: ChatMessage[],
		decorators: ContextDecorator[] = [],	// eventual additional decorators
		config: PromptConfig = defaultPromptConfig,
		promptTemplate?: PromptTemplate) => {

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

		console.log("context", { ...context });
		console.log("input data", context.query()?.substring(0, 250));

		const moodData = companion.mood.prompt;

		// leave out shell companions because they are never a part of the chat history
		const otherCompanions = context.companions.filter(c => c.configuration.kind != "shell" && c.id != companion.id).map(c => c.configuration.description);
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
							((username && typeof (username) == "string") ? username : 'user')
							:
							((line.companion.id == companion.id) ? "assistant" : line.companion.configuration.name),
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

		const name = "assistant"; //companion.configuration.kind == "shell" ? "assistant" : companion.id;

		let template = undefined;
		if (promptTemplate) {
			template = new Template(promptTemplate.chat_template);
		}

		return this.renderPrompt(name, cleaned_chat, template);

	}


}

