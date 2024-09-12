import { expect, test } from '@jest/globals';
import { ChatMessage, Companion, Context, Drama } from '../src';
import { testCompanionConfigs } from './config/companions';
import { hermes3Config, partialModelConfig, streamingModelConfig, testModelConfig } from './config/models';

const userTestPrompt = "Hey Anders, if our startups target is a small niche market, how do we expand and still keep our core values ?";

test('API key is available', () => {
	expect(process.env.DE_BACKEND_API_KEY ).toBeDefined();
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

test('Basic initialisation', async () => {
	const drama = await Drama.initialize("water-cooler", testCompanionConfigs, undefined, { defaultModel: testModelConfig }); 
	expect({
		value: drama,
		description: 'Drama engine initialised correctly',
		matcher: 'toBeDefined',
	});

}, 15000);

test('Single companion', async () => {
	const drama = await Drama.initialize("co-working", [testCompanionConfigs[0]], undefined, { defaultModel: testModelConfig }); 

	console.info("----------");
	console.info("Single companion");

	const chats = drama.chats[0];
	const chatID = drama.companions[0].configuration.name.toLowerCase() + '_chat';
	const situationID = 'co-working';
	const context = new Context(undefined, drama.companions, chatID, situationID);
	const rounds = 3;

	const you = drama.companions.find(c => c.configuration.name.toLowerCase() === "you");
	expect(you && chats.appendMessage(you, userTestPrompt)).toBeDefined();

	await drama.runChat(chats, rounds, context);

	chats.history.forEach((chatMsg: ChatMessage) => {
		console.info(`${chatMsg.companion.configuration.name}: ${chatMsg.message}`);
	});
}, 15000);

test('Chat completion', async () => {
	process.env.DE_ENDPOINT_URL = 'v1/chat/completions'

	console.info("----------");
	console.info("Chat completion");

	const drama = await Drama.initialize("co-working", [testCompanionConfigs[0]], undefined, { defaultModel: testModelConfig });
	const chats = drama.chats[0];
	const chatID = drama.companions[0].configuration.name.toLowerCase() + '_chat';
	const situationID = 'co-working';
	const context = new Context(undefined, drama.companions, chatID, situationID);
	const rounds = 3;

	const you = drama.companions.find(c => c.configuration.name.toLowerCase() === "you");
	expect(you && chats.appendMessage(you, userTestPrompt)).toBeDefined();

	await drama.runChat(chats, rounds, context);

	chats.history.forEach((chatMsg: ChatMessage) => {
		console.info(`${chatMsg.companion.configuration.name}: ${chatMsg.message}`);
	});
}, 15000);

test('Question answering', async () => {
	process.env.DE_ENDPOINT_URL = 'v1/chat/completions'

	console.info("----------");
	console.info("Question answering");

	const drama = await Drama.initialize("co-working", testCompanionConfigs, undefined, { defaultModel: testModelConfig }); 
	const chatID = 'question_answering_chat';
	const situationID = 'co-working';
	const chat = drama.addChat(chatID, situationID, [...drama.companions.filter(c => c.configuration.kind == "npc").map(c => c.id)], 3);
	const context = new Context(undefined, drama.companions, chatID, situationID);
	const rounds = 5;

	const you = drama.companions.find(c => c.configuration.name.toLowerCase() === "you");
	expect(you).toBeDefined();

	you && chat.appendMessage(you, "Hello");
	you && chat.appendMessage(drama.companions[1], "Can I ask you for your name?");
	you && chat.appendMessage(you, "I'm Martin");

	await drama.runChat(chat, rounds, context);

	chat.history.forEach((chatMsg: ChatMessage) => {
		console.info(`${chatMsg.companion.configuration.name}: ${chatMsg.message}`);
	});

	// should go back to the bot and then return to the user
	expect(chat.history.length).toBe(4);
	expect(chat.history[chat.history.length - 1].companion.configuration.name).toBe("Simon");

}, 15000);

test('Larger model with chat completion', async () => {
	process.env.DE_ENDPOINT_URL = 'v1/chat/completions'

	console.info("----------");
	console.info("Larger model with chat completion");

	const drama = await Drama.initialize("co-working", [testCompanionConfigs[0]], undefined, { defaultModel: hermes3Config });
	const chats = drama.chats[0];
	const chatID = drama.companions[0].configuration.name.toLowerCase() + '_chat';
	const situationID = 'co-working';
	const context = new Context(undefined, drama.companions, chatID, situationID);
	const rounds = 5;

	const you = drama.companions.find(c => c.configuration.name.toLowerCase() === "you");
	expect(you && chats.appendMessage(you, userTestPrompt)).toBeDefined();

	await drama.runChat(chats, rounds, context);

	chats.history.forEach((chatMsg: ChatMessage) => {
		console.info(`${chatMsg.companion.configuration.name}: ${chatMsg.message}`);
	});
}, 15000);


test('Streaming mode (not supported by all platforms)', async () => {

	console.info("----------");
	console.info("Streaming mode");

	const drama = await Drama.initialize("co-working", [testCompanionConfigs[0]], undefined, { defaultModel: streamingModelConfig });
	const chats = drama.chats[0];
	const chatID = drama.companions[0].configuration.name.toLowerCase() + '_chat';
	const situationID = 'co-working';
	const context = new Context(undefined, drama.companions, chatID, situationID);
	const rounds = 1;

	const you = drama.companions.find(c => c.configuration.name.toLowerCase() === "you");
	expect(you && chats.appendMessage(you, userTestPrompt)).toBeDefined();

	await drama.runChat(chats, rounds, context);

	chats.history.forEach((chatMsg: ChatMessage) => {
		console.info(`${chatMsg.companion.configuration.name}: ${chatMsg.message}`);
	});
}, 15000);

test('Partial model configuration', async () => {

	console.info("----------");
	console.info("Partial model configuration");

	const drama = await Drama.initialize("co-working", [testCompanionConfigs[0]], undefined, {
		defaultModel: partialModelConfig
	});

	const chats = drama.chats[0];
	const chatID = drama.companions[0].configuration.name.toLowerCase() + '_chat';
	const situationID = 'co-working';
	const context = new Context(undefined, drama.companions, chatID, situationID);
	const rounds = 1;

	const you = drama.companions.find(c => c.configuration.name.toLowerCase() === "you");
	expect(you && chats.appendMessage(you, userTestPrompt)).toBeDefined();

	await drama.runChat(chats, rounds, context);

	chats.history.forEach((chatMsg: ChatMessage) => {
		console.info(`${chatMsg.companion.configuration.name}: ${chatMsg.message}`);
	});
}, 15000);
