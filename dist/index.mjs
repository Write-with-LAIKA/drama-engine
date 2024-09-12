// src/utils/logging-utils.ts
var LOG_LEVEL = (process.env.DE_LOG_LEVEL || process.env.NEXT_PUBLIC_DE_LOG_LEVEL || "info").toLowerCase();
if (!["info", "error", "warning", "debug", "off"].includes(LOG_LEVEL)) {
  throw new Error(`Undefined log level: ${LOG_LEVEL}`);
}
var shouldLog = (level) => {
  return level === LOG_LEVEL || LOG_LEVEL === "debug";
};
var logger = {
  info: shouldLog("info") ? console.info : () => {
  },
  error: !shouldLog("off") ? console.error : () => {
  },
  debug: shouldLog("debug") ? console.debug : () => {
  },
  warn: shouldLog("info") || shouldLog("warning") ? console.warn : () => {
  }
};

// src/context.ts
var defaultDecorators = [
  { type: "persona", replacement: "{{DATA}}" },
  { type: "text", replacement: 'USER TEXT="{{DATA}}".' },
  // { type: "input", replacement: "USER TEXT=\"{{DATA}}\"." },
  { type: "paragraph", replacement: 'USER PARAGRAPH="{{DATA}}"' },
  { type: "companionNames", replacement: "OTHER CHAT PARTICIPANTS:\n{{DATA}}" },
  // { type: "job", replacement: "JOB=\"{{DATA}}\"" },
  { type: "job", replacement: "{{DATA}}" },
  { type: "chat", replacement: "\n{{DATA}}" },
  { type: "knowledge", replacement: "\n{{DATA}}" },
  { type: "epilogue", replacement: "{{DATA}}" }
];
var Context = class {
  constructor(recipient, companions, chatID, situation, data) {
    // An identifier of the situation
    // data: ContextData[];
    // TRACKING: these get set whenever there's relevant activity
    this.input_tokens = 0;
    this.output_tokens = 0;
    this.runtime = 0;
    this.addUsage = (response) => {
      this.response_id = response.id;
      this.input_tokens += response.input_tokens || 0;
      this.output_tokens += response.output_tokens || 0;
    };
    this.findActionConfiguration = (configuration) => configuration.actions?.find((a) => a.id == this.action);
    this.findDelegate = (configuration, companions) => {
      const action = this.findActionConfiguration(configuration);
      const answer = this.hasAnswer();
      logger.debug("ACTION: " + action?.id);
      logger.debug("ANSWER: " + answer);
      if (action && !answer) {
        const deputy = companions.find((c) => c.id == action.deputy);
        logger.debug("Action " + action.id + " => " + deputy + " found.");
        if (deputy) {
          return deputy;
        } else {
          logger.debug("Deputy " + action.deputy + " not found.");
          logger.debug(companions);
        }
      }
      return void 0;
    };
    this.hasAnswer = () => this.answer || this.question || this.quote;
    // whether there is a field with context info or the deputy needs to ask for more information
    this.query = () => this.text || this.input || this.paragraph;
    this.recipient = recipient;
    this.companions = companions;
    this.chatID = chatID;
    this.situation = situation;
    if (data) {
      this.companionNames = data.find((d) => d.type == "companionNames")?.data;
      this.error = data.find((d) => d.type == "error")?.data;
      this.conversationID = data.find((d) => d.type == "conversationID")?.data;
      this.chat = data.find((d) => d.type == "chat")?.data;
      this.knowledge = data.find((d) => d.type == "knowledge")?.data;
      this.text = data.find((d) => d.type == "text")?.data;
      this.paragraph = data.find((d) => d.type == "paragraph")?.data;
      this.epilogue = data.find((d) => d.type == "epilogue")?.data;
      this.input = data.find((d) => d.type == "input")?.data;
      this.action = data.find((d) => d.type == "action")?.data;
      this.persona = data.find((d) => d.type == "persona")?.data;
      this.job = data.find((d) => d.type == "job")?.data;
      this.mood = data.find((d) => d.type == "mood")?.data;
      this.question = data.find((d) => d.type == "question")?.data;
      this.answer = data.find((d) => d.type == "answer")?.data;
      this.excerpt = data.find((d) => d.type == "excerpt")?.data;
      this.quote = data.find((d) => d.type == "quote")?.data;
      this.message = data.find((d) => d.type == "message")?.data;
      this.tool = data.find((d) => d.type == "tool")?.data;
    }
  }
  // getData = (type: ContextDataTypes) => this.data.find(d => d.type == type)?.data;
  // setData = (type: ContextDataTypes, data: string | undefined) => {
  // 	if (!data) {
  // 		// remove entry if data is undefined
  // 		this.removeData(type);
  // 		return;
  // 	}
  // 	this.data = [...this.data.filter(d => d.type != type), { type: type, data: data }];
  // }
  // removeData = (type: ContextDataTypes) => this.data = this.data.filter(d => d.type != type);
};

// src/utils/array-utils.ts
var getRandomElement = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};
var randomArrayElement = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// src/config/prompts.ts
var defaultPromptConfig = {
  max_prompt_length: 1024 * 3 * 4,
  job_in_chat: false,
  system_role_allowed: true
};
var defaultPromptTemplates = {
  "mistral": {
    bos_token: "<s>",
    eos_token: "</s>",
    unk_token: "<unk>",
    chat_template: "{{ bos_token }}{% for message in messages %}{% if (message['role'] == 'user') != (loop.index0 % 2 == 0) %}{{ raise_exception('Conversation roles must alternate user/assistant/user/assistant/...') }}{% endif %}{% if message['role'] == 'user' %}{{ '[INST] ' + message['content'] + ' [/INST]' }}{% elif message['role'] == 'assistant' %}{{ message['content'] + eos_token + ' ' }}{% else %}{{ raise_exception('Only user and assistant roles are supported!') }}{% endif %}{% endfor %}"
  },
  "chatml": {
    bos_token: "<s>",
    eos_token: "<|im_end|>",
    unk_token: "<unk>",
    chat_template: "{% for message in messages %}{{'<|im_start|>' + message['role'] + '\n' + message['content'] + '<|im_end|>' + '\n'}}{% endfor %}<|im_start|>{{ speaker }}\n"
  }
};

// src/config/models.ts
var defaultModelConfig = {
  model: "teknium/openhermes-2.5-mistral-7b",
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
    promptConfig: defaultPromptConfig
  }
};
var largeContextModelConfig = {
  ...defaultModelConfig,
  model: "Nous-Hermes-2-Mixtral-8x7B-DPO",
  max_tokens: 512
  // extra: {
  // 	template: defaultPromptTemplates.mistral,
  // 	promptConfig: {
  // 		max_prompt_length: 100000,
  // 		job_in_chat: false,
  // 		system_role_allowed: false,
  // 	},
  // }
};

