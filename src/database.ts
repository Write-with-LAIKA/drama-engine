import { ChatMessage } from "./chat";
import { Companion } from "./companions/companion";

export type StateTypes = number | string | boolean;
export type KeyValueRecord = { key: string, value: StateTypes }
export type PromptRecord = { timeStamp: number, prompt: string, result: string, config: string }
export type HistoryRecord = { companion: string, message: string, timeStamp: number }
export type ChatRecord = { id: string, history: HistoryRecord[], default?: boolean };

/**
 * In order to support tracking of user interactions and updates to the world state, we added an interface that
 * can be hooked up to a database. In our own application we use Dexie to store data in the browser but any
 * storage mechanism can do. All functions are promises to allow for asynchronous loading and saving.
 *
 * @export
 * @interface Database
 */
export interface Database {
	/**
	 * Resets the database by clearing all data and repopulating with default data.
	 */
	reset(): Promise<void>;

	/**
	 * Initialises the various stats for each companion, e.g., interaction counts, in the database.
	 * @param {Companion[]} companions
	 */
	initCompanionStats(companions: Companion[]): Promise<void>;

	/**
	 * Returns the current world state (consisting of stats, config, etc.) in the form of a key-value pair array.
	 */
	world(): Promise<KeyValueRecord[]>;

	/**
	 * Inserts or updates the current world state at given `key` with `value`.
	 * @param {string} key
	 * @param {StateTypes} value
	 */
	setWorldStateEntry(key: string, value: StateTypes): Promise<void>;

	/**
	 * Returns the saved prompt records (full prompts sent to LLM, response received, etc.) in the form of an array.
	 */
	prompts(): Promise<PromptRecord[]>;

	/**
	 * Adds an entry to the prompts store.
	 * @param {PromptRecord} record
	 */
	addPromptEntry(record: PromptRecord): Promise<void>;

	/**
	 * Returns all the chats in the database.
	 */
	chats(): Promise<ChatRecord[]>;

	/**
	 * Returns the chat for a given `chatID`.
	 * @param {string} chatID
	 */
	getChat(chatID: string): Promise<ChatRecord | undefined>;

	/**
	 * Deletes the chat for a given `chatID`.
	 * @param {string} chatID
	 */
	deleteChat(chatID: string): Promise<void>;

	/**
	 * Adds a new entry to the chat store updating the history of the given chat `id`.
	 * The objects might need to be serialised before persisting.
	 * @param {string} id
	 * @param {ChatMessage[]} history
	 */
	writeChat(id: string, history: ChatMessage[]): Promise<string>;

	/**
	 * Overwrites chat history with provided data. Useful when restoring sessions from scratch.
	 * @param {ChatRecord} items
	 */
	overwriteChats(items: ChatRecord): Promise<string>;
}
