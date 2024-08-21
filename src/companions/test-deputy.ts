import { Chat } from "../chat";
import { Context } from "../context";
import { Drama } from "../drama";
import { logger } from "../utils/logging-utils";
import { AutoCompanion, CompanionReply } from "./auto-companion";
import { CompanionConfig } from "./companion";
import { Deputy } from "./deputy";


export class TestDeputy extends Deputy {

	static readonly config: CompanionConfig = {
		name: "Kirk",
		class: TestDeputy,
		description: "Just for testing",
		base_prompt: "",
		kind: "shell",
		temperature: 0,
	}

	constructor(configuration: CompanionConfig = TestDeputy.config, drama: Drama) {
		super(configuration, drama);
		this.replyFunctions.push({ trigger: "*", replyFunction: this.runAction })
		return this;
	}

	protected runAction = async (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion): Promise<CompanionReply> => {

		// const firstAction = this.configuration.actions?.at(0);
		// const delegate = firstAction && chat.companions.find(c => c.id == firstAction.deputy);

		// if there's a delegate and no answer yet just forward
		// const delegate = context.findDelegate(this.configuration, chat.companions);
		// if (delegate && !context.hasAnswer()) return [true, context];

		// do nothing
		logger.debug("TEST DELEGATE CONTEXT", context);

		// otherwise we're done
		return [true, context];
	}


}