// src/utils/string-utils.ts
function getLastStopSign(text) {
  return Math.max(
    text.lastIndexOf("."),
    text.lastIndexOf("!"),
    text.lastIndexOf("?"),
    // text.lastIndexOf('\''), // don't use this one because it's used in the middle of a sentence (like in this one twice)
    // text.lastIndexOf('"'),
    // text.lastIndexOf('”'),
    // text.lastIndexOf('＂'),
    // text.lastIndexOf('〞'),
    // text.lastIndexOf('‟'),
    text.lastIndexOf("\u2026"),
    // text.lastIndexOf("..."),
    text.lastIndexOf(":"),
    text.lastIndexOf(";"),
    text.lastIndexOf("\n")
  );
}
function getNextCut(text) {
  return Math.min(
    text.includes(".") ? text.indexOf(".") : text.length - 1,
    text.includes("!") ? text.indexOf("!") : text.length - 1,
    text.includes("?") ? text.indexOf("?") : text.length - 1,
    text.includes("\u2026") ? text.indexOf("\u2026") : text.length - 1,
    text.includes("...") ? text.indexOf("...") : text.length - 1,
    text.includes(":") ? text.indexOf(":") : text.length - 1,
    text.includes(";") ? text.indexOf(";") : text.length - 1,
    // text.includes('\n') ? text.indexOf('\n') : text.length - 1,
    text.length - 1
  );
}
function findCut(text, startPosition = 0) {
  return startPosition + getNextCut(text.substring(startPosition, text.length));
}
function cleanText(text) {
  const cleanedText = text.replace(/[ʻʼʽ٬‘‚‛՚︐«»““”„‟≪≫《》〝〞〟＂″‶"]/g, "").replace(/([\.\?!:;,])(\S)/g, "$1 $2").replace(/[\r\n]{2,}/g, "\n").replace(/[^\S\r\n]{2,}/g, " ");
  return cleanedText;
}
var shortenText = (text, length) => {
  const startIndex = text.length - length;
  if (startIndex < 0) return text;
  const shorterText = text.substring(startIndex);
  const nextCutoff = getNextCut(shorterText) + 1;
  if (nextCutoff < shorterText.length) return shorterText.substring(nextCutoff);
  return shorterText;
};
var getLastParagraph = (document) => {
  if (document.length <= 1e3) return cleanText(document);
  const paragraphs = cleanText(document).split("\n");
  const selectedParagraph = paragraphs.pop();
  return selectedParagraph ? shortenText(selectedParagraph, 1e3) : shortenText(document, 1e3);
};
var getLastSentence = (document) => {
  const trimmedDocument = cleanText(document.trim());
  if (trimmedDocument.length <= 70) return trimmedDocument.trim();
  const lastStopSign = getLastStopSign(trimmedDocument.substring(0, trimmedDocument.length - 3)) + 1;
  if (lastStopSign >= 0 && lastStopSign < trimmedDocument.length) return trimmedDocument.substring(lastStopSign).trim();
  return trimmedDocument.substring(trimmedDocument.length - 70).trim();
};
var getRandomParagraph = (document) => {
  if (document.length <= 1e3) return document;
  const paragraphs = cleanText(document).split("\n");
  if (paragraphs.length < 2) return getLastParagraph(document);
  const selectedParagraph = randomArrayElement(paragraphs);
  return shortenText(selectedParagraph, 1e3).trim();
};

// src/conditions.ts
var evaluateCondition = (condition, worldState) => {
  const min = condition.min || 0;
  const max = condition.max || Number.MAX_SAFE_INTEGER;
  switch (condition.tag) {
    case "none":
      return true;
    case "event":
      const activeEvent = worldState.find((entry) => entry.key == condition.value);
      return activeEvent != void 0 && activeEvent.value;
    default:
      break;
  }
  if (typeof condition.tag == "string") {
    const entry = worldState.find((entry2) => entry2.key == condition.tag);
    if (!entry) {
      logger.error("Invalid trigger: '" + condition.tag + "' not found in world state.");
      return false;
    }
    if (condition.value && typeof condition.value != typeof entry.value) {
      logger.error("Invalid trigger: " + condition.tag + " has a different type than the corresponding world state.");
      return false;
    }
    if (typeof entry.value == "number" && condition.value == void 0)
      return entry.value >= min && entry.value < max;
    return entry.value === condition.value;
  }
  return false;
};

// src/companions/companion.ts
var _Companion = class _Companion {
  constructor(configuration) {
    this.mood = { label: "neutral", prompt: void 0 };
    this.getBasePrompt = () => this.configuration.base_prompt;
    this.getMottosByEvent = (event, drama) => {
      return this.configuration.mottos.filter((m) => m.category == event && m.condition && evaluateCondition(m.condition, drama.worldState)).flatMap((v) => v.lines) || [];
    };
    this.getRandomMottoByEvent = (event, drama) => {
      const userName = drama.getWorldStateValue("USERNAME");
      if (userName)
        return randomArrayElement(this.getMottosByEvent(event, drama)).replace("{{USERNAME}}", userName) || "";
      else
        return randomArrayElement(this.getMottosByEvent(event, drama)) || "";
    };
    this.valueOf = () => this.id;
    this.configuration = configuration;
    this.id = _Companion.toID(configuration.name);
    this.interactions = 0;
    this.actions = 0;
    this.status = "active";
    return this;
  }
  // id is unique and if companion has the same it's the same companion
};
_Companion.toID = (name) => {
  return name.replaceAll(/[^a-zA-Z0-9\s]+/g, "").replaceAll(/\s+/g, "-").toLowerCase();
};
var Companion = _Companion;

// src/companions/auto-companion.ts
var AutoCompanion = class _AutoCompanion extends Companion {
  constructor(configuration, drama) {
    super(configuration);
    this.decorators = [];
    this.evaluateReplyTrigger = (replyTrigger, context, sender) => {
      if (replyTrigger == void 0) return sender == void 0;
      if (typeof replyTrigger == "string")
        return replyTrigger == "*" || // fallback reply
        context.action == replyTrigger || // filter for action
        sender != void 0 && replyTrigger.search(sender.id) > 0;
      if (replyTrigger instanceof _AutoCompanion) return sender != void 0 && replyTrigger.id == sender.id;
      if (typeof replyTrigger == "function") return replyTrigger(context, sender);
      if (typeof replyTrigger == "number") return Math.random() <= replyTrigger;
      return replyTrigger.reduce((previousValue, currentValue) => previousValue || this.evaluateReplyTrigger(currentValue, context, sender), false);
    };
    this.registerReply = (trigger, replyFunction, front = false) => {
      if (front) {
        this.replyFunctions = [{ trigger, replyFunction }, ...this.replyFunctions];
      } else {
        this.replyFunctions.push({ trigger, replyFunction });
      }
    };
    this.generateReply = async (chat, context, sender) => {
      for (const replyFunction of this.replyFunctions) {
        if (this.evaluateReplyTrigger(replyFunction.trigger, context, sender)) {
          const [final, newContext] = await replyFunction.replyFunction(chat, context, this, sender);
          if (final) {
            return newContext || context;
          } else {
            if (newContext)
              context = newContext;
          }
        }
      }
      return context;
    };
    this.getModelConfig = (drama) => {
      return { ...drama.defaultModelConfig, ...this.configuration.modelConfig };
    };
    this.runInference = async (chat, context, recipient, sender) => {
      const deputyDecorators = context && sender && sender?.decorators;
      const newContext = context || new Context(this, chat.companions, chat.id, chat.situation, []);
      const input = chat.drama.getInput(this, chat.history, context, deputyDecorators);
      const job = {
        id: "internal",
        remoteID: "",
        status: "new",
        modelConfig: this.getModelConfig(chat.drama),
        prompt: typeof input === "string" ? input : void 0,
        messages: typeof input !== "string" ? input : void 0,
        context: newContext,
        timeStamp: Date.now()
      };
      const jobResponse = await chat.drama.runJob(job);
      if (jobResponse && jobResponse.response) {
        job.context.message = jobResponse.response;
        return [true, job.context];
      }
      return [false, job.context];
    };
    this.drama = drama;
    this.replyFunctions = [];
    return this;
  }
};

// src/companions/deputy.ts
var Deputy = class extends AutoCompanion {
  /**
   * Creates an instance of Deputy. Deputies can use a different prompter than companions in the chat.
   * @date 11/01/2024 - 14:45:47
   *
   * @constructor
   * @param {CompanionConfig} configuration
   * @param {?Prompter} [prompter]
   */
  constructor(configuration, drama) {
    super(configuration, drama);
    this.wantsToSummarise = (context, sender) => {
      const document = context.query();
      return document != void 0 && document.trim().length >= 2e3;
    };
    this.newDeputyJob = (input, context, situation, modelConfig) => {
      const newContext = context || new Context(this, [], "", situation || "deputy", []);
      const inputData = { prompt: typeof input === "string" ? input : void 0, messages: typeof input !== "string" ? input : void 0 };
      const job = {
        id: "internal",
        remoteID: "",
        status: "new",
        modelConfig,
        context: newContext,
        timeStamp: Date.now(),
        ...inputData
      };
      return job;
    };
    // return "true" (== finished) if no selection
    this.checkForSelection = async (chat, context, recipient, sender) => {
      const document = context.query();
      context.error = "Not enough context";
      return [document == void 0 || document.length == 0, context];
    };
    this.pickRandomParagraph = async (chat, context, recipient, sender) => {
      logger.debug("pickRandomParagraph", context);
      const document = context.query();
      if (!document) return [false, void 0];
      context.text = getRandomParagraph(document);
      context.paragraph = void 0;
      context.input = void 0;
      return [false, context];
    };
    this.pickLastParagraph = async (chat, context, recipient, sender) => {
      logger.debug("pickLastParagraph", context);
      const document = context.query();
      if (!document) return [false, void 0];
      context.text = getLastParagraph(document);
      context.paragraph = void 0;
      context.input = void 0;
      return [false, context];
    };
    this.pickLastSentence = async (chat, context, recipient, sender) => {
      logger.debug("pickLastSentence", context);
      const document = context.query();
      if (!document) return [false, void 0];
      context.text = getLastSentence(document);
      context.paragraph = void 0;
      context.input = void 0;
      return [false, context];
    };
    /*
    		4 characters / token
    		32k tokens -> 120k characters
    
    		5.44 characters / word
    		1,800 characters / page => 450 tokens / page
    	*/
    this.summariseDocumentInference = async (chat, context, recipient, sender) => {
      const document = context.query();
      if (!document) return [false, void 0];
      let trimmedDocument = cleanText(document.trim());
      if (trimmedDocument.length < 2e3) {
        return [false, context];
      }
      if (trimmedDocument.length > 1e5) {
        const documentSize = trimmedDocument.length;
        const shorter = trimmedDocument.substring(0, findCut(trimmedDocument, 3e4)) + "\n\n" + trimmedDocument.substring(findCut(trimmedDocument, documentSize / 2 - 3e4 / 2), findCut(trimmedDocument, documentSize / 2 + 3e4 / 2)) + "\n\n" + trimmedDocument.substring(findCut(trimmedDocument, documentSize - 3e4));
        trimmedDocument = shorter;
        logger.debug("Gigantic document cut down from " + documentSize + " to " + trimmedDocument.length + " characters before summary.");
      }
      const tempContext = new Context(this, [], "", context.situation, [
        { type: "job", data: "Read the following document and reply with a one page summary." },
        { type: "action", data: "SUMMARISE_DOCUMENT" }
      ]);
      const input = chat.drama.prompter.assemblePrompt(
        this,
        chat.drama.worldState,
        { ...tempContext, input: trimmedDocument },
        void 0,
        void 0,
        largeContextModelConfig.extra.promptConfig,
        trimmedDocument.length > 3e4 ? largeContextModelConfig.extra.template : void 0,
        this.drama.chatMode
      );
      const job = this.newDeputyJob(input, tempContext);
      if (trimmedDocument.length > 3e4) {
        job.modelConfig = largeContextModelConfig;
        logger.debug("Using large model");
      }
      try {
        const jobResponse = await chat.drama.runJob(job);
        context.text = jobResponse.response;
        context.paragraph = void 0;
        context.input = void 0;
        return [false, context];
      } catch (e) {
        logger.error(e);
        return [true, void 0];
      }
    };
    switch (configuration.scope) {
      case "screen":
      case "some":
        this.registerReply("*", this.checkForSelection);
      case "document":
        this.registerReply(this.wantsToSummarise, this.summariseDocumentInference, true);
        break;
      case "random_paragraph":
        this.registerReply("*", this.pickRandomParagraph, true);
        break;
      case "last_paragraph":
        this.registerReply("*", this.pickLastParagraph, true);
        break;
      case "last_sentence":
        this.registerReply("*", this.pickLastSentence, true);
        break;
      default:
        break;
    }
    return this;
  }
};

// src/companions/moderator-deputy.ts
var _ModeratorDeputy = class _ModeratorDeputy extends Deputy {
  constructor(configuration = _ModeratorDeputy.config, drama) {
    super(configuration, drama);
    this.runAction = async (chat, context, recipient, sender) => {
      return [false, void 0];
    };
    /**
     * Prologue before pick speaker prompt.
     * @date 12/01/2024 - 12:51:23
     */
    this.selectSpeakerPrologue = (chat, speakers, username) => {
      const promptPrefix = `
You are a moderator in an online chatroom. You are provided with a list of online users with their bios under ## ROLES ##. In addition, you have access to their conversation history under ## CONVERSATION ## where you can find the previous exchanges between different users.

Your task is to read the history in ## CONVERSATION ## and then select which of the ## ROLES ## should speak next. You MUST only return a single name as your response.
`;
      const promptRoles = `
## ROLES ##

${speakers.filter((c) => c.configuration.kind == "npc").map((c) => c.configuration.name + ": " + c.configuration.description).join("\n")}
${username}: A guest user in the chatroom.

## END OF ROLES ##

## CONVERSATION ##
`;
      return promptPrefix + promptRoles;
    };
    /**
     * Use the speakerSelection to pick the next speaker(s)
     * @date 12/01/2024 - 12:51:23
     *
     * @async
     */
    this.selectSpeakers = async (chat, context, lastSpeaker, except, messages) => {
      const companions = chat.companions;
      if (companions.length == 1) return [companions[0]];
      logger.debug("In speaker selection");
      const nextSpeaker = context.recipient;
      if (nextSpeaker) {
        const deputy = context.findDelegate(nextSpeaker.configuration, chat.drama.companions);
        if (deputy) return [nextSpeaker, deputy];
      }
      if (nextSpeaker) return [nextSpeaker];
      if (lastSpeaker == void 0 && chat.history.length > 0) {
        lastSpeaker = chat.history.sort((l, r) => l.timeStamp - r.timeStamp)[chat.history.length - 1].companion;
      }
      const allowedSpeakers = (except == void 0 ? companions : companions.filter((c) => except.find((e) => e.id == c.id) == void 0)).filter((c) => c.configuration.kind != "shell");
      const speakers = chat.allowRepeatSpeaker || lastSpeaker == void 0 ? allowedSpeakers : allowedSpeakers.filter((c) => lastSpeaker != void 0 && c.id != lastSpeaker.id);
      const you = chat.companions.find((c) => c.configuration.kind == "user");
      logger.debug("lastSpeaker: ", lastSpeaker);
      logger.debug("allowedSpeakers: ", speakers);
      if (speakers.length == 1)
        return [speakers[0]];
      if (chat.history.length > 0) {
        const mentionedSpeakers = chat.mentionedCompanions(chat.history[chat.history.length - 1].message).filter((m) => speakers.includes(m));
        if (mentionedSpeakers.length > 0) {
          logger.debug("mentionedSpeakers: ", mentionedSpeakers);
          return lastSpeaker && !mentionedSpeakers.includes(lastSpeaker) ? [lastSpeaker, ...mentionedSpeakers] : mentionedSpeakers;
        }
      }
      const selectedSpeaker = chat.speakerSelection == "round_robin" && lastSpeaker ? chat.nextCompanion(lastSpeaker, speakers.filter((s) => s.configuration.kind == "npc")) : chat.speakerSelection == "random" ? getRandomElement(speakers) : void 0;
      logger.debug("speakerSelection: " + chat.speakerSelection);
      selectedSpeaker && logger.debug("Next speaker: " + selectedSpeaker?.id);
      if (selectedSpeaker) return [selectedSpeaker];
      if (!messages) return [getRandomElement(speakers)];
      const username = chat.drama.worldState.find((w) => w.key == "USERNAME")?.value || "user";
      const chatHistory = messages.filter((m) => m.companion.configuration.kind != "shell").slice(-8).map((m) => m.companion.id == "you" ? username + ": " + m.message.trim() : m.companion.configuration.name + ": " + m.message.trim()).join("\n");
      const newContext = new Context(this, [], "", chat.situation, [
        { type: "persona", data: this.selectSpeakerPrologue(chat, speakers, username) },
        { type: "chat", data: chatHistory },
        { type: "action", data: "SELECT_SPEAKER" },
        { type: "epilogue", data: "\n## END OF CONVERSATION ##" }
      ]);
      const input = chat.drama.prompter.assemblePrompt(
        this,
        chat.drama.worldState,
        newContext,
        void 0,
        void 0,
        void 0,
        void 0,
        this.drama.chatMode
      );
      const job = this.newDeputyJob(input, newContext, void 0, this.getModelConfig(chat.drama));
      try {
        const jobResponse = await chat.drama.runJob(job);
        if (jobResponse && jobResponse.response) {
          const mentionedCompanions = chat.mentionedCompanions(jobResponse.response);
          mentionedCompanions.length > 0 ? logger.debug("Auto speakers: " + mentionedCompanions.map((c) => c.configuration.name).join(", ")) : logger.debug("Auto speakers response: " + jobResponse.response);
          const allowedMentioned = mentionedCompanions.filter((c) => speakers.includes(c));
          if (allowedMentioned.length >= 1) return allowedMentioned.reverse();
        }
      } catch (e) {
        logger.error(e);
      }
      return [getRandomElement(speakers)];
    };
    return this;
  }
};
_ModeratorDeputy.config = {
  name: "JeanLuc",
  class: _ModeratorDeputy,
  description: "This is an internal bot for instruction-based inferences.",
  base_prompt: "",
  kind: "shell",
  modelConfig: {
    temperature: 0
  }
};
var ModeratorDeputy = _ModeratorDeputy;

// src/chat.ts
var Chat = class {
  /**
   * Creates an instance of Chat.
   * @date 12/01/2024 - 12:51:23
   *
   * @constructor
   * @param {Drama} drama
   * @param {string} id
   * @param {string} [situation="fireplace"]
   * @param {AutoCompanion[]} companions
   * @param {number} [maxRounds=8]
   * @param {ChatSpeakerSelection} [speakerSelection="random"]
   */
  constructor(drama, id, situation = "fireplace", companions, maxRounds = 8, speakerSelection = "random") {
    /**
     * Determines whether a speaker can be selected twice in a row.
     * @type {boolean}
     */
    this.allowRepeatSpeaker = false;
    /**
     * Create all deputies that the companions reference in actions
     * @date 17/01/2024 - 10:25:19
     */
    this.createDeputies = () => {
      this.companions.filter((c) => c.configuration.kind == "npc").forEach((c) => c.configuration.actions?.forEach((a) => {
        const deputy = this.drama.companions.find((c2) => c2.id == a.deputy);
        if (!deputy) {
          logger.error("Error: Can't find deputy: " + a.deputy);
          return;
        }
        if (!this.companions.includes(deputy)) {
          this.companions.push(deputy);
        }
      }));
    };
    /**
     * Delete all messages in this chat.
     * @date 12/01/2024 - 12:51:23
     */
    this.clearMessages = () => {
      this.history = [];
    };
    /**
     * Add a message.
     * @date 12/01/2024 - 12:51:23
     */
    this.appendMessage = (companion, message, context) => {
      logger.debug(companion.id + ": " + message);
      const appendedMessage = { companion, message, timeStamp: Date.now(), context: context ? { ...context } : void 0 };
      this.history.push(appendedMessage);
      companion.interactions++;
      return appendedMessage;
    };
    /**
     * Add a message.
     * @date 12/01/2024 - 12:51:23
     */
    this.moderatorMessage = (message, context) => {
      const appendedMessage = { companion: this.moderator, message, timeStamp: Date.now(), context: context ? { ...context } : void 0 };
      this.history.push(appendedMessage);
      return appendedMessage;
    };
    /**
     * Get the last message (or undefined if there is none)
     * @date 12/01/2024 - 12:51:23
     */
    this.lastMessage = () => {
      return this.history.length > 0 ? this.history[this.history.length - 1] : void 0;
    };
    /**
     * Selected the next companion in a list.
     * @date 12/01/2024 - 12:51:23
     */
    this.nextCompanion = (companion, companions) => {
      const index = this.companions.findIndex((c) => c.id == companion.id);
      if (companions == this.companions) {
        return companions[(index + 1) % companions.length];
      }
      const offset = index + 1;
      for (let i = 0; i < companions.length; ++i) {
        if (companions.includes(this.companions[(offset + i) % this.companions.length]))
          return this.companions[(offset + i) % this.companions.length];
      }
      return companion;
    };
    /**
     * Return a list of all mentioned companions.
     * @date 12/01/2024 - 12:51:23
     */
    this.mentionedCompanions = (text) => {
      return this.companions.filter((c) => c.configuration.kind == "npc" && (text.includes(c.id) || text.includes(c.configuration.name)));
    };
    /**
     * Return the companion object representing the user.
     * @date 12/01/2024 - 12:51:23
     * @returns {AutoCompanion}
     */
    this.userCompanion = () => this.companions.find((c) => c.configuration.kind == "user");
    /**
     * Use the value in speakerSelection to pick the next speaker(s). Executed in the moderator deputy.
     * "auto": Use an inference to pick the right next speaker(s)
     * "random": Pick a random next speaker.
     * "round_robin"; Pick the next speaker in the list.
     * Falls back to "random" if the specified selection does not yield a valid result.
     *
     * @date 17/01/2024 - 13:39:19
     *
     * @async
     * @param {AutoCompanion?} lastSpeaker The last speaker (who will not speak again unless allowRepeatSpeaker is true).
     * @param {Companion[]?} except Prevent the system from picking from this list.
     * @returns {AutoCompanion[]}
     */
    this.selectSpeakers = async (context, lastSpeaker, except) => {
      return await this.moderator.selectSpeakers(this, context, lastSpeaker, except, this.history);
    };
    this.id = id;
    this.situation = situation;
    this.drama = drama;
    this.companions = companions;
    this.maxRounds = maxRounds;
    this.speakerSelection = speakerSelection;
    this.history = [];
    this.moderator = new ModeratorDeputy(ModeratorDeputy.config, drama);
    this.createDeputies();
    return this;
  }
};

// src/companions/chat-companion.ts
var ChatCompanion = class extends AutoCompanion {
  constructor(configuration, drama) {
    super(configuration, drama);
    this.replyFunctions.push({ trigger: "*", replyFunction: this.runInference });
    return this;
  }
  // moodChange = async (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion): Promise<CompanionReply> => {
  // 	if (this.mood.label != "neutral")
  // 		context.mood = this.mood.prompt;
  // 	return [false, context];
  // }
};

// src/companions/instruction-deputy.ts
var _InstructionDeputy = class _InstructionDeputy extends Deputy {
  constructor(configuration = _InstructionDeputy.config, drama) {
    super(configuration, drama);
    this.runAction = async (chat, context, recipient, sender) => {
      const input = context.query();
      if (!input || input.length < 5) {
        context.job = "Explain your purpose to the user and that the user has to select some text before you can do your job.";
        return [true, context];
      }
      context.job = this.configuration.job;
      return [true, context];
    };
    this.replyFunctions.push({ trigger: "*", replyFunction: this.runAction });
    return this;
  }
};
_InstructionDeputy.config = {
  name: "Barclay",
  class: _InstructionDeputy,
  description: "This deputy sets a job for the companion to act out.",
  base_prompt: "",
  kind: "shell",
  modelConfig: {
    temperature: 0
  }
};
var InstructionDeputy = _InstructionDeputy;

// src/companions/test-deputy.ts
var _TestDeputy = class _TestDeputy extends Deputy {
  constructor(configuration = _TestDeputy.config, drama) {
    super(configuration, drama);
    this.runAction = async (chat, context, recipient, sender) => {
      logger.debug("TEST DELEGATE CONTEXT", context);
      return [true, context];
    };
    this.replyFunctions.push({ trigger: "*", replyFunction: this.runAction });
    return this;
  }
};
_TestDeputy.config = {
  name: "Kirk",
  class: _TestDeputy,
  description: "Just for testing",
  base_prompt: "",
  kind: "shell",
  modelConfig: {
    temperature: 0
  }
};
var TestDeputy = _TestDeputy;

// src/db/in-memory-database.ts
var InMemoryDatabase = class {
  constructor() {
    this.companions = [];
    this.worldState = {};
    this.promptEntries = [];
    this.chatEntries = {};
  }
  async reset() {
    this.companions = [];
    this.worldState = {};
    this.promptEntries = [];
    this.chatEntries = {};
  }
  async initCompanionStats(companions) {
    this.companions = companions;
  }
  async world() {
    return Object.entries(this.worldState).map(([key, value]) => ({ key, value }));
  }
  async setWorldStateEntry(key, value) {
    this.worldState[key] = value;
  }
  async prompts() {
    return this.promptEntries;
  }
  async addPromptEntry(record) {
    this.promptEntries.push(record);
  }
  async chats() {
    return Object.values(this.chatEntries);
  }
  async getChat(chatID) {
    return this.chatEntries[chatID];
  }
  async deleteChat(chatID) {
    delete this.chatEntries[chatID];
  }
  async writeChat(id, history) {
    this.chatEntries[id] = {
      id,
      history: history.filter((h) => h.companion.configuration.kind == "npc" || h.companion.configuration.kind == "user").map((h) => {
        return { companion: h.companion.configuration.name, message: h.message, timeStamp: h.timeStamp };
      })
    };
    return id;
  }
  async overwriteChats(items) {
    this.chatEntries[items.id] = items;
    return items.id;
  }
};

// src/drama.ts
import { v4 as uuidv4 } from "uuid";

// src/model.ts
var ModelError = class _ModelError extends Error {
  constructor(msg, reason, job, jobResponse, error) {
    super(msg);
    this.reason = reason;
    this.job = job;
    this.jobResponse = jobResponse;
    this.error = error;
    Object.setPrototypeOf(this, _ModelError.prototype);
  }
};
var Model = class {
  // promptTemplate: PromptTemplate = this.modelConfig.extra.template;
  // promptConfig: PromptConfig = this.modelConfig.extra.promptConfig;
  /**
   * Creates an instance of Model.
   * @param {string}
   * @memberof Model
   */
  constructor(path, modelConfig = defaultModelConfig) {
    /**
     * All tokens sent to the model
     *
     * @type {number}
     * @memberof Model
     */
    this.inputTokens = 0;
    /**
     * All tokens received from the model
     *
     * @type {number}
     * @memberof Model
     */
    this.outputTokens = 0;
    /**
     * Accumulated runtime
     *
     * @type {number}
     * @memberof Model
     */
    this.runtime = 0;
    this.jsonToJobResponse = (jsonResponse) => {
      try {
        const jobResponse = {
          id: jsonResponse.id,
          // job_id
          response: jsonResponse.response || jsonResponse.choices[0]?.text || jsonResponse.choices[0]?.message?.content,
          // generated text - change this if n > 1 in inference params
          input_tokens: jsonResponse.usage?.prompt_tokens,
          // runtime of the request
          output_tokens: jsonResponse.usage?.completion_tokens
          // runtime of the request
          /** The following properties are unavailable in OpenAI-compatible response schema */
          // status: jsonResponse.data?.status, // job status
          // error: !jsonResponse.status ? jsonResponse.detail : false, // API-response status or a detail
          // runtime: jsonResponse.runtime, // runtime of the request
        };
        return jobResponse;
      } catch (error) {
        logger.error("Error parsing JSON:", error);
        throw new Error("JSON Parsing error.");
      }
    };
    /**
     * Builds a complete response object from an event-stream response.
     *
     * Useful, when streaming directly to user-facing components is not available.
     *
     * Waits for the streaming response to end and builds a response object that is the same
     * as the response object when not streaming i.e., json response.
     *
     * @private
     * @param {Response} response
     * @memberof Model
     */
    this.buildResponseFromStream = async (response) => {
      let buffer = "";
      let completeResponse = [];
      let completedData = null;
      const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader();
      if (!reader) {
        throw new Error("Response body is unreadable or cannot be decoded as text.");
      }
      ;
      while (true) {
        let dataDone = false;
        const { done, value } = await reader.read();
        if (done || dataDone) {
          if (completedData) {
            completedData.response = completeResponse.join("");
            return completedData;
          }
          throw new Error("Error in response stream or incomplete stream received.");
        }
        buffer += value;
        const lines = buffer.split("\n");
        lines.forEach((data) => {
          const line = data.trim();
          if (!line) return;
          if (!line.startsWith("data:")) return;
          if (line === "data: [DONE]") return;
          const dataMessage = line.substring(5).trim();
          logger.debug(`Data: ${dataMessage}
`);
          try {
            const dataObject = JSON.parse(dataMessage);
            completedData = dataObject;
            const responseChunk = dataObject.choices[0]?.text || dataObject.choices[0]?.delta?.content || "";
            completeResponse.push(responseChunk);
            buffer = "";
          } catch (error) {
            logger.debug("Received non-JSON stream chunk:", line);
          }
        });
      }
    };
    this.processPOSTResponse = async (response) => {
      let jsonResponse;
      const contentType = response.headers.get("content-type");
      const responseIsStream = contentType && contentType.includes("text/event-stream");
      logger.debug("Response is of type " + contentType);
      if (!responseIsStream) {
        jsonResponse = await response.json();
      } else {
        jsonResponse = await this.buildResponseFromStream(response);
      }
      const dataObject = this.jsonToJobResponse(jsonResponse);
      return dataObject;
    };
    this.constructUrl = (url) => {
      const baseUrl = process.env.DE_BASE_URL || process.env.NEXT_PUBLIC_DE_BASE_URL || "";
      const newUrl = (baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl) + "/" + (url.startsWith("/") ? url.slice(1) : url);
      return newUrl;
    };
    this.postRequest = async (url, requestData, headers = new Headers()) => {
      return fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestData)
      });
    };
    /**
     * Call this function to run a job. Returns a job response and updates the local db.
     *
     * @param {Job} job
     * @memberof Model
     */
    this.runJob = async (job, httpClient = this.postRequest) => {
      let jobResponse = void 0;
      const presetAction = job.context.action;
      if (!(job.prompt || job.messages)) throw new ModelError("Can not run inference", "No prompt or messages array found.", job);
      const postData = {
        prompt: job.prompt,
        messages: job.messages,
        preset: presetAction,
        chat_id: job.context.chatID,
        situation_id: job.context.situation,
        interaction_id: job.context.interactionID,
        ...job.modelConfig || this.modelConfig
        // job can override parameters
      };
      delete postData["extra"];
      const newUrl = this.constructUrl(this.path);
      const newHeaders = this.addHeaders();
      return httpClient(newUrl, postData, newHeaders).then(async (res) => {
        jobResponse = await this.processPOSTResponse(res);
        jobResponse.input_tokens && (this.inputTokens += jobResponse.input_tokens);
        jobResponse.output_tokens && (this.outputTokens += jobResponse.output_tokens);
        if (!jobResponse.id) {
          throw new Error("Job ID not found!");
        }
        return jobResponse;
      }).catch((e) => {
        logger.error(e);
        throw new ModelError("Job failed!", "Invalid response.", job, void 0, e instanceof Error ? e : void 0);
      });
    };
    this.modelConfig = modelConfig;
    this.path = path.startsWith("/") ? path.slice(1) : path;
    return this;
  }
  get promptTemplate() {
    return this.modelConfig.extra.template;
  }
  get promptConfig() {
    return this.modelConfig.extra.promptConfig;
  }
  isAuthTokenAvailable(headers) {
    if (headers) {
      const newHeaders = new Headers(headers);
      const authHeaderExists = (newHeaders?.get("authorization")?.length || 0) > 0;
      const apiKeyHeaderExists = (newHeaders?.get("x-api-key")?.length || 0) > 0;
      const authTokenHeaderExists = (newHeaders?.get("x-auth-token")?.length || 0) > 0;
      return authHeaderExists || apiKeyHeaderExists || authTokenHeaderExists;
    }
    return false;
  }
  addHeaders(headers) {
    const newHeaders = new Headers(headers);
    newHeaders.append("Accept", "application/json, text/event-stream");
    newHeaders.append("Content-Type", "application/json");
    const authTokenAvailable = this.isAuthTokenAvailable(newHeaders);
    if (!authTokenAvailable) {
      let apiKey = process.env.DE_BACKEND_API_KEY;
      if (!apiKey) {
        apiKey = process.env.NEXT_PUBLIC_DE_BACKEND_API_KEY;
        if (apiKey) {
          logger.warn("API key was found in a publicly exposed variable, `NEXT_PUBLIC_DE_BACKEND_API_KEY`. Ensure this was intended behaviour.");
        } else {
          logger.warn("No API keys were found. Checked the following headers: Authorization, X-API-KEY, X-Auth-Token. And the following variables: DE_BACKEND_API_KEY, NEXT_PUBLIC_DE_BACKEND_API_KEY. Ensure this was intended behaviour.");
        }
      }
      if (apiKey) {
        newHeaders.set("Authorization", `Bearer ${apiKey}`);
      }
    }
    return newHeaders;
  }
};

