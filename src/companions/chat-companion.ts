import { Drama } from "../drama";
import { AutoCompanion, CompanionReply } from "./auto-companion";
import { CompanionConfig } from "./companion";

/**
 * This class is for our AI chat companions
 * - Adds an automatic reply function that triggers and inference
 */

export class ChatCompanion extends AutoCompanion {

	constructor(configuration: CompanionConfig, drama: Drama) {
		super(configuration, drama);
		// this.replyFunctions.push({ trigger: "*", replyFunction: this.moodChange });
		this.replyFunctions.push({ trigger: "*", replyFunction: this.runInference });
		return this;
	}

	// moodChange = async (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion): Promise<CompanionReply> => {
	// 	if (this.mood.label != "neutral")
	// 		context.mood = this.mood.prompt;
	// 	return [false, context];
	// }

}