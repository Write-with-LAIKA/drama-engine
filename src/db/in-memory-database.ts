/* In-memory database to act as a default database for tracking interactions with the Drama Engine. Replace with 
 * a localStorage-based system if you want to persist sessions in the browser.
 */

import { ChatMessage, ChatRecord, Companion, Database, KeyValueRecord, PromptRecord, StateTypes } from "..";

export class InMemoryDatabase implements Database {
    private companions: Companion[] = [];
    private worldState: Record<string, StateTypes> = {};
    private promptEntries: PromptRecord[] = [];
    private chatEntries: Record<string, ChatRecord> = {};

    async reset(): Promise<void> {
        this.companions = [];
        this.worldState = {};
        this.promptEntries = [];
        this.chatEntries = {};
    }

    async initCompanionStats(companions: Companion[]): Promise<void> {
        this.companions = companions;
    }

    async world(): Promise<KeyValueRecord[]> {
        return Object.entries(this.worldState).map(([key, value]) => ({ key, value }));
    }

    async setWorldStateEntry(key: string, value: StateTypes): Promise<void> {
        this.worldState[key] = value;
    }

    async prompts(): Promise<PromptRecord[]> {
        return this.promptEntries;
    }

    async addPromptEntry(record: PromptRecord): Promise<void> {
        this.promptEntries.push(record);
    }

    async chats(): Promise<ChatRecord[]> {
        return Object.values(this.chatEntries);
    }

    async getChat(chatID: string): Promise<ChatRecord | undefined> {
        return this.chatEntries[chatID];
    }

    async deleteChat(chatID: string): Promise<void> {
        delete this.chatEntries[chatID];
    }

    async writeChat(id: string, history: ChatMessage[]): Promise<string> {
        this.chatEntries[id] = {
            id: id,
            history: history.filter(h => h.companion.configuration.kind == "npc" || h.companion.configuration.kind == "user").map(h => { return { companion: h.companion.configuration.name, message: h.message, timeStamp: h.timeStamp } })
        };
        return id;
    }

    async overwriteChats(items: ChatRecord): Promise<string> {
        this.chatEntries[items.id] = items;
        return items.id;
    }
}
