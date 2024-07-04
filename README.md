# Drama Engine

A library for agent orchestration

*DISCLAIMER: This package is a work in progress. We aim to officially announce it in the next weeks and then more documentation will be made available. For now, feel free to play around and read code but maybe don't use it for anything yet?*

## About the Drama Engine

The Drama Engine is a framework for agentic interaction with language models. It is written in TypeScript to execute in any browser. The Drama Engine is model- and provider-agnostic. We’ve built the Drama Engine for use in our Writers Room and that makes it focused on working with text but it can be used for any multi-participant chat.

### Core features:

- Multi-agent workflows with delegation
- Dynamic prompt assembly
- Model-agnostic
- Vendor-agnostic

At the heart of the drama engine are different kinds of companions and their orchestration. Some companions are agents that simulate a personality. They can change over time and interact with each other. These companions use deputies to run ad-hoc chains of prompts that allow for a mix of different prompting techniques. A deputy might use a few-shot prompt to an instruction-tuned model while its host companion talks to the user by calling a chat-tuned model. This way, dynamic sequences of prompting (e.g. text summary, but only if the text is too long -> text analysis -> discussion about the analysis) can be configured in a modular way. The resulting system is far more flexible than prompt chains.
