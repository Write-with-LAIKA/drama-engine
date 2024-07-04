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
	reset(): Promise<void>;
	
	setCompanions(companions: Companion[]): Promise<void>;

	world(): Promise<KeyValueRecord[]>;
	setWorldStateEntry(key: string, value: StateTypes): Promise<void>;
	
	prompts(): Promise<PromptRecord[]>;
	addPromptEntry(record: PromptRecord): Promise<void>;

	chats(): Promise<ChatRecord[]>;
	getChat(chatID: string): Promise<ChatRecord | undefined>;
	deleteChat(chatID: string): Promise<void>;
	logChat(id: string, history: ChatMessage[]): Promise<string>;
	addChatEntry(items: ChatRecord): Promise<string>;

}
