import { ChatMessage } from "../chat";
import { Companion } from "../companions/companion";

export type StateTypes = number | string | boolean;
export type KeyValueRecord = { key: string, value: StateTypes }
export type PromptRecord = { timeStamp: number, prompt: string, result: string, config: string }
export type HistoryRecord = { companion: string, message: string, timeStamp: number }
export type ChatRecord = { id: string, history: HistoryRecord[], default?: boolean };

export interface Database { 
	reset(): Promise<void>;
	
	setCompanions(companions: Companion[]): Promise<void>;

	world(): Promise<KeyValueRecord[]>;
	setWorldStateEntry(key: string, value: StateTypes): Promise<void>;
	
	prompts(): Promise<PromptRecord[]>;
	addPromptEntry(record: PromptRecord): Promise<void>;

	chats(): Promise<ChatRecord[]>;
	getChat(chatID: string): Promise<ChatRecord>;
	deleteChat(chatID: string): Promise<void>;
	logChat(id: string, history: ChatMessage[]): Promise<void>;
	writeSessionChats(items: ChatRecord): Promise<void>;

}

// class DramaEngineDatabase extends Dexie {

// 	world!: Dexie.Table<KeyValueRecord, string>;
// 	prompts!: Dexie.Table<PromptRecord, number>;
// 	chats!: Dexie.Table<ChatRecord, string>;

// 	constructor(name = "drama-db") {
// 		super(name);
// 		this.version(74).stores({
// 			world: 'key',
// 			prompts: 'timeStamp',
// 			chats: 'id',
// 		});
// 	}

// 	setCompanions = async (companions: Companion[]) => {
// 		return db.transaction('rw', db.world, async () => {
// 			await this.world.bulkPut(
// 				companions.map(companion => {
// 					return { key: "COMPANION_INTERACTIONS_" + companion.id.toUpperCase(), value: 0 }
// 				}));
// 			await this.world.bulkPut(
// 				companions.map(companion => {
// 					return { key: "COMPANION_ACTIONS_" + companion.id.toUpperCase(), value: 0 }
// 				}));
// 		});
// 	}

// 	// write session as-is
// 	writeSessionChats = async (items: ChatRecord) =>
// 		this.chats.put({ id: items.id, history: items.history });

// 	// copy the whole chat history
// 	logChat = async (id: string, history: ChatMessage[]) =>
// 		this.chats.put({
// 			id: id, history:
// 				history
// 					.filter(h => h.companion.configuration.kind == "npc" || h.companion.configuration.kind == "user")
// 					.map(h => { return { companion: h.companion.configuration.name, message: h.message, timeStamp: h.timeStamp } })
// 		});

// 	recreateDatabase = async () => {
// 		return db.delete().then(() => db.open());
// 	}

// }

// export const db = new DramaEngineDatabase();
// db.on('populate', populate);

// export function resetDatabase() {
// 	return db.transaction('rw', db.world, db.chats, db.prompts, async () => {
// 		await Promise.all(db.tables.map(table => table.clear()));
// 		await populate();
// 	});
// }

