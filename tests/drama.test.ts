import { expect, test } from '@jest/globals';
import { ChatMessage, Context, Drama } from '../src';
import { InMemoryDatabase } from './config/db';
import { testCompanionConfigs } from './config/companions';
import { Options } from 'ky';
import { streamingModelConfig, testModelConfig } from './config/models';

let additionalOptions: Options | undefined = undefined;
const userTestPrompt = "Hey Anders, if our startups target is a small niche market, how do we expand and still keep our core values ?";

beforeAll(() => {
	const baseUrl = process.env.DE_BASE_URL || process.env.NEXT_PUBLIC_DE_BASE_URL;
	const apiKey = process.env.DE_BACKEND_API_KEY;

	expect(baseUrl).toBeDefined();
	!apiKey && console.warn("No API key found. Ensure your API is unauthenticated.");

	additionalOptions = {
		prefixUrl: (baseUrl || ''),
		headers: {
			...(apiKey ? {
				'Authorization': `Bearer ${apiKey}`,
			} : {}),
			// other headers...
		}
	};
});

test('Initialised drama engine correctly', async () => {
	const db: InMemoryDatabase = new InMemoryDatabase();
	const drama = await Drama.initialize("water-cooler", testCompanionConfigs, undefined, db, additionalOptions);
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
	const db: InMemoryDatabase = new InMemoryDatabase();
	const drama = await Drama.initialize("co-working", [{ ...testCompanionConfigs[0], modelConfig: testModelConfig }], undefined, db, additionalOptions);

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

	const db: InMemoryDatabase = new InMemoryDatabase();
	const drama = await Drama.initialize("co-working", [{ ...testCompanionConfigs[0], modelConfig: testModelConfig }], undefined, db, additionalOptions);
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
	const db: InMemoryDatabase = new InMemoryDatabase();
	const drama = await Drama.initialize("co-working", [{ ...testCompanionConfigs[0], modelConfig: streamingModelConfig }], undefined, db, additionalOptions);
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