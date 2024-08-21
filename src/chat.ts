import { AutoCompanion } from "./companions/auto-companion";
import { Companion } from "./companions/companion";
import { ModeratorDeputy } from "./companions/moderator-deputy";
import { Context } from "./context";
import { Drama } from "./drama";
import { logger } from "./utils/logging-utils";

/**
 * Determine how the next speaker is chosen.
 * @export
 * @typedef {ChatSpeakerSelection}
 */
export type ChatSpeakerSelection = "auto" | "random" | "round_robin";
/**
 * One entry in a chat history. Often called message
 * @export
 * @typedef {ChatMessage}
 */
export type ChatMessage = { companion: AutoCompanion, message: string, timeStamp: number, context?: Context };

/**
 * The chat class holds one conversation. Chat participants are companions from drama. One chat is one conversation.
 * @export
 * @class Chat
 * @typedef {Chat}
 */
export class Chat {
	/**
	 * A unique id
	 * @type {string}
	 */
	readonly id: string;
	/**
	 * For distinguishing behaviour according to the situation (see CompanionConfig). E.g. "writersroom"
	 * @type {string}
	 */
	readonly situation: string;
	/**
	 * References to all companions in this chat.
	 * @type {AutoCompanion[]}
	 */
	companions: AutoCompanion[];
	/**
	 * The chat should end after this many rounds. Not implemented.
	 * @type {number}
	 */
	maxRounds: number;
	/**
	 * Determines how the next speaker is chosen.
	 * @type {ChatSpeakerSelection}
	 */
	speakerSelection: ChatSpeakerSelection;
	/**
	 * The message history of this chat.
	 * @type {ChatMessage[]}
	 */
	history: ChatMessage[];
	/**
	 * Determines whether a speaker can be selected twice in a row.
	 * @type {boolean}
	 */
	allowRepeatSpeaker: boolean = false;
	/**
	 * The drama this chat is a part of.
	 * @type {Drama}
	 */
	readonly drama: Drama;
	/**
	 * The chat's moderator.
	 * @type {ModeratorDeputy}
	 */
	moderator: ModeratorDeputy;
	/**
	 * The active context if state has to be preserved
	 * @type {(Context | undefined)}
	 */
	currentContext: Context | undefined;

	/**
	 * Creates an instance of Chat.
	 * @date 12/01/2024 - 12:51:23
	 *
	 * @constructor
	 * @param {Drama} drama
	 * @param {string} id
	 * @param {string} [situation="fireplace"]
	 * @param {AutoCompanion[]} companions
	 * @param {number} [maxRounds=8]
	 * @param {ChatSpeakerSelection} [speakerSelection="random"]
	 */
	constructor(drama: Drama, id: string, situation = "fireplace", companions: AutoCompanion[], maxRounds: number = 8, speakerSelection: ChatSpeakerSelection = "random" ) {
		this.id = id;
		this.situation = situation;
		this.drama = drama;
		this.companions = companions;
		this.maxRounds = maxRounds;
		this.speakerSelection = speakerSelection;
		this.history = [];
		this.moderator = new ModeratorDeputy(ModeratorDeputy.config, drama);

		this.createDeputies();

		return this;
	}

	/**
	 * Create all deputies that the companions reference in actions
	 * @date 17/01/2024 - 10:25:19
	 */
	protected createDeputies = () => {
		this.companions
			.filter(c => c.configuration.kind == "npc")
			.forEach(c => c.configuration.actions?.forEach(a => {
				const deputy = this.drama.companions.find(c => c.id == a.deputy);

				if (!deputy) {
					logger.error("Error: Can't find deputy: " + a.deputy);
					return;
				}

				if (!this.companions.includes(deputy)) {
					// logger.debug("Auto-adding deputy: " + a.deputy);
					this.companions.push(deputy);
				}
			}))

	}

	/**
	 * Delete all messages in this chat.
	 * @date 12/01/2024 - 12:51:23
	 */
	clearMessages = () => { this.history = [] }
	/**
	 * Add a message.
	 * @date 12/01/2024 - 12:51:23
	 */
	appendMessage = (companion: AutoCompanion, message: string, context?: Context) => {
		logger.debug(companion.id + ": " + message);
		const appendedMessage = { companion: companion, message: message, timeStamp: Date.now(), context: context ? { ...context } : undefined };
		this.history.push(appendedMessage);
		companion.interactions++;
		return appendedMessage;
	}
	/**
	 * Add a message.
	 * @date 12/01/2024 - 12:51:23
	 */
	moderatorMessage = (message: string, context?: Context) => {
		const appendedMessage = { companion: this.moderator, message: message, timeStamp: Date.now(), context: context ? { ...context } : undefined };
		this.history.push(appendedMessage);
		return appendedMessage;
	}
	/**
	 * Get the last message (or undefined if there is none)
	 * @date 12/01/2024 - 12:51:23
	 */
	lastMessage = () => {
		return this.history.length > 0 ? this.history[this.history.length - 1] : undefined;
	}

	/**
	 * Selected the next companion in a list.
	 * @date 12/01/2024 - 12:51:23
	 */
	nextCompanion = (companion: AutoCompanion, companions: AutoCompanion[]) => {
		const index = this.companions.findIndex((c) => c.id == companion.id);

		if (companions == this.companions) {
			return companions[(index + 1) % companions.length];
		}

		const offset = index + 1;
		for (let i = 0; i < companions.length; ++i) {
			if (companions.includes((this.companions[(offset + i) % this.companions.length])))
				return this.companions[(offset + i) % this.companions.length];
		}

		return companion;
	}
	/**
	 * Return a list of all mentioned companions.
	 * @date 12/01/2024 - 12:51:23
	 */
	mentionedCompanions = (text: string) => {
		return this.companions.filter(c => c.configuration.kind == "npc" && (text.includes(c.id) || text.includes(c.configuration.name)));
	}
	/**
	 * Return the companion object representing the user.
	 * @date 12/01/2024 - 12:51:23
	 * @returns {AutoCompanion}
	 */
	userCompanion = () => this.companions.find(c => c.configuration.kind == "user");

	/**
	 * Use the value in speakerSelection to pick the next speaker(s). Executed in the moderator deputy.
	 * "auto": Use an inference to pick the right next speaker(s)
	 * "random": Pick a random next speaker.
	 * "round_robin"; Pick the next speaker in the list.
	 * Falls back to "random" if the specified selection does not yield a valid result.
	 *
	 * @date 17/01/2024 - 13:39:19
	 *
	 * @async
	 * @param {AutoCompanion?} lastSpeaker The last speaker (who will not speak again unless allowRepeatSpeaker is true).
	 * @param {Companion[]?} except Prevent the system from picking from this list.
	 * @returns {AutoCompanion[]}
	 */
	selectSpeakers = async (context: Context, lastSpeaker?: AutoCompanion, except?: Companion[]) => {
		return await this.moderator.selectSpeakers(this, context, lastSpeaker, except, this.history);
	}
}