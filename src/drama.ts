import { ActionDescription, Companion, CompanionConfig, Operation } from "./companions/companion";
import { ChatRecord, HistoryRecord, KeyValueRecord, StateTypes, db, resetDatabase } from "./database/database";
import { Tag } from "./tags";
import { Job, JobStatus } from "./job";
import { Context, ContextDataTypes, ContextDecorator } from "./context";
import { v4 as uuidv4 } from "uuid";
import { Model } from "./model";
import { Prompter } from "./prompter";
import { PromptConfig } from "./prompt-config";
import { Chat, ChatMessage, ChatSpeakerSelection } from "./chat";
import { AutoCompanion } from "./companions/auto-companion";
import { evaluateCondition } from "./conditions";
import ky, { KyInstance, Options } from "ky";
import { ChatCompanion } from "./companions/chat-companion";

export class Drama {
	model: Model;
	instance: KyInstance;
	additionalOptions?: Options;
	prompter: Prompter;

	companions: AutoCompanion[] = [];
	worldState: KeyValueRecord[] = [];
	jobs: Job[] = [];
	chats: Chat[] = [];

	private constructor(
		companionConfigs: CompanionConfig[],
		worldState: KeyValueRecord[],
		kyInstance: KyInstance,
		additionalOptions?: Options,
		) {
		this.worldState = worldState;
		this.model = new Model();
		this.prompter = new Prompter(this.model.promptTemplate);
		this.instance = kyInstance;
		this.additionalOptions = additionalOptions;
		this.companions = companionConfigs.map(c => new c.class(c, this));

		console.log("DRAMA ENGINE // INITIATED");

		return this;
	}

	static async initialize(defaultSituation: string, companionConfigs: CompanionConfig[], kyInstance: KyInstance = ky, additionalOptions?: Options) {
		const worldState = await db.world.toArray();

		// Add the user if there is none
		if (!companionConfigs.find(c => c.kind == "user"))
			companionConfigs = [
				...companionConfigs,
				{
					name: "You",
					class: ChatCompanion,
					bio: "The user",
					description: "The user of this app. A person who seeks companionship.",
					base_prompt: "",
					avatar: "/img/avatar-user.jpg",
					kind: "user",
				},
			];

		const drama = new Drama(companionConfigs, worldState, kyInstance, additionalOptions);

		// load interactions counters
		drama.companions.forEach(companion => {

			const interactions = worldState.find(w => w.key == "COMPANION_INTERACTIONS_" + companion.id.toUpperCase());
			if (interactions && typeof interactions.value == "number")
				companion.interactions = interactions.value;

			const actions = worldState.find(w => w.key == "COMPANION_ACTIONS_" + companion.id.toUpperCase());
			if (actions && typeof actions.value == "number")
				companion.actions = actions.value;

			// every NPC companion gets a chat and a mood
			if (companion.configuration.kind == "npc") {
				if (companion.configuration.moods) {
					let rnd = Math.random();

					const mood = companion.configuration.moods
						.sort((l, r) => l.probability - r.probability)
						.find(m => {
							if (rnd - m.probability <= 0) {
								return true;
							} else {
								rnd -= m.probability;
								return false;
							}
						})

					if (mood) {
						companion.mood.label = mood.label;
						companion.mood.prompt = mood.prompt;
					}
				}

				drama.addCompanionChat(companion, defaultSituation);
			}
		})

		return drama;
	}

	reset = async (companions: Companion[] = this.companions) => {
		console.log("DRAMA ENGINE // RESET");

		this.jobs = [];
		await resetDatabase();
		await db.setCompanions(companions);
	}

	/* WORLD STATE MANAGEMENT */

