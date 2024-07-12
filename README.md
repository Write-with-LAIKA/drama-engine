# Drama Engine

A library for agent orchestration

*DISCLAIMER: This package is a work in progress. We aim to officially announce it in the next weeks and then more documentation will be made available. For now, feel free to play around and read code but maybe don't use it for anything important yet.*

## About the Drama Engine

The Drama Engine is a framework for agentic interaction with language models. It is written in TypeScript to execute in any browser. The Drama Engine is model- and provider-agnostic. We’ve built the Drama Engine for use in our Writers Room and that makes it focused on working with text but it can be used for any multi-participant chat.

### Core features

- Multi-agent workflows with delegation
- Dynamic prompt assembly
- Model-agnostic
- Vendor-agnostic

At the heart of the drama engine are different kinds of companions and their orchestration. Some companions are agents that simulate a personality. They can change over time and interact with each other. These companions use deputies to run ad-hoc chains of prompts that allow for a mix of different prompting techniques. A deputy might use a few-shot prompt to an instruction-tuned model while its host companion talks to the user by calling a chat-tuned model. This way, dynamic sequences of prompting (e.g. text summary, but only if the text is too long -> text analysis -> discussion about the analysis) can be configured in a modular way. The resulting system is far more flexible than prompt chains.

## Installation

Install using your favourite package manager:

```bash
npm i @write-with-laika/drama-engine
```

## Configuration

### Database

