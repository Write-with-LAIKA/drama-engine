import { Chat, ChatMessage } from "../chat";
import { Context } from "../context";
import { Drama } from "../drama";
import { getRandomElement } from "../utils/array-utils";
import { AutoCompanion, CompanionReply } from "./auto-companion";
import { Companion, CompanionConfig } from "./companion";
import { Deputy } from "./deputy";


export class ModeratorDeputy extends Deputy {

	static config: CompanionConfig = {
		name: "JeanLuc",
		class: ModeratorDeputy,
		description: "This is an internal bot for instruction-based inferences.",
		base_prompt: "",
		kind: "shell",
		temperature: 0,
	}

	constructor(configuration: CompanionConfig = ModeratorDeputy.config, drama: Drama) {
		super(configuration, drama);
		return this;
	}

	protected runAction = async (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion): Promise<CompanionReply> => {
		// this bot is meant to be run manually for now
		return [false, undefined];
	}

	/**
	 * Prologue before pick speaker prompt.
	 * @date 12/01/2024 - 12:51:23
	 */
	selectSpeakerPrologue = (chat: Chat, speakers: Companion[], username: string) => {
		const promptPrefix = `
You are a moderator in an online chatroom. You are provided with a list of online users with their bios under ## ROLES ##. In addition, you have access to their conversation history under ## CONVERSATION ## where you can find the previous exchanges between different users.

Your task is to read the history in ## CONVERSATION ## and then select which of the ## ROLES ## should speak next. You MUST only return a single name as your response.
`

		const promptRoles = `
## ROLES ##

${speakers.filter(c => c.configuration.kind == "npc").map(c => c.configuration.name + ": " + c.configuration.description).join("\n")}
${username}: A guest user in the chatroom.

## END OF ROLES ##

## CONVERSATION ##
`
		return promptPrefix + promptRoles;
		// return "You are in a role-playing game. The following roles are available:\n"
		// 	+ chat.companions.filter(c => c.configuration.kind == "npc").map(c => c.id + ": " + c.configuration.description).join("\n")
		// 	+ "\nRead the following conversation.\nThen select the next role from "
		// 	+ speakers.map(c => c.id).join(", ")
		// 	+ " to play. Only return the role."
	}

	/**
	 * Use the speakerSelection to pick the next speaker(s)
	 * @date 12/01/2024 - 12:51:23
	 *
	 * @async
	 */
	selectSpeakers = async (chat: Chat, context: Context, lastSpeaker?: AutoCompanion, except?: Companion[], messages?: ChatMessage[]) => {

		const companions = chat.companions;
		if (companions.length == 1) return [companions[0]];

		console.log("Speaker selection");

		const nextSpeaker = context.recipient;
		if (nextSpeaker) {
			const deputy = context.findDelegate(nextSpeaker.configuration, chat.drama.companions);

			// if there's a specified next speaker and a deputy, return chain
			if (deputy) return [nextSpeaker, deputy];
		}

		// if there's a nextSpeaker set just return it
		if (nextSpeaker) return [nextSpeaker];

		// ry to set last speaker if undefined
		if (lastSpeaker == undefined && chat.history.length > 0) {
			lastSpeaker = chat.history.sort((l, r) => l.timeStamp - r.timeStamp)[chat.history.length - 1].companion;
		}

		// filter user and last speaker from message list
		const allowedSpeakers = (except == undefined ? companions : companions.filter(c => except.find(e => e.id == c.id) == undefined)).filter(c => c.configuration.kind != "shell");
		const speakers = (chat.allowRepeatSpeaker || lastSpeaker == undefined) ? allowedSpeakers : allowedSpeakers.filter(c => (lastSpeaker != undefined) && (c.id != lastSpeaker.id));
		const you = chat.companions.find(c => c.configuration.kind == "user");

		console.log("lastSpeaker: ", lastSpeaker);
		console.log("allowedSpeakers: ", speakers);

		if (speakers.length == 1)
			return [speakers[0]];

		// Check if any person was mentioned. This overrides everything.
		if (chat.history.length > 0) {
			const mentionedSpeakers = chat.mentionedCompanions(chat.history[chat.history.length - 1].message).filter(m => speakers.includes(m));
			if (mentionedSpeakers.length > 0) {
				console.log("mentionedSpeakers: ", mentionedSpeakers);
				// insert the person who mentioned someone after all the mentioned
				return (lastSpeaker && !mentionedSpeakers.includes(lastSpeaker)) ? [lastSpeaker, ...mentionedSpeakers] : mentionedSpeakers;
			}
		}

		const selectedSpeaker =
			(chat.speakerSelection == "round_robin" && lastSpeaker) ? chat.nextCompanion(lastSpeaker, speakers.filter(s => s.configuration.kind == "npc")) as AutoCompanion :
				chat.speakerSelection == "random" ? getRandomElement(speakers) as AutoCompanion :
					undefined;

		console.log("speakerSelection: " + chat.speakerSelection)
		selectedSpeaker && console.log("Next speaker: " + selectedSpeaker?.id)

		if (selectedSpeaker) return [selectedSpeaker];

		// we need a chat history from here
		if (!messages) return [getRandomElement(speakers)] as [AutoCompanion];

		const username = chat.drama.worldState.find(w => w.key == "USERNAME")?.value as string || "user";

		const chatHistory = messages
			.filter(m => m.companion.configuration.kind != "shell")
			.slice(-8)
			.map(m => (m.companion.id == "you") ? username + ": " + m.message.trim() : m.companion.configuration.name + ": " + m.message.trim())
			.join("\n");

		const newContext: Context =
			new Context(this, [], "", chat.situation, [
				{ type: "persona", data: this.selectSpeakerPrologue(chat, speakers, username) },
				{ type: "chat", data: chatHistory },
				{ type: "action", data: "SELECT_SPEAKER" },
				{ type: "epilogue", data: "\n## END OF CONVERSATION ##" }
			]);

		// use our own prompter. make the context short because we only want to send the last part of the dialog
		const prompt = chat.drama.prompter.assemblePrompt(this,
			chat.drama.worldState, newContext);

		const job = this.newDeputyJob(prompt, newContext);
		// if (job.modelConfig) {
		// 	job.modelConfig.max_tokens = 25;
		// 	job.modelConfig.temperature = 0.2;
		// }

		try {
			const jobResponse = await chat.drama.runJob(job);

			if (jobResponse && jobResponse.response) {

				const mentionedCompanions = chat.mentionedCompanions(jobResponse.response);

				(mentionedCompanions.length > 0) ?
					console.log("Auto speakers: " + mentionedCompanions.map(c => c.configuration.name).join(", "))
					:
					console.log("Auto speakers response: " + jobResponse.response);

				const allowedMentioned = mentionedCompanions.filter(c => speakers.includes(c));

				if (allowedMentioned.length >= 1) return allowedMentioned.reverse();
			}

		} catch (e) {
			console.error(e);
		}

		// disabling repeat speakers because why would I want that?
		// // fallback: if there was a previous npc speaker pick them
		// const lastNPC = chat.history.findLast(e => e.companion.configuration.kind == 'npc')?.companion;
		// if (lastNPC) return [lastNPC];

		// otherwise pick a random respondent
		return [getRandomElement(speakers)] as [AutoCompanion];
	}



}