	increaseWorldStateEntry = async (key: string, value: number) => {
		const ws = this.worldState.find(s => s.key == key);
		if (ws) {
			ws.value = (ws.value as number) + value;
			await db.world.where({ key: key }).modify({ value: ws.value });
		} else {
			this.worldState.push({ key: key, value: value });
			await db.world.add({ key: key, value: value });
		}
	}
	setWorldStateEntry = async (key: string, value: StateTypes) => {
		const ws = this.worldState.find(s => s.key == key);
		if (ws) {
			ws.value = value;
			await db.world.where({ key: key }).modify({ value: value });
		} else {
			this.worldState.push({ key: key, value: value });
			await db.world.add({ key: key, value: value });
		}
	}
	getWorldStateValue = (key: string): StateTypes | undefined => {
		return this.worldState.find(s => s.key == key)?.value;
	}

	logInteraction = (companion: Companion) => {
		const cmp = this.companions.find((c) => c.id == companion.id);
		cmp && cmp.interactions++;
	}
	logAction = (companion: Companion) => {
		const cmp = this.companions.find((c) => c.id == companion.id);
		cmp && cmp.interactions++;
	}

	syncInteractions = async () => {
		let allInteractions = 0;
		for (const companion of this.companions) {
			await this.setWorldStateEntry("COMPANION_INTERACTIONS_" + companion.id.toUpperCase(), companion.interactions);
			await this.setWorldStateEntry("COMPANION_ACTIONS_" + companion.id.toUpperCase(), companion.actions);
			allInteractions += companion.interactions;
		}

		await this.setWorldStateEntry("COMPANION_INTERACTIONS", allInteractions);
	}

	getActiveActions = () => {
		const q: { companion: AutoCompanion, action: ActionDescription }[] = [];

		this.companions
			.filter(companion => companion.configuration.kind == "npc" && companion.configuration.actions)
			.forEach((companion) => {
				if (!companion.configuration.actions) return;

				// copy all actions that are active. don't sort for now.
				q.push(
					...companion.configuration.actions
						.filter(action => action.label && (!action.condition || evaluateCondition(action.condition, this.worldState)))
						.map(a => { return { companion: companion, action: a } })
				)
			})

		return q;
	}

	/* JOBS */

	pushJob = async (context: Context) => {
		const id = uuidv4();
		const job: Job = {
			id: id,
			status: "new",
			context: context,
			remoteID: "",
			timeStamp: Date.now(),
		}

		console.log("new job: ")
		console.log(job)

		this.jobs.push(job);
	}

	setJobState = (id: string, state: JobStatus) => {
		const index = this.jobs.findIndex(j => j.id == id);
		this.jobs[index] = { ...this.jobs[index], status: state }
	}

	setJobRemoteID = (id: string, remoteID: string) => {
		const index = this.jobs.findIndex(j => j.id == id);
		this.jobs[index] = { ...this.jobs[index], remoteID: remoteID }
	}

	getJobsByState = (state: JobStatus) => {
		return this.jobs
			.filter((j) => j.status == state)
			.sort((l, r) => r.timeStamp - l.timeStamp)
	}

	removeJob = (id: string) => {
		this.jobs = this.jobs.filter(j => j.id != id);
	}

	/* PROMPT */

	getPrompt = (companion: Companion, history: ChatMessage[], context: Context, decorators: ContextDecorator[] = [], config: PromptConfig = this.model.promptConfig) => {
		return this.prompter.assemblePrompt(companion, this.worldState, context, history, decorators, config);
	}

	/* INFERENCES */

	runJob = async (job: Job) => {
		const response = await this.model.runJob(job, this.instance, this.additionalOptions);
		response && job.context.addUsage(response);

		console.info("runJob", job, "-->", response);

		await this.increaseWorldStateEntry("INPUT_TOKENS", job.context.input_tokens);
		await this.increaseWorldStateEntry("OUTPUT_TOKENS", job.context.output_tokens);
		// await this.increaseWorldStateEntry("RUNTIME", job.context.runtime);

		if (job.context.action && job.context.recipient)
			this.increaseWorldStateEntry("COMPANION_ACTIONS_" + job.context.recipient.id.toUpperCase(), 1);

		return response;
	}

	/* CHATS */