// src/prompter.ts
import { Template } from "@huggingface/jinja";

// src/utils/time-utils.ts
var unixTimestampToDate = (timestamp) => {
  const options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  };
  let dt = new Date(timestamp).toLocaleDateString("default", options);
  return dt;
};

// src/prompter.ts
var Prompt = class {
  constructor(basePrompt) {
    this.append = (data, separator = "\n") => {
      data && (this.prompt = this.prompt + separator + data);
      return this;
    };
    this.prompt = basePrompt;
    return this;
  }
};
var Prompter = class {
  /**
   * Creates an instance of Prompter.
   * @param {PromptTemplate} config
   * @memberof Prompter
   */
  constructor(config) {
    /**
     * Decorate the prompt using data.
     *
     * @private
     * @param {ContextDataTypes} type
     * @param {string} [text]
     * @param {ContextDecorator[]} [decorators]
     * @memberof Prompter
     */
    this.decorate = (type, text, decorators) => {
      if (!text || !decorators) return void 0;
      const decorator = decorators.find((d) => d.type == type);
      return decorator && decorator.replacement.replace("{{DATA}}", text);
    };
    /**
     * Clean the string
     *
     * @private
     * @param {string} text
     * @memberof Prompter
     */
    this.sanitize = (text) => {
      return text.replace(/<.*>/gi, "").trim();
    };
    /**
     * Use jinja to render the prompt using the current configuration and template.
     *
     * @param {string} speaker
     * @param {{ role: string, content: string }[]} chat
     * @param {Template} [template=this.template]
     * @memberof Prompter
     */
    this.renderPrompt = (speaker, chat, template = this.template) => {
      const result = template.render({
        messages: chat,
        bos_token: this.config.bos_token,
        eos_token: this.config.eos_token,
        speaker
      });
      if (true) {
        logger.debug("Prompt: ", result);
      }
      return result;
    };
    /**
     * Assemble the prompt for one inference using the supplied data and world state.
     *
     * @param {Companion} companion
     * @param {KeyValueRecord[]} worldState
     * @param {Context} context
     * @param {ChatMessage[]} [history]
     * @param {ContextDecorator[]} [decorators=[]]
     * @param {PromptConfig} [config=defaultPromptConfig]
     * @param {PromptTemplate} [promptTemplate]
     * @param {returnChat} [returnChat]
     */
    this.assemblePrompt = (companion, worldState, context, history, decorators = [], config = defaultPromptConfig, promptTemplate, returnChat = false) => {
      let tags = [];
      companion.configuration.knowledge && companion.configuration.knowledge.filter((knowledge) => knowledge.condition && evaluateCondition(knowledge.condition, worldState)).forEach((knowledge) => tags.push(getRandomElement(knowledge.lines)));
      const allDecorators = defaultDecorators.concat(decorators);
      const questionData = this.decorate("question", context.question, allDecorators);
      const personaData = this.decorate("persona", context.persona, allDecorators);
      const jobData = config.job_in_chat ? void 0 : this.decorate("job", context.job, allDecorators);
      const answerData = this.decorate("answer", context.answer, allDecorators);
      const messageData = this.decorate("message", context.message, allDecorators);
      const quoteData = this.decorate("quote", context.quote, allDecorators);
      const epilogueData = this.decorate("epilogue", context.epilogue, allDecorators);
      const chatData = this.decorate("chat", context.chat, allDecorators);
      const textData = this.decorate("text", context.text, allDecorators);
      const paragraphData = this.decorate("paragraph", context.paragraph, allDecorators);
      const inputData = textData || paragraphData || this.decorate("text", context.input, allDecorators);
      ;
      logger.debug("context", { ...context });
      logger.debug("input data", context.query()?.substring(0, 250));
      const moodData = companion.mood.prompt;
      const otherCompanions = context.companions.filter((c) => c.configuration.kind != "shell" && c.id != companion.id).map((c) => c.configuration.description);
      const companionList = otherCompanions && otherCompanions.join("\n");
      const isAction = context.action != void 0;
      const knowledgeData = isAction ? void 0 : this.decorate("knowledge", tags.join("\n"), allDecorators);
      const situationData = isAction ? void 0 : companion.configuration.situations?.find((s) => s.id == context.situation)?.prompt;
      const companionData = isAction ? void 0 : companionList && this.decorate("companionNames", companionList, allDecorators);
      const currentTimeData = isAction ? void 0 : "It is currently " + unixTimestampToDate(Date.now());
      const system_prompt = new Prompt("").append(companion.getBasePrompt()).append(personaData || situationData).append(currentTimeData).append(companionData).append(knowledgeData).append(moodData).append(jobData).append(inputData).append(messageData).append(answerData).append(questionData).append(quoteData).append(chatData).append(epilogueData);
      const chat = [];
      let cutoff = 0;
      if (history && history.length > 0 && !answerData && !epilogueData && !jobData && !chatData) {
        const username = worldState.find((w) => w.key == "USERNAME")?.value;
        history.filter((m) => m.companion.configuration.kind != "shell").forEach((line) => chat.push(
          {
            role: line.companion.id == "you" ? !returnChat && username && typeof username == "string" ? username : "user" : line.companion.id == companion.id ? "assistant" : !returnChat ? line.companion.configuration.name : "user",
            content: this.sanitize(line.message)
          }
        ));
        let budget = config.max_prompt_length - system_prompt.prompt.length - 255;
        chat.reverse().every((entry, index) => {
          budget -= entry.content.length + entry.role.length + 6;
          if (budget < 0) {
            cutoff = index;
            return false;
          }
          return true;
        });
      }
      const start = 0;
      const end = cutoff !== 0 ? cutoff : history?.length;
      const cleaned_chat = [{ role: config.system_role_allowed ? "system" : "user", content: this.sanitize(system_prompt.prompt) }, ...chat.slice(start, end).reverse()];
      const job = context.job;
      if (config.job_in_chat && job) {
        cleaned_chat.push({ role: "user", content: this.sanitize(job) });
      }
      if (returnChat) {
        return cleaned_chat;
      }
      const name = "assistant";
      let template = promptTemplate?.chat_template || companion.configuration.modelConfig?.extra?.template?.chat_template;
      return this.renderPrompt(name, cleaned_chat, template ? new Template(template) : void 0);
    };
    this.template = new Template(config.chat_template);
    this.config = config;
  }
};

