import { expect, test } from '@jest/globals';
import { ChatMessage, Companion, Context, Drama } from '../src';
import { InMemoryDatabase } from '../src/db/in-memory-database';
import { testCompanionConfigs } from './config/companions';
import { partialModelConfig, streamingModelConfig, testModelConfig } from './config/models';

const userTestPrompt = "Hey Anders, if our startups target is a small niche market, how do we expand and still keep our core values ?";

test('API key is available', () => {
	expect(process.env.DE_BACKEND_API_KEY).toBeDefined();
});

test('Companion ID generator', () => {
	expect(Companion.toID("FranK")).toBe("frank");
	expect(Companion.toID("Frank Jimmy")).toBe("frank-jimmy");
	expect(Companion.toID("Frank 	Jimmy")).toBe("frank-jimmy");
	expect(Companion.toID("Frank{!}")).toBe("frank");
	expect(Companion.toID("Frank🤘")).toBe("frank");
	expect(Companion.toID("Frank123")).toBe("frank123");
	expect(Companion.toID("Frank!123()")).toBe("frank123");
	expect(Companion.toID("F2D2")).toBe("f2d2");
	expect(Companion.toID("Frank Jimmy Isildur")).toBe("frank-jimmy-isildur");
});

test('Initialised drama engine correctly', async () => {
	const drama = await Drama.initialize("water-cooler", testCompanionConfigs);
	expect({
		value: drama,
		description: 'Drama engine initialised correctly',
		matcher: 'toBeDefined',
	});

	const chats = drama.chats[0];
	const chatID = 'water-cooler';
	const situationID = 'water-cooler';
	const rounds = 5;
	const context = new Context(undefined, drama.companions, chatID, situationID);

	await drama.runChat(chats, rounds, context);

	const you = drama.companions.find(c => c.configuration.name.toLowerCase() === "you");
	expect(you && chats.appendMessage(you, userTestPrompt)).toBeDefined();

	await drama.runChat(chats, rounds, context);

	chats.history.forEach((chatMsg: ChatMessage) => {
		console.info(`${chatMsg.companion.configuration.name}: ${chatMsg.message}`);
	});
}, 15000);

test('Tested model per companion correctly', async () => {
	const drama = await Drama.initialize("co-working", [testCompanionConfigs[0]], testModelConfig);

	const chats = drama.chats[0];
	const chatID = drama.companions[0].configuration.name.toLowerCase() + '_chat';
	const situationID = 'co-working';
	const context = new Context(undefined, drama.companions, chatID, situationID);
	const rounds = 5;

	await drama.runChat(chats, rounds, context);

	const you = drama.companions.find(c => c.configuration.name.toLowerCase() === "you");
	expect(you && chats.appendMessage(you, userTestPrompt)).toBeDefined();

	await drama.runChat(chats, rounds, context);

	chats.history.forEach((chatMsg: ChatMessage) => {
		console.info(`${chatMsg.companion.configuration.name}: ${chatMsg.message}`);
	});
}, 15000);

test('Tested chat completions endpoint correctly', async () => {
	process.env.DE_ENDPOINT_URL = 'v1/chat/completions'

	const drama = await Drama.initialize("co-working", [testCompanionConfigs[0]], testModelConfig);
	const chats = drama.chats[0];
	const chatID = drama.companions[0].configuration.name.toLowerCase() + '_chat';
	const situationID = 'co-working';
	const context = new Context(undefined, drama.companions, chatID, situationID);
	const rounds = 5;

	await drama.runChat(chats, rounds, context);

	const you = drama.companions.find(c => c.configuration.name.toLowerCase() === "you");
	expect(you && chats.appendMessage(you, userTestPrompt)).toBeDefined();

	await drama.runChat(chats, rounds, context);

	chats.history.forEach((chatMsg: ChatMessage) => {
		console.info(`${chatMsg.companion.configuration.name}: ${chatMsg.message}`);
	});
}, 15000);


test('Tested streaming correctly', async () => {
	const drama = await Drama.initialize("co-working", [testCompanionConfigs[0]], streamingModelConfig);
	const chats = drama.chats[0];
	const chatID = drama.companions[0].configuration.name.toLowerCase() + '_chat';
	const situationID = 'co-working';
	const context = new Context(undefined, drama.companions, chatID, situationID);
	const rounds = 5;

	await drama.runChat(chats, rounds, context);

	const you = drama.companions.find(c => c.configuration.name.toLowerCase() === "you");
	expect(you && chats.appendMessage(you, userTestPrompt)).toBeDefined();

	await drama.runChat(chats, rounds, context);

	chats.history.forEach((chatMsg: ChatMessage) => {
		console.info(`${chatMsg.companion.configuration.name}: ${chatMsg.message}`);
	});
}, 15000);

test('Tested partial model configuration', async () => {
	const drama = await Drama.initializeEngine("co-working", [testCompanionConfigs[0]], undefined, undefined, {
		defaultModel: partialModelConfig
	});

	const chats = drama.chats[0];
	const chatID = drama.companions[0].configuration.name.toLowerCase() + '_chat';
	const situationID = 'co-working';
	const context = new Context(undefined, drama.companions, chatID, situationID);
	const rounds = 1;

	await drama.runChat(chats, rounds, context);

	const you = drama.companions.find(c => c.configuration.name.toLowerCase() === "you");
	expect(you && chats.appendMessage(you, userTestPrompt)).toBeDefined();

	await drama.runChat(chats, rounds, context);

	chats.history.forEach((chatMsg: ChatMessage) => {
		console.info(`${chatMsg.companion.configuration.name}: ${chatMsg.message}`);
	});
}, 15000);