	restoreChats = (chatRecords?: ChatRecord[]) => {
		chatRecords?.forEach(async (chatRecord) => await db.writeSessionChats(chatRecord));
		this.chats.forEach(async (chat) => {
			let chatRecord: ChatRecord | undefined;

			if (chatRecords && chatRecords.length > 0) {
				chatRecord = chatRecords.find((elem) => { return elem.id === chat.id });
			} else {
				chatRecord = await db.chats.get(chat.id);
			}

			if (chatRecord) {
				chat.history = chatRecord.history.map((h: HistoryRecord) => {
					const companion = this.companions.find(c => {
						return c.configuration.name.toLowerCase() === h.companion.toLowerCase();
					})
					return {
						...h,
						companion: companion!,
					}
				});
			}
		})
	}

	getChat = (id: string) => this.chats.find(c => c.id == id);
	getCompanionChat = (companion: Companion) => this.chats.find(c => c.id == companion.id + "_chat");

	addCompanionChat = (companion: Companion, situation: string) => {
		return this.addChat(companion.id + "_chat", situation, [companion.id, "you"], 8, "round_robin");
	}
	addChat = (id: string, situation: string, companionIDs: string[], maxRounds: number = 8, speakerSelection: ChatSpeakerSelection = "random") => {
		const chatCompanions = this.companions.filter(c => companionIDs.includes(c.id) && (c.configuration.kind == "npc" || c.configuration.kind == "user"));

		const existingChat = this.getChat(id);

		// Reconfigure existing chat if there is one
		if (existingChat) {
			existingChat.companions = chatCompanions;
			existingChat.maxRounds = maxRounds;
			existingChat.speakerSelection = speakerSelection;
			console.log("Reconfiguring existing chat: " + existingChat.id);
			return existingChat;
		}

		const chat = new Chat(this, id, situation, chatCompanions, maxRounds, speakerSelection);
		this.chats.push(chat);
		console.log("New chat: " + chat.id);
		return chat;
	}

	removeChat = (id: string) => {
		this.chats = this.chats.filter(c => c.id != id);
		db.chats.delete(id);
	};

	runConversation = async (chat: Chat, rounds: number, context: Context, lastSpeaker?: AutoCompanion, except?: Companion[], callback?: (chat: Chat, message?: ChatMessage) => void): Promise<[Chat, AutoCompanion | undefined, AutoCompanion | undefined, Context | undefined]> => {

		if (rounds <= 0) return [chat, lastSpeaker, undefined, context];

		const chatLines = chat.history.length;

		const [newChat, newLastSpeaker, newActiveSpeaker, newContext] = await this.runChat(chat, rounds, context, lastSpeaker, except, callback);

		const roundsTaken = newChat.history.length - chatLines;

		// return control to user
		if (newActiveSpeaker && newActiveSpeaker.configuration.kind == "user")
			return [newChat, newLastSpeaker, newActiveSpeaker, newContext];

		// otherwise continue
		return await this.runConversation(newChat, rounds - roundsTaken, newContext || context, newLastSpeaker, except, callback);
	}