This library was developed to power our live product, [Writers Room](https://wr.writewithlaika.com), where we utilise the browsers IndexedDB API to store and manage states and data.

When we decided to open source this package, we realised we needed to ship this with a generic database interface to manage the data. Therefore, we provide a minimal database interface which you can extend with your own functions. Have a look at `./tests/config/db.ts` for an example of an in-memory database.

If you believe the interface can be improved, we welcome your contributions or feel free to reach out to us.

### Environment variables

The library is provider agnostic as long as the LLM service you are using supports the OpenAI API standard.
The library supports both the `/v1/completions` endpoint (that uses `prompt` string as LLM input) and the chat `/v1/chat/completions` endpoint (that uses `messages` array as LLM input).

The possible environment variables are:

- `DE_BASE_URL` - The base url for the provider. Default: `<empty>`
- `DE_ENDPOINT_URL` - The endpoint for the provider. Default: `v1/completions`
- `DE_BACKEND_API_KEY` - The API key for the provider. If provided, all requests will include `Bearer: <DE_BACKEND_API_KEY>` in the `Authorization` header. Default: `<empty>`
- `DE_LOG_LEVEL` - The log level for the provider. Default: `info`

For convenience, all the environment variables "public" variants (that are exposed client-side) will also be checked/used during initialisation, i.e., the `NEXT_PUBLIC_` prefix variants: `NEXT_PUBLIC_DE_BASE_URL`, `NEXT_PUBLIC_DE_ENDPOINT_URL`, `NEXT_PUBLIC_DE_BACKEND_API_KEY`, and, `NEXT_PUBLIC_DE_LOG_LEVEL`.

Please copy `.env.template` as `.env`, set your values, and, start using the library.

**NOTE**: Depending on your provider backend, CORS might be required. The library does not handle these.

### Drama Engine Initialisation

The drama engine accepts a few configuration options while initialisation.

- `defaultSituation`: The initial situation for the companion when they are initialised.
- `companionConfigs`: A list of companion configs. An example is provided below and in `/tests`.
- `kyInstance`: An optional [Ky](https://github.com/sindresorhus/ky/) instance. We use Ky as our default HTTP client as it supports nice features like caching, redirects, retries, etc. out of the box. You can provide your own instance if needed else it will use the default one.
- `database`: A database interface. A minimal in-memory database is provided in `tests`.
- `additionalOptions`: An `Options` object from `Ky`. You can set your own additional headers, retry options, etc. here. Refer to `Ky` documentation for more info.
- `chatModeOverride`: An optional `boolean` variable. Default `false`. By default, if the value of `DE_ENDPOINT_URL` contains `chat/completions`, the library will switch to "chat" mode and use the `messages` array as the LLM input. If your endpoint is different, you can override this behaviour by passing a different value here.

### Note on Authorization / API keys

If a `kyInstance` or `additionalOptions` is provided, the library will check the following headers for API keys: `x-api-key`, `x-auth-token`, `authorization`.

Only when one of the above is not found, the library checks the `DE_BACKEND_API_KEY` for an API key or token and sets it as a `Bearer` token in the `Authorization` header.

If none are found, a warning is issued.

If your provider uses a different header(s), you can pass it via `additionalOptions` and safely ignore the warning.

**NOTE**: If you are a service provider using this library (esp. on client-side), it's recommended to handle outgoing requests using a middleware service such as Cloudflare, Vercel, etc. so that the API key is not exposed publicly. This library does not differentiate between server-side and client-side usage, so you should handle this appropriately.

## Tests

A sample test suite is provided under `./tests/drama.test.ts` that can be run via `npm run test`. Ensure you have all the dev dependencies installed.

Please refer to the test implementations for usage examples.

## Usage

Set up a `Drama` and instantiate chats:

```javascript

const d = await Drama.initialize("writersroom", writersroomCompanionConfigs, apiClient,
  new DramaEngineDatabaseInterface(), {
  headers: {
    Accept: 'application/json'
  },
  timeout: 60 * 1000 // 1 minute
});
d.setWorldStateEntry("USERNAME", settings.user.unescapedUsername);
d.addChat("fireplace", "fireplace", [...d.companions.filter(c => c.configuration.kind == "npc").map(c => c.id), "you"], 8, "auto");

```

Append a user message to a chat:

```javascript

const you = participants && participants['you'];
you && chat.appendMessage(you, message);
callback && callback(chat);

```

Configure a companion (be careful with newlines – they are retained in the prompt and so is indentation):

```javascript
{
  name: "Anders",
  class: ChatCompanion,
  bio: "Angel Investor @ HustleAndBustle",
  description: "An international businessman from Denmark",
  base_prompt: `Your name is Anders.
You are an expert businessman with decades of experience with evaluating startup business ideas and pitches for viability.
You are volunteering your expertise to help a new startup founder refine their pitch and business case.
You have a friendly yet matter-of-fact communication style.
You care about startup success and founder mental health more than anything else.`,
  situations: [{
      id: "fireplace",
      prompt: `You are in a casual environment, chatting with co-workers.
You are free to be yourself and relax with friendly conversation.
You will not make any plans with the user, and you will not agree to any plans suggested by the user.`
  }, {
    id: "writersroom",
    prompt: `When given text by a startup founder, you will analyze it for any improvements you can suggest to make it sharper, clearer, and more likely to win investment.
You have a vast knowledge of sales, marketing, product market fit, product strategy, and fundraising with top-tier investors.
You often like to offer a small piece of business wisdom.
You never write more than two sentences per response.
If you do not know something, you will say so rather than inventing an answer.
You will not make any plans with the user, and you will not agree to any plans suggested by the user.`
  }],
  kind: "npc"
}
```

Run a conversation with up to 4 replies:

```javascript

const context = new Context(undefined, [], "fireplace", situation); // make a new context
await drama.runConversation(chat, 4, context, undefined, undefined, callback); // run for up to 4 messages

```

## Concepts

### Companions

There are three kinds of companions in the Drama Engine: user, NPC and shell. They are all subclasses of `AutoCompanion` which is the only subclass of the abstract class `Companion`.

There is always only one user. NPCs (non-playing characters) are the companions the user talks to. Shell companions are mostly deputies to the NPCs that offer specialised functionalities. The only other shell companion is the moderator of the chat.

The configuration of companions is in a JSON structure and provided to the drama engine on startup. The structure also defines which class is used to instantiate the companion. NPCs should have the class `ChatCompanion`, whereas most simple shells will be InstructionDeputy instances.

#### NPCs

These are the characters the user chats with. Their configuration (an instance of `CompanionConfig`) defines everything about them. It covers their name, backstory, how they develop over time – everything that defines their behaviour.

Some of these fields are just strings (e.g. name and bio). The bio is meant for the user and inspired by social media bios. The description is used by the moderator and other companions to know who’s who. The base prompt is the first part of every prompt the companions sends to the model so it should start with their name and then have a few lines of definitions of how the character is supposed to talk and who they are. Situations are defined per chat and the prompt in them is added to every prompt sent to the model that happens in a chat room that plays in that situation.

Moods are probabilistic; you define a set of moods and how probable they are. If the sum of all probabilities adds up to less than 1, the character is in a “neutral” mood if the dice rolls a value in that range. Moods are currently initialised on load – which means they change on reload.

Knowledge unlocks as the user interacts with the companions (or based on other conditions). This mechanism establishes a feeling of growing familiarity as the companion opens up more and more to the user.

#### Shells

This type of companion never talks directly to the user. They are employed by NPCs to execute various actions or used to orchestrate the chat. The chat moderator is preconfigured. The simplest deputy is the `InstructionDeputy`. This deputy defines a single replyFunction. There are more reply functions hooked up in `Deputy`, the superclass of `InstructionDeputy` but we’ll get to that later. A reply function triggers when the deputy gets activated and certain conditions are met (see below). The single reply function found in this file has a condition that is always met and adds the job defined in the companion’s config to the prompt.

The configuration of an `InstructionDeputy` should define at least their job (which gets added to the prompt for them to execute their abilities), a scope, and their name. The scope defines what part of the context the deputy acts on. Possible scopes are the last sentence, the last paragraph, a random paragraph, “some” (meaning “anything that’s not nothing"), or the full document. The name is only used to hook up actions. Deputies can set their temperature – most times a low value is best suited for these more structured inferences.

### Reply functions

Reply functions are a way for a companion object to control the flow of execution. There is a list of reply functions in every companion and they get executed one by one until one of them returns true, meaning the companion is done with their job. They are currently used for three purposes. Firstly, all companions use the catch-all reply function to execute their base functionality. Secondly, if a provided text is too long for the context size of the model, all companions can use a set of summarising and scoping functions to boil down the context to its essence. Thirdly, actions that require input data will stop executing and tell the user to provide more data if there is too little.

The triggers for reply functions can take a lot of different shapes as evident in the `evaluateReplyTrigger` in the `AutoCompanion` class. Triggers will execute when a certain condition is met. Possible conditions that lead to execution of a reply function are that the specified value is the active action, the sender’s name, an instance of `AutoCompanion`, the result of a function call, or smaller than a random number. In the case of a function call that function receives the current context and the last speaker as its input and should return a boolean value. We use that to determine if a summary has to be made because the context contains all text and since the context is edited by all reply functions before being passed on, our summariser can do its whole job before the deputy or companion acts on the context.

### Context object and world state

The link between companions and the work of the user is established using two kinds of objects. The world state is a single global database of key-value pairs that can hold any kind of information of relevance to the system (e.g. `USERNAME` stores the user’s name in our own implementation so the companions can address them by their name). The context object gets constructed for each interaction of the user with the drama engine. It gets passed between companions and down to deputies. One context is valid for one exchange. Under some circumstances an exchange can have multiple turns of user interaction (i.e. when the companion asks a question and is waiting for an answer).

The `Context` class is huge but well documented. The actual act of prompting the language model packs the context and a model configuration (plus some administrative data) into a job that gets turned into a query for the model. That means all information needed to create the prompt is in the context. That information ranges from who’s the speaker to what their job is at this moment, to all the data from the user, to who else is in the room, and so on. Some information (e.g. the mood) is added by the companion before it passes the context on. If the companion delegates the action, it might also add information for the delegate. The delegate writes their reply into the context (potentially after an inference) and the companion reads it from there before acting on it.

### Preparing inputs to the LLM

Depending on whether the endpoint is `chat/completions` type or not i.e, the value of `chatMode`, the library decides whether to use `prompt` or `messages` as inputs to the LLM.

This is performed on the fly depending on the context in the `assemblePrompt` function of the `Prompter` class. The function takes a `Context` object, the world state database, and, generates a list of `messages` using decorators and other mechanisms. If the function's `returnChat` value is `true` or `(drama|chat.drama).chatMode` is set to `true`, the list of messages are returned as is to be used directly with the `chat/completions` endpoint. Otherwise, the function applies the model's (or job's) template (e.g., ChatML) to tranform these messages into a single `prompt` string.

Decorators are simple replacement-based templates that are used to tag specific pieces of information for referencing them in a job. E.g. the decorator `USER TEXT=\"{{DATA}}\"."` is used to label the user-provided textual data as `USER TEXT`, so a job can use “Summarise the USER TEXT” as part of an instruction/prompt and the model will know where to find the text (in most cases). The prompter also adds some default information like the current data and time.

### Delegation and actions

Our system mixes chained prompting with explicit actions. An action is a concrete specific activity to be performed by the system. An example would be “Summarise my text”, which we offer in the Writers Room. In order to specify an action, there has to be a deputy that executes it. A deputy can be hooked up to any number of actions. Actions can have conditions, if they should unlock over time or only be available during specific circumstances. Actions are meant to be triggered explicitly.

If an action is triggered, the moderator automatically makes the deputy who is supposed to execute it the next speaker and the companion who hosts the action the one following up. The deputy either executes their own language model call or just defines the job of the companion and returns. By default the companion writes to the chat in place of the deputy. Depending on what field of the context the deputy writes their data to, the deputy’s output might additionally enter the chat. See `runChat` in the `Drama` object and the `Context` class for details.

### Chats and moderation

The `Drama` object orchestrates all chats. In our next refactoring we will transfer some of the functionality from that object to the Chat object but for now reading the Drama class should give a good overview of how chats work. The main entry point for a multi-round chat is the runConversation function. This function runs a conversation (via runChat) for up to a specified amount of rounds. Each round it calls the moderator to determine the next speaker. If the next speaker is the user, the conversation ends. Otherwise it calls the `generateReply` function of one active speaker after the other passing the same context object along between them. If a reply should be appended to the chat messages, it does so. The `runChat` function also updates the state of all participants, counts the interactions, and keeps the chat database in sync.

The moderator currently only selects the next speaker. It selects the right deputy if an action is found, and otherwise supports different ways of scheduling who’s up next. One is round robin, where the baton is passed from person to person. That also works with only the user and a single companion, making sure that the companion returns exactly one reply. Another selection method is just picking a random companion. If another companion was mentioned in the last reply, that companion is automatically picked as the next speaker. The final way of picking a speaker is asking a language model to determine who should speak next by supplying it with the last lines of the chat and a list of chat participants.

Specific speakers can be excluded from the list of allowed speakers. Repeat replies can be disabled, too. Shells (deputies) are not permitted to speak unless as part of an action.

## Intended Use

The intended way for working with the Drama Engine is to first define companions and their actions. The you set up individual chats or group chats with them. In order to display the chat and make the actions available, some interface work is necessary. As you can see above, all the chat history is always in the Chat object and there's a callback for whenever a new message comes in.

## Extending the Drama Engine

The easiest way to extend the current functionality of the Drama Engine is to write new instruction deputies. Those just have a job defined that replaces most of the deputy prompt when sent to the model. The companion hosting the deputy then directly forwards the prompt’s result as if they had replied by themselves. Adding a new instruction deputy requires a line defining the deputy and another one defining an action that uses this deputy.

Next, users can write their own subclasses of the `Deputy` class. In that case, all they have to do is make a new class, define the companion config, and a `runAction` function. This function can edit the context to trigger automatic prompting of the language model. It can also just set a job or other context fields to specify the behaviour of the hosting companion instead.

Finally, reply functions allow for a wide range of customisation of companion behaviour all the way to full agentic workflows where one agent writes code, another one executes it and a third one criticises it. The sky's the limit.
