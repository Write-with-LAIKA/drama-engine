/*

Context sizes as per LLM provider (Novita AI):
teknium/openhermes-2.5-mistral-7b	4096	=> 15k characters (<4 letter tokens)
Nous-Hermes-2-Mixtral-8x7B-DPO	32768	=> 120k characters (<4 letter tokens)


1 token is ~4 characters.
*/

import { defaultPromptConfig, defaultPromptTemplates, PromptConfig } from "./prompts";

export type ModelConfig = {
	model: string,
	n: number,
	presence_penalty: number,
	frequency_penalty: number,
	repetition_penalty: number,

	temperature: number,
	max_tokens: number,
	top_p: number,
	top_k: number,
	// min_p: number,

	stop: string[] | null,
	stop_token_ids: number[],
	ignore_eos: boolean,
	skip_special_tokens: boolean,
	spaces_between_special_tokens: boolean,
	stream: boolean,

	extra: {
		template: typeof defaultPromptTemplates.chatml,
		promptConfig: PromptConfig,
	}
};

export const defaultModelConfig: ModelConfig = {
	model: 'teknium/openhermes-2.5-mistral-7b',
	n: 1,
	presence_penalty: 0,
	frequency_penalty: 0,
	repetition_penalty: 1.2,

	temperature: 0.93,
	max_tokens: 200,
	top_p: 0.93,
	top_k: 4,
	// min_p: 0.05,

	stop: null,
	stop_token_ids: [
		0
	],
	ignore_eos: false,
	skip_special_tokens: true,
	spaces_between_special_tokens: true,
	stream: false,

	extra: {
		template: defaultPromptTemplates.chatml,
		promptConfig: defaultPromptConfig,
	}
}

export const largeContextModelConfig: ModelConfig = {
	...defaultModelConfig,

	model: 'Nous-Hermes-2-Mixtral-8x7B-DPO',
	max_tokens: 512,
	// extra: {
	// 	template: defaultPromptTemplates.mistral,
	// 	promptConfig: {
	// 		max_prompt_length: 100000,
	// 		job_in_chat: false,
	// 		system_role_allowed: false,
	// 	},
	// }
}