	runChat = async (chat: Chat, rounds: number, context: Context, lastSpeaker?: AutoCompanion, except?: Companion[], callback?: (chat: Chat, message?: ChatMessage) => void): Promise<[Chat, AutoCompanion | undefined, AutoCompanion | undefined, Context | undefined]> => {

		// We last asked a question
		if (chat.currentContext) {
			context.action = chat.currentContext.action;
			context.input = chat.lastMessage()?.message;
			context.question = undefined;
		}

		let activeSpeakers = await chat.selectSpeakers(context, lastSpeaker, except);

		// for (const activeSpeaker of activeSpeakers) {
		while (activeSpeakers.length && rounds >= 0) {

			// last speaker in the list gets set active
			const activeSpeaker = activeSpeakers.pop();

			if (activeSpeaker && activeSpeaker.configuration.kind != "user") {

				console.log("Setting active speaker", activeSpeaker);

				activeSpeaker.status = "active";
				rounds--;

				if (context.action)
					this.logAction(activeSpeaker);

				// skip inference if we just post a quote
				if (context.quote == undefined) {
					context = await activeSpeaker.generateReply(chat, context, lastSpeaker);
				}

				// If the context has a message, we print it and call a callback. Excerpt gets preference if present. Quote gets printed unless a shell is speaking.
				const excerpt = context.excerpt;
				const message = context.message;
				const quote = (activeSpeaker.configuration.kind != "shell") ? context.quote : undefined; // quotes by shells get wrapped

				// if there's either a comment or a quote, post it!
				const answer = excerpt || message || quote;
				if (answer) {
					// append the last message to the chat
					const appendedMessage = chat.appendMessage(activeSpeaker, answer, context);
					callback && callback(chat, appendedMessage);

					if (excerpt) context.excerpt = undefined; // excerpt gets removed otherwise it gets added twice
				}

				activeSpeaker.status = "free";
				lastSpeaker = activeSpeaker;

				// save the context if we're waiting for an answer
				if (context.question) chat.currentContext = context;
			} else {
				// active speaker is user -> return control
				await db.logChat(chat.id, chat.history);
				await this.syncInteractions();

				context = await this.runTriggers(context, callback);

				return [chat, lastSpeaker, activeSpeaker, context];
			}
		}

		await db.logChat(chat.id, chat.history);
		await this.syncInteractions();

		context = await this.runTriggers(context, callback);

		return [chat, lastSpeaker, undefined, context];
	}

	/* TRIGGERS */

	runTriggers = async (context: Context, callback?: (chat: Chat, message?: ChatMessage) => void): Promise<Context> => {

		for (const companion of this.companions) {

			if (!companion.configuration.triggers) continue;

			for (const trigger of companion.configuration.triggers) {
				if (evaluateCondition(trigger.condition, this.worldState)) {
					if (typeof trigger.action == "string") {

						// run the action

						const companionChat = this.getCompanionChat(companion);
						if (!companionChat) return context;

						// set event to false before executing action (so we don't run in circles)
						if (trigger.condition.tag == Tag.EVENT && trigger.condition.value && typeof trigger.condition.value == "string") {
							await this.setWorldStateEntry(trigger.condition.value, false);
						}

						context.recipient = companion;
						context.action = trigger.action;
						const result = await this.runChat(companionChat, 5, context, undefined, undefined, callback);

						return result[3] || context; // the result context (or the original if we got an undefined one back)

					} else {

						if (!trigger.effect) continue;

						// manipulate the world state
						if (trigger.effect.tag == Tag.EVENT && trigger.effect.value && typeof trigger.effect.value == "string") {
							// send an event
							await this.setWorldStateEntry(trigger.effect.value, true);

							console.log("Setting event " + trigger.effect.value);
							console.log(trigger.condition);

						} else if (trigger.effect.tag == Tag.ACTION && trigger.effect.value && typeof trigger.effect.value == "string") {

							// run the action
							const companionChat = this.getCompanionChat(companion);
							if (!companionChat) return context;
							context.recipient = companion;
							context.action = trigger.effect.value;
							const result = await this.runChat(companionChat, 5, context, undefined, undefined, callback);
							return result[3] || context; // the result context (or the original if we got an undefined one back)

						} else if (typeof trigger.effect.tag == "string" && trigger.effect.value) {

							// manipulate the world state
							switch (trigger.action) {
								case Operation.SET:
									await this.setWorldStateEntry(trigger.effect.tag, trigger.effect.value);
									break;
								case Operation.ADD:
									if (typeof trigger.effect.value == "number")
										await this.increaseWorldStateEntry(trigger.effect.tag, trigger.effect.value);
									else
										console.error("Operation '" + trigger.action + "' needs a value in the condition that is number!");
									break;
								default: console.error("Operation '" + trigger.action + "' is not implemented yet!");
							}
						} else {
							console.error("Triggers with operation '" + trigger.action + "' can only operate on a world state or send an event. Also it needs a value set in the condition.")
						}
					}
				}
			}
		}

		return context;
	}
}