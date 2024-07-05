import { Category, Condition, ConditionalLine, evaluateCondition } from "../conditions";
import { ModelConfig, defaultModelConfig } from "../model-config";
import { Drama } from "../drama";
import { getRandomElement, randomArrayElement } from "../utils/array-utils";
import { AutoCompanion } from "./auto-companion";

export type CompanionState = "disabled" | "free" | "active" | "autonomous" | "chat-only";
export type CompanionKind = "user" | "npc" | "shell";
export type CompanionScope = "document" | "last_sentence" | "last_paragraph" | "random_paragraph" | "screen" | "some";

// Scope overrides the deputy's default scope
export type ActionDescription = { id: string, label?: string, deputy: string, condition?: Condition, fallback?: CompanionScope }

export type TriggerOperation = "set" | "add" | "send";
export type TriggerDescription = { action: string | TriggerOperation, effect?: Condition, condition: Condition }

export type CompanionConfig = {
	name: string,
	class: (new (configuration: CompanionConfig, drama: Drama) => AutoCompanion),
	description: string,
	base_prompt: string,
	kind: CompanionKind,

	moods?: {
		probability: number,
		label: string,
		prompt: string,
	}[],

	bio?: string,
	avatar?: string,
	job?: string,
	situations?: { id: string, prompt: string }[],
	knowledge?: ConditionalLine[],
	mottos?: ConditionalLine[],
	
	actions?: ActionDescription[],
	triggers?: TriggerDescription[],
	
	temperature?: number,

	scope?: CompanionScope;
};

export abstract class Companion {
	id: string;
	configuration: CompanionConfig;
	status: CompanionState;
	modelConfig?: ModelConfig = undefined;

	// statistics
	interactions: number;
	actions: number;

	mood: { label: string, prompt?: string } = { label: "neutral", prompt: undefined };

	public static toID = (name: string) => { return name.toLowerCase(); }

	constructor(configuration: CompanionConfig) {
		this.configuration = configuration;
		this.id = Companion.toID(configuration.name);
		this.interactions = 0;
		this.actions = 0;
		this.status = "active";

		if (configuration.temperature) { 
			this.modelConfig = { ...defaultModelConfig, temperature: configuration.temperature }
		}

		return this;
	}

	getBasePrompt = () => this.configuration.base_prompt;

	getMottosByEvent = (event: Category, drama: Drama) => {
		return this.configuration.mottos!
			.filter(m => m.category == event && m.condition && evaluateCondition(m.condition, drama.worldState))
			.flatMap(v => v.lines)
			|| [];
	}

	getRandomMottoByEvent = (event: Category, drama: Drama): string => {
		const userName = drama.getWorldStateValue("USERNAME");
		if (userName)
			return randomArrayElement<string>(this.getMottosByEvent(event, drama)).replace("{{USERNAME}}", userName as string) || "";
		else 
			return randomArrayElement<string>(this.getMottosByEvent(event, drama)) || "";
	}

	valueOf = () => this.id; // id is unique and if companion has the same it's the same companion


}