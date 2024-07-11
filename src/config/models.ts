/*

Context sizes:
teknium/OpenHermes-2-Mistral-7B				8192	=> 30k characters (<4 letter tokens)
teknium/OpenHermes-2p5-Mistral-7B			8192	=> 30k characters (<4 letter tokens)
NousResearch/Nous-Hermes-2-Mistral-7B-DPO	32768	=> 120k characters (<4 letter tokens)
NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO	32768	=> 120k characters (<4 letter tokens)

1 token is ~4 characters.
*/

import { defaultPromptConfig, defaultPromptTemplates } from "./prompts";

export type ModelConfig = typeof defaultModelConfig;

export const defaultModelConfig = {
	model: 'teknium/OpenHermes-2p5-Mistral-7B',
	n: 1,
	presence_penalty: 0,
	frequency_penalty: 0,
	repetition_penalty: 1.2,

	temperature: 0.93,
	max_tokens: 200,
	top_p: 0.93,
	top_k: 4,
	// min_p: 0.05,

	stop: "",
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

export const largeContextModelConfig = {
	...defaultModelConfig,

	model: 'mistralai/Mixtral-8x7B-Instruct-v0.1', //'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
	max_tokens: 512,
	extra: {
		template: defaultPromptTemplates.mistral,
		promptConfig: {
			max_prompt_length: 100000,
			job_in_chat: false,
			system_role_allowed: false,
		},
	}
}

