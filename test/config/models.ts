import { defaultPromptConfig } from "../../src";

export const testModelConfig = {
    model: 'meta-llama/Llama-3-8b-chat-hf',
    n: 1,
    presence_penalty: 0,
    frequency_penalty: 0,
    repetition_penalty: 1.2,

    temperature: 1.1,
    max_tokens: 256,
    top_p: 0.93,
    top_k: 4,

    stop: "",
    stop_token_ids: [
        0
    ],
    ignore_eos: false,
    skip_special_tokens: true,
    spaces_between_special_tokens: true,

    extra: {
        template: {
            bos_token: "<|begin_of_text|>",
            eos_token: "<|eot_id|>",
            unk_token: "<unk>",
            chat_template: "{% set loop_messages = messages %}{% for message in loop_messages %}{% set content = '<|start_header_id|>' + message['role'] + '<|end_header_id|>\n\n'+ message['content'] | trim + '<|eot_id|>' %}{% if loop.index0 == 0 %}{% set content = bos_token + content %}{% endif %}{{ content }}{% endfor %}{% if add_generation_prompt %}{{ '<|start_header_id|>assistant<|end_header_id|>\n\n' }}{% endif %}",
        },
        promptConfig: defaultPromptConfig,
    }
}