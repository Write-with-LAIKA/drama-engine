import { Chat, ChatMessage } from "../chat";
import { Context } from "../context";
import { Drama } from "../drama";
import { AutoCompanion, CompanionReply } from "./auto-companion";
import { CompanionConfig } from "./companion";
import { Deputy } from "./deputy";


export class InstructionDeputy extends Deputy {

	static readonly config: CompanionConfig = {
		name: "Barclay",
		class: InstructionDeputy,
		description: "This deputy sets a job for the companion to act out.",
		base_prompt: "",
		kind: "shell",
		modelConfig: {
			temperature: 0
		}
	}

	constructor(configuration: CompanionConfig = InstructionDeputy.config, drama: Drama) {
		super(configuration, drama);
		this.replyFunctions.push({ trigger: "*", replyFunction: this.runAction })
		return this;
	}

	protected runAction = async (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion): Promise<CompanionReply> => {
		
		const input = context.query();
		if (!input || input.length < 5) { 
			context.job = "Explain your purpose to the user and that the user has to select some text before you can do your job.";
			return [true, context];
		}
		
		context.job = this.configuration.job;
		// this.configuration.job && context.persona = "";
		// Can't remove the persona as then the situation would be used and we don't want that, do we Hal?
		return [true, context];
	}


}