// src/drama.ts
var Drama = class _Drama {
  constructor(companionConfigs, database, worldState, defaultModel, defaultSummaryModel, chatModeOverride, httpClient) {
    this.companions = [];
    this.worldState = [];
    this.jobs = [];
    this.chats = [];
    // static async initialize(
    // 	defaultSituation: string,
    // 	companionConfigs: CompanionConfig[],
    // 	defaultModel: ModelConfig = defaultModelConfig,
    // 	database: Database = new InMemoryDatabase(),
    // 	chatModeOverride?: boolean,
    // 	httpClient?: any,
    // ) {
    // 	return this.initializeEngine(defaultSituation, companionConfigs, database, {
    // 		defaultModel,
    // 		summaryModel: largeContextModelConfig,
    // 		chatModeOverride,
    // 		httpClient
    // 	})
    // }
    this.reset = async () => {
      logger.info("DRAMA ENGINE // RESET");
      this.jobs = [];
      await this.database.reset();
      await this.database.initCompanionStats(this.companions);
    };
    /* WORLD STATE MANAGEMENT */
    this.increaseWorldStateEntry = async (key, value) => {
      const ws = this.worldState.find((s) => s.key == key);
      if (ws) {
        ws.value = ws.value + value;
      } else {
        this.worldState.push({ key, value });
      }
      await this.database.setWorldStateEntry(key, ws?.value || value);
    };
    this.setWorldStateEntry = async (key, value) => {
      const ws = this.worldState.find((s) => s.key == key);
      if (ws) {
        ws.value = value;
      } else {
        this.worldState.push({ key, value });
      }
      await this.database.setWorldStateEntry(key, value);
    };
    this.getWorldStateValue = (key) => {
      return this.worldState.find((s) => s.key == key)?.value;
    };
    this.logInteraction = (companion) => {
      const cmp = this.companions.find((c) => c.id == companion.id);
      cmp && cmp.interactions++;
    };
    this.logAction = (companion) => {
      const cmp = this.companions.find((c) => c.id == companion.id);
      cmp && cmp.interactions++;
    };
    this.syncInteractions = async () => {
      let allInteractions = 0;
      for (const companion of this.companions) {
        await this.setWorldStateEntry("COMPANION_INTERACTIONS_" + companion.id.toUpperCase(), companion.interactions);
        await this.setWorldStateEntry("COMPANION_ACTIONS_" + companion.id.toUpperCase(), companion.actions);
        allInteractions += companion.interactions;
      }
      await this.setWorldStateEntry("COMPANION_INTERACTIONS", allInteractions);
    };
    this.getActiveActions = () => {
      const q = [];
      this.companions.filter((companion) => companion.configuration.kind == "npc" && companion.configuration.actions).forEach((companion) => {
        if (!companion.configuration.actions) return;
        q.push(
          ...companion.configuration.actions.filter((action) => action.label && (!action.condition || evaluateCondition(action.condition, this.worldState))).map((a) => {
            return { companion, action: a };
          })
        );
      });
      return q;
    };
    /* JOBS */
    this.pushJob = async (context) => {
      const id = uuidv4();
      const job = {
        id,
        status: "new",
        context,
        remoteID: "",
        timeStamp: Date.now()
      };
      logger.debug("new job: ", job);
      this.jobs.push(job);
    };
    this.setJobState = (id, state) => {
      const index = this.jobs.findIndex((j) => j.id == id);
      this.jobs[index] = { ...this.jobs[index], status: state };
    };
    this.setJobRemoteID = (id, remoteID) => {
      const index = this.jobs.findIndex((j) => j.id == id);
      this.jobs[index] = { ...this.jobs[index], remoteID };
    };
    this.getJobsByState = (state) => {
      return this.jobs.filter((j) => j.status == state).sort((l, r) => r.timeStamp - l.timeStamp);
    };
    this.removeJob = (id) => {
      this.jobs = this.jobs.filter((j) => j.id != id);
    };
    /* PROMPT */
    this.getInput = (companion, history, context, decorators = [], config = this.model.promptConfig) => {
      return this.prompter.assemblePrompt(companion, this.worldState, context, history, decorators, config, void 0, this.chatMode);
    };
    /* INFERENCES */
    this.runJob = async (job) => {
      const response = await this.model.runJob(job, this.httpClient);
      response && job.context.addUsage(response);
      logger.debug("runJob", job, "-->", response);
      await this.increaseWorldStateEntry("INPUT_TOKENS", job.context.input_tokens);
      await this.increaseWorldStateEntry("OUTPUT_TOKENS", job.context.output_tokens);
      if (job.context.action && job.context.recipient)
        await this.increaseWorldStateEntry("COMPANION_ACTIONS_" + job.context.recipient.id.toUpperCase(), 1);
      await this.database.addPromptEntry({
        timeStamp: Date.now(),
        prompt: job.prompt || "No prompt found",
        messages: job.messages,
        result: response?.response || "NONE",
        config: JSON.stringify(job.modelConfig)
      });
      return response;
    };
    /* CHATS */
    this.restoreChats = (chatRecords) => {
      chatRecords?.forEach(async (chatRecord) => await this.database.overwriteChats(chatRecord));
      this.chats.forEach(async (chat) => {
        let chatRecord;
        if (chatRecords && chatRecords.length > 0) {
          chatRecord = chatRecords.find((elem) => {
            return elem.id === chat.id;
          });
        } else {
          chatRecord = await this.database.getChat(chat.id);
        }
        if (chatRecord) {
          chat.history = chatRecord.history.map((h) => {
            const companion = this.companions.find((c) => {
              return c.configuration.name.toLowerCase() === h.companion.toLowerCase();
            });
            return {
              ...h,
              companion
            };
          });
        }
      });
    };
    this.getChat = (id) => this.chats.find((c) => c.id == id);
    this.getCompanionChat = (companion) => this.chats.find((c) => c.id == companion.id + "_chat");
    this.addCompanionChat = (companion, situation) => {
      return this.addChat(companion.id + "_chat", situation, [companion.id, "you"], 8, "round_robin");
    };
    this.addChat = (id, situation, companionIDs, maxRounds = 8, speakerSelection = "auto") => {
      const chatCompanions = this.companions.filter((c) => companionIDs.includes(c.id) && (c.configuration.kind == "npc" || c.configuration.kind == "user"));
      const existingChat = this.getChat(id);
      if (existingChat) {
        existingChat.companions = chatCompanions;
        existingChat.maxRounds = maxRounds;
        existingChat.speakerSelection = speakerSelection;
        logger.debug("Reconfiguring existing chat: " + existingChat.id);
        return existingChat;
      }
      const chat = new Chat(this, id, situation, chatCompanions, maxRounds, speakerSelection);
      this.chats.push(chat);
      logger.info("New chat: " + chat.id);
      return chat;
    };
    this.removeChat = (id) => {
      this.chats = this.chats.filter((c) => c.id != id);
      this.database.deleteChat(id);
    };
    this.runConversation = async (chat, rounds, context, lastSpeaker, except, callback) => {
      if (rounds <= 0) return [chat, lastSpeaker, void 0, context];
      const chatLines = chat.history.length;
      const [newChat, newLastSpeaker, newActiveSpeaker, newContext] = await this.runChat(chat, rounds, context, lastSpeaker, except, callback);
      const roundsTaken = newChat.history.length - chatLines;
      if (newActiveSpeaker && newActiveSpeaker.configuration.kind == "user")
        return [newChat, newLastSpeaker, newActiveSpeaker, newContext];
      return await this.runConversation(newChat, rounds - roundsTaken, newContext || context, newLastSpeaker, except, callback);
    };
    this.runChat = async (chat, rounds, context, lastSpeaker, except, callback) => {
      if (chat.currentContext) {
        context.action = chat.currentContext.action;
        context.input = chat.lastMessage()?.message;
        context.question = void 0;
      }
      let activeSpeakers = await chat.selectSpeakers(context, lastSpeaker, except);
      while (activeSpeakers.length && rounds >= 0) {
        const activeSpeaker = activeSpeakers.pop();
        if (activeSpeaker && activeSpeaker.configuration.kind != "user") {
          logger.info("Setting active speaker", activeSpeaker);
          activeSpeaker.status = "active";
          rounds--;
          if (context.action)
            this.logAction(activeSpeaker);
          if (context.quote == void 0) {
            callback && callback(chat, activeSpeaker);
            context = await activeSpeaker.generateReply(chat, context, lastSpeaker);
          }
          const excerpt = context.excerpt;
          const message = context.message;
          const quote = activeSpeaker.configuration.kind != "shell" ? context.quote : void 0;
          const answer = excerpt || message || quote;
          if (answer) {
            const appendedMessage = chat.appendMessage(activeSpeaker, answer, context);
            callback && callback(chat, activeSpeaker, appendedMessage);
            if (excerpt) context.excerpt = void 0;
          }
          activeSpeaker.status = "free";
          lastSpeaker = activeSpeaker;
          if (context.question) chat.currentContext = context;
        } else {
          await this.database.writeChat(chat.id, chat.history);
          await this.syncInteractions();
          context = await this.runTriggers(context, callback);
          return [chat, lastSpeaker, activeSpeaker, context];
        }
      }
      await this.database.writeChat(chat.id, chat.history);
      await this.syncInteractions();
      context = await this.runTriggers(context, callback);
      return [chat, lastSpeaker, void 0, context];
    };
    /* TRIGGERS */
    this.runTriggers = async (context, callback) => {
      for (const companion of this.companions) {
        if (!companion.configuration.triggers) continue;
        for (const trigger of companion.configuration.triggers) {
          if (evaluateCondition(trigger.condition, this.worldState)) {
            if (typeof trigger.action == "string") {
              const companionChat = this.getCompanionChat(companion);
              if (!companionChat) return context;
              if (trigger.condition.tag == "event" && trigger.condition.value && typeof trigger.condition.value == "string") {
                await this.setWorldStateEntry(trigger.condition.value, false);
              }
              context.recipient = companion;
              context.action = trigger.action;
              const result = await this.runChat(companionChat, 5, context, void 0, void 0, callback);
              return result[3] || context;
            } else {
              if (!trigger.effect) continue;
              if (trigger.effect.tag == "event" && trigger.effect.value && typeof trigger.effect.value == "string") {
                await this.setWorldStateEntry(trigger.effect.value, true);
                logger.info("Setting event " + trigger.effect.value + " with condition " + trigger.condition);
              } else if (trigger.effect.tag == "action" && trigger.effect.value && typeof trigger.effect.value == "string") {
                const companionChat = this.getCompanionChat(companion);
                if (!companionChat) return context;
                context.recipient = companion;
                context.action = trigger.effect.value;
                const result = await this.runChat(companionChat, 5, context, void 0, void 0, callback);
                return result[3] || context;
              } else if (typeof trigger.effect.tag == "string" && trigger.effect.value) {
                switch (trigger.action) {
                  case "set":
                    await this.setWorldStateEntry(trigger.effect.tag, trigger.effect.value);
                    break;
                  case "add":
                    if (typeof trigger.effect.value == "number")
                      await this.increaseWorldStateEntry(trigger.effect.tag, trigger.effect.value);
                    else
                      logger.error("Operation '" + trigger.action + "' needs a value in the condition that is number!");
                    break;
                  default:
                    logger.error("Operation '" + trigger.action + "' is not implemented yet!");
                }
              } else {
                logger.error("Triggers with operation '" + trigger.action + "' can only operate on a world state or send an event. Also it needs a value set in the condition.");
              }
            }
          }
        }
      }
      return context;
    };
    this.worldState = worldState;
    const apiEndpoint = process.env.DE_ENDPOINT_URL || process.env.NEXT_PUBLIC_DE_ENDPOINT_URL || "v1/completions";
    this.chatMode = chatModeOverride === void 0 ? apiEndpoint.includes("chat/completions") : chatModeOverride;
    this.model = new Model(apiEndpoint, defaultModel);
    this.prompter = new Prompter(this.model.promptTemplate);
    this.database = database;
    this.companions = companionConfigs.map((c) => new c.class(c, this));
    this.defaultModelConfig = defaultModel || defaultModelConfig;
    this.defaultSummaryModelConfig = defaultSummaryModel || largeContextModelConfig;
    this.httpClient = httpClient;
    logger.info("DRAMA ENGINE // INITIATED");
    return this;
  }
  static async initialize(defaultSituation, companionConfigs, database = new InMemoryDatabase(), options) {
    const worldState = await database.world() || [];
    if (!companionConfigs.find((c) => c.kind == "user"))
      companionConfigs = [
        ...companionConfigs,
        {
          name: "You",
          class: ChatCompanion,
          bio: "The user",
          description: "The user of this app. A person who seeks companionship.",
          base_prompt: "",
          avatar: "/img/avatar-user.jpg",
          kind: "user"
        }
      ];
    const drama = new _Drama(
      companionConfigs,
      database,
      worldState,
      { ...defaultModelConfig, ...options?.defaultModel },
      { ...largeContextModelConfig, ...options?.summaryModel },
      options?.chatModeOverride,
      options?.httpClient
    );
    drama.companions.forEach((companion) => {
      const interactions = worldState.find((w) => w.key == "COMPANION_INTERACTIONS_" + companion.id.toUpperCase());
      if (interactions && typeof interactions.value == "number")
        companion.interactions = interactions.value;
      const actions = worldState.find((w) => w.key == "COMPANION_ACTIONS_" + companion.id.toUpperCase());
      if (actions && typeof actions.value == "number")
        companion.actions = actions.value;
      if (companion.configuration.kind == "npc") {
        if (companion.configuration.moods) {
          let rnd = Math.random();
          const mood = companion.configuration.moods.sort((l, r) => l.probability - r.probability).find((m) => {
            if (rnd - m.probability <= 0) {
              return true;
            } else {
              rnd -= m.probability;
              return false;
            }
          });
          if (mood) {
            companion.mood.label = mood.label;
            companion.mood.prompt = mood.prompt;
          }
        }
        drama.addCompanionChat(companion, defaultSituation);
      }
    });
    return drama;
  }
};
export {
  AutoCompanion,
  Chat,
  ChatCompanion,
  Companion,
  Context,
  Deputy,
  Drama,
  InMemoryDatabase,
  InstructionDeputy,
  Model,
  ModelError,
  TestDeputy,
  defaultModelConfig,
  defaultPromptConfig,
  defaultPromptTemplates,
  getRandomElement,
  randomArrayElement
};
//# sourceMappingURL=index.mjs.map