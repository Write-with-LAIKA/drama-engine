
/** TYPES */

export const enum PromptStyles {
	MISTRAL_FORMAT,
	CHATML_FORMAT,
}

export type PromptConfig = {
	max_prompt_length: number,		// in characters!
	job_in_chat: boolean,			// whether job goes into system prompt (false) or chat (true)
	system_role_allowed: boolean,	// some templates do not support "system" role e.g., Mistral instruction format
}

export type PromptTemplate = {
	bos_token: string,
	eos_token: string,
	unk_token: string,
	chat_template: string,
}

/** DEFAULTS */

export const defaultPromptConfig: PromptConfig = {
	max_prompt_length: 1024 * 3 * 4,
	job_in_chat: false,
	system_role_allowed: true,
}

export const defaultPromptTemplates = {
	MISTRAL: {
		bos_token: "<s>",
		eos_token: "</s>",
		unk_token: "<unk>",
		chat_template: "{{ bos_token }}{% for message in messages %}{% if (message['role'] == 'user') != (loop.index0 % 2 == 0) %}{{ raise_exception('Conversation roles must alternate user/assistant/user/assistant/...') }}{% endif %}{% if message['role'] == 'user' %}{{ '[INST] ' + message['content'] + ' [/INST]' }}{% elif message['role'] == 'assistant' %}{{ message['content'] + eos_token + ' ' }}{% else %}{{ raise_exception('Only user and assistant roles are supported!') }}{% endif %}{% endfor %}",
	},
	CHATML: {
		bos_token: "<s>",
		eos_token: "<|im_end|>",
		unk_token: "<unk>",
		chat_template: "{% for message in messages %}{{'<|im_start|>' + message['role'] + '\n' + message['content'] + '<|im_end|>' + '\n'}}{% endfor %}<|im_start|>{{ speaker }}\n",
	},

}