import { Template } from '@huggingface/jinja';
import { KyInstance, Options } from 'ky';

type CompanionReply = [boolean, Context | undefined];
type ReplyTriggerTypes = undefined | number | AutoCompanion | string | ((context: Context, sender?: AutoCompanion) => boolean);
type ReplyFunctionAsync = (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion) => Promise<CompanionReply>;
declare class AutoCompanion extends Companion {
    protected drama: Drama;
    protected decorators: ContextDecorator[];
    protected replyFunctions: {
        trigger: ReplyTriggerTypes | ReplyTriggerTypes[];
        replyFunction: ReplyFunctionAsync;
    }[];
    constructor(configuration: CompanionConfig, drama: Drama);
    evaluateReplyTrigger: (replyTrigger: ReplyTriggerTypes | ReplyTriggerTypes[], context: Context, sender?: AutoCompanion) => boolean;
    registerReply: (trigger: ReplyTriggerTypes | ReplyTriggerTypes[], replyFunction: ReplyFunctionAsync, front?: boolean) => void;
    generateReply: (chat: Chat, context: Context, sender?: AutoCompanion) => Promise<Context>;
    runInference: (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion) => Promise<CompanionReply>;
}

/**
 * Deputies are agents that companions can use for specific purposes. The user never interacts with a deputy directly.
 * @date 11/01/2024 - 14:45:47
 *
 * @export
 * @class Deputy
 * @typedef {Deputy}
 * @extends {AutoCompanion}
 */
declare abstract class Deputy extends AutoCompanion {
    /**
     * Creates an instance of Deputy. Deputies can use a different prompter than companions in the chat.
     * @date 11/01/2024 - 14:45:47
     *
     * @constructor
     * @param {CompanionConfig} configuration
     * @param {?Prompter} [prompter]
     */
    constructor(configuration: CompanionConfig, drama: Drama);
    wantsToSummarise: (context: Context, sender?: AutoCompanion) => boolean;
    protected abstract runAction(chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion): Promise<CompanionReply>;
    protected newDeputyJob: (prompt: string, context?: Context, situation?: string) => Job;
    private checkForSelection;
    protected pickRandomParagraph: (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion) => Promise<CompanionReply>;
    protected pickLastParagraph: (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion) => Promise<CompanionReply>;
    protected pickLastSentence: (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion) => Promise<CompanionReply>;
    protected summariseDocumentInference: (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion) => Promise<CompanionReply>;
}

declare class ModeratorDeputy extends Deputy {
    static config: CompanionConfig;
    constructor(configuration: CompanionConfig | undefined, drama: Drama);
    protected runAction: (chat: Chat, context: Context, recipient?: AutoCompanion, sender?: AutoCompanion) => Promise<CompanionReply>;
    /**
     * Prologue before pick speaker prompt.
     * @date 12/01/2024 - 12:51:23
     */
    selectSpeakerPrologue: (chat: Chat, speakers: Companion[], username: string) => string;
    /**
     * Use the speakerSelection to pick the next speaker(s)
     * @date 12/01/2024 - 12:51:23
     *
     * @async
     */
    selectSpeakers: (chat: Chat, context: Context, lastSpeaker?: AutoCompanion, except?: Companion[], messages?: ChatMessage[]) => Promise<AutoCompanion[]>;
}

/**
 * Determine how the next speaker is chosen.
 * @export
 * @typedef {ChatSpeakerSelection}
 */
type ChatSpeakerSelection = "auto" | "random" | "round_robin";
/**
 * One entry in a chat history. Often called message
 * @export
 * @typedef {ChatMessage}
 */
type ChatMessage = {
    companion: AutoCompanion;
    message: string;
    timeStamp: number;
    context?: Context;
};
/**
 * The chat class holds one conversation. Chat participants are companions from drama. One chat is one conversation.
 * @export
 * @class Chat
 * @typedef {Chat}
 */
declare class Chat {
    /**
     * A unique id
     * @type {string}
     */
    readonly id: string;
    /**
     * For distinguishing behaviour according to the situation (see CompanionConfig). E.g. "writersroom"
     * @type {string}
     */
    readonly situation: string;
    /**
     * References to all companions in this chat.
     * @type {AutoCompanion[]}
     */
    companions: AutoCompanion[];
    /**
     * The chat should end after this many rounds. Not implemented.
     * @type {number}
     */
    maxRounds: number;
    /**
     * Determines how the next speaker is chosen.
     * @type {ChatSpeakerSelection}
     */
    speakerSelection: ChatSpeakerSelection;
    /**
     * The message history of this chat.
     * @type {ChatMessage[]}
     */
    history: ChatMessage[];
    /**
     * Determines whether a speaker can be selected twice in a row.
     * @type {boolean}
     */
    allowRepeatSpeaker: boolean;
    /**
     * The drama this chat is a part of.
     * @type {Drama}
     */
    readonly drama: Drama;
    /**
     * The chat's moderator.
     * @type {ModeratorDeputy}
     */
    moderator: ModeratorDeputy;
    /**
     * The active context if state has to be preserved
     * @type {(Context | undefined)}
     */
    currentContext: Context | undefined;
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
    constructor(drama: Drama, id: string, situation: string | undefined, companions: AutoCompanion[], maxRounds?: number, speakerSelection?: ChatSpeakerSelection);
    /**
     * Create all deputies that the companions reference in actions
     * @date 17/01/2024 - 10:25:19
     */
    protected createDeputies: () => void;
    /**
     * Delete all messages in this chat.
     * @date 12/01/2024 - 12:51:23
     */
    clearMessages: () => void;
    /**
     * Add a message.
     * @date 12/01/2024 - 12:51:23
     */
    appendMessage: (companion: AutoCompanion, message: string, context?: Context) => {
        companion: AutoCompanion;
        message: string;
        timeStamp: number;
        context: {
            companionNames?: string;
            error?: string;
            conversationID?: string;
            interactionID?: string;
            sequenceID?: string;
            chat?: string;
            knowledge?: string;
            text?: string;
            paragraph?: string;
            epilogue?: string;
            input?: string;
            action?: string;
            persona?: string;
            job?: string;
            mood?: string;
            question?: string;
            answer?: string;
            excerpt?: string;
            quote?: string;
            message?: string;
            tool?: string;
            recipient?: AutoCompanion;
            companions: AutoCompanion[];
            chatID: string;
            situation: string;
            input_tokens: number;
            output_tokens: number;
            runtime: number;
            response_id?: string;
            addUsage: (response: JobResponse) => void;
            findActionConfiguration: (configuration: CompanionConfig) => ActionDescription | undefined;
            findDelegate: (configuration: CompanionConfig, companions: AutoCompanion[]) => AutoCompanion | undefined;
            hasAnswer: () => string | undefined;
            query: () => string | undefined;
        } | undefined;
    };
    /**
     * Add a message.
     * @date 12/01/2024 - 12:51:23
     */
    moderatorMessage: (message: string, context?: Context) => {
        companion: ModeratorDeputy;
        message: string;
        timeStamp: number;
        context: {
            companionNames?: string;
            error?: string;
            conversationID?: string;
            interactionID?: string;
            sequenceID?: string;
            chat?: string;
            knowledge?: string;
            text?: string;
            paragraph?: string;
            epilogue?: string;
            input?: string;
            action?: string;
            persona?: string;
            job?: string;
            mood?: string;
            question?: string;
            answer?: string;
            excerpt?: string;
            quote?: string;
            message?: string;
            tool?: string;
            recipient?: AutoCompanion;
            companions: AutoCompanion[];
            chatID: string;
            situation: string;
            input_tokens: number;
            output_tokens: number;
            runtime: number;
            response_id?: string;
            addUsage: (response: JobResponse) => void;
            findActionConfiguration: (configuration: CompanionConfig) => ActionDescription | undefined;
            findDelegate: (configuration: CompanionConfig, companions: AutoCompanion[]) => AutoCompanion | undefined;
            hasAnswer: () => string | undefined;
            query: () => string | undefined;
        } | undefined;
    };
    /**
     * Get the last message (or undefined if there is none)
     * @date 12/01/2024 - 12:51:23
     */
    lastMessage: () => ChatMessage | undefined;
    /**
     * Selected the next companion in a list.
     * @date 12/01/2024 - 12:51:23
     */
    nextCompanion: (companion: AutoCompanion, companions: AutoCompanion[]) => AutoCompanion;
    /**
     * Return a list of all mentioned companions.
     * @date 12/01/2024 - 12:51:23
     */
    mentionedCompanions: (text: string) => AutoCompanion[];
    /**
     * Return the companion object representing the user.
     * @date 12/01/2024 - 12:51:23
     * @returns {AutoCompanion}
     */
    userCompanion: () => AutoCompanion | undefined;
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
    selectSpeakers: (context: Context, lastSpeaker?: AutoCompanion, except?: Companion[]) => Promise<AutoCompanion[]>;
}

type StateTypes = number | string | boolean;
type KeyValueRecord = {
    key: string;
    value: StateTypes;
};
type HistoryRecord = {
    companion: string;
    message: string;
    timeStamp: number;
};
type ChatRecord = {
    id: string;
    history: HistoryRecord[];
    default?: boolean;
};

/**
 * Tags for kinds of interactions - currently not used
 *
 * @export
 * @enum {number}
 */
declare enum Tag {
    NONE = 0,
    EVENT = 1,
    ACTION = 2
}

declare enum Category {
    GREETING = 0,
    CONFIRMATION = 1,
    SIGN_OFF = 2,
    AUTO_TASK = 3,
    QUICKIE = 4,
    OPENER = 5
}

/**
 * Some shortcuts for listing a number of standard utterances that are produced without using the LLM.
 * @date 31/01/2024
 *
 * @export
 * @typedef {ConditionalLine}
 */
type ConditionalLine = {
    category?: Category;
    lines: string[];
    condition?: Condition;
};
/**
 * A condition can either be a tag (if it is companion-dependent) or the name of a world data key. It is always
 * compared with a lower boundary (inclusive, >=) and an upper boundary (exclusive, <).
 * @date 31/01/2024
 *
 * @export
 * @typedef {Condition}
 */
type Condition = {
    tag: Tag | string;
    min?: number;
    max?: number;
    value?: StateTypes;
};

type PromptConfig = {
    max_prompt_length: number;
    job_in_chat: boolean;
    system_role_allowed: boolean;
};
type PromptTemplate = {
    bos_token: string;
    eos_token: string;
    unk_token: string;
    chat_template: string;
};

type ModelConfig = typeof defaultModelConfig;
declare const defaultModelConfig: {
    model: string;
    n: number;
    presence_penalty: number;
    frequency_penalty: number;
    repetition_penalty: number;
    temperature: number;
    max_tokens: number;
    top_p: number;
    top_k: number;
    stop: string;
    stop_token_ids: number[];
    ignore_eos: boolean;
    skip_special_tokens: boolean;
    spaces_between_special_tokens: boolean;
    extra: {
        template: {
            bos_token: string;
            eos_token: string;
            unk_token: string;
            chat_template: string;
        };
        promptConfig: PromptConfig;
    };
};

type CompanionState = "disabled" | "free" | "active" | "autonomous" | "chat-only";
type CompanionKind = "user" | "npc" | "shell";
type CompanionScope = "document" | "last_sentence" | "last_paragraph" | "random_paragraph" | "screen" | "some";
type ActionDescription = {
    id: string;
    label?: string;
    deputy: string;
    condition?: Condition;
    fallback?: CompanionScope;
};
declare enum Operation {
    SET = 0,
    ADD = 1,
    SEND = 2
}
type TriggerDescription = {
    action: string | Operation;
    effect?: Condition;
    condition: Condition;
};
type CompanionConfig = {
    name: string;
    class: (new (configuration: CompanionConfig, drama: Drama) => AutoCompanion);
    description: string;
    base_prompt: string;
    kind: CompanionKind;
    moods?: {
        probability: number;
        label: string;
        prompt: string;
    }[];
    bio?: string;
    avatar?: string;
    job?: string;
    situations?: {
        id: string;
        prompt: string;
    }[];
    knowledge?: ConditionalLine[];
    mottos?: ConditionalLine[];
    actions?: ActionDescription[];
    triggers?: TriggerDescription[];
    temperature?: number;
    scope?: CompanionScope;
};
declare abstract class Companion {
    id: string;
    configuration: CompanionConfig;
    status: CompanionState;
    modelConfig?: ModelConfig;
    interactions: number;
    actions: number;
    mood: {
        label: string;
        prompt?: string;
    };
    static toID: (name: string) => string;
    constructor(configuration: CompanionConfig);
    getBasePrompt: () => string;
    getMottosByEvent: (event: Category, drama: Drama) => string[];
    getRandomMottoByEvent: (event: Category, drama: Drama) => string;
    valueOf: () => string;
}

type ContextDataTypes = "companionNames" | // The other companions around
"error" | // An error that occurred
"conversationID" | // A conversation can have multiple turns. They all share an ID
"chat" | // The compressed chat history (only for the moderator & care bot)
"knowledge" | // Unlocked knowledge
"text" | // A line of text provided by the client
"paragraph" | // A paragraph of text provided by the client
"epilogue" | // Text that should always go to the end of the system prompt
"input" | // An input provided by a user
"action" | // An active action
"persona" | // The parts of the person that should be exhibited in this prompt
"job" | // The instruction to the LLM
"mood" | // Change the mood of the companion
"question" | // A question by the deputy
"answer" | // An answer returned by a deputy
"excerpt" | // An item that should be added to the chat instead of the "message".
"quote" | // An item that should be added to the chat instead of a chat message
"message" | // The message to be added to the chat history. Also goes into the prompt.
"tool";
type ContextDecorator = {
    type: ContextDataTypes;
    replacement: string;
};
type ContextData = {
    type: ContextDataTypes;
    data: string;
};
declare class Context {
    companionNames?: string;
    error?: string;
    conversationID?: string;
    interactionID?: string;
    sequenceID?: string;
    chat?: string;
    knowledge?: string;
    text?: string;
    paragraph?: string;
    epilogue?: string;
    input?: string;
    action?: string;
    persona?: string;
    job?: string;
    mood?: string;
    question?: string;
    answer?: string;
    excerpt?: string;
    quote?: string;
    message?: string;
    tool?: string;
    recipient?: AutoCompanion;
    companions: AutoCompanion[];
    chatID: string;
    situation: string;
    input_tokens: number;
    output_tokens: number;
    runtime: number;
    response_id?: string;
    constructor(recipient: AutoCompanion | undefined, companions: AutoCompanion[], chatID: string, situation: string, data?: ContextData[]);
    addUsage: (response: JobResponse) => void;
    findActionConfiguration: (configuration: CompanionConfig) => ActionDescription | undefined;
    findDelegate: (configuration: CompanionConfig, companions: AutoCompanion[]) => AutoCompanion | undefined;
    hasAnswer: () => string | undefined;
    query: () => string | undefined;
}

/**
 * Description placeholder
 * @date 18/01/2024 - 09:45:34
 *
 * @export
 * @typedef {JobStatus} - The status of a job. Can be used for building a job queue.
 */
type JobStatus = "new" | "scheduled" | "running" | "run" | "done" | null;
/**
 * Description placeholder
 * @date 18/01/2024 - 09:45:34
 *
 * @export
 * @typedef {Job} - The job structure. Wraps an inference.
 */
type Job = {
    id: string;
    status: JobStatus;
    context: Context;
    prompt?: string;
    remoteID: string;
    timeStamp: number;
    modelConfig?: ModelConfig;
};

/**
 * The response from the backend/model including the number of tokens in and out.
 *
 * @export
 * @interface JobResponse
 */
interface JobResponse {
    id: string;
    response: string | undefined;
    input_tokens: number | undefined;
    output_tokens: number | undefined;
}
/**
 * A model is an abstraction of a language model.
 *
 * @export
 * @class Model
 */
declare class Model {
    private modelConfig;
    private path;
    /**
     * All tokens sent to the model
     *
     * @type {number}
     * @memberof Model
     */
    inputTokens: number;
    /**
     * All tokens received from the model
     *
     * @type {number}
     * @memberof Model
     */
    outputTokens: number;
    /**
     * Accumulated runtime
     *
     * @type {number}
     * @memberof Model
     */
    runtime: number;
    promptTemplate: PromptTemplate;
    promptConfig: PromptConfig;
    /**
     * Creates an instance of Model.
     * @param {string} [path='/api/user/writersroom/generate']
     * @memberof Model
     */
    constructor(path?: string);
    private jsonToJobResponse;
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
    private buildResponseFromStream;
    private processPOSTResponse;
    /**
     * Call this function to run a job. Returns a job response and updates the local db.
     *
     * @param {Job} job
     * @param {KyInstance} instance
     * @param {Options} [additionalOptions]
     * @memberof Model
     */
    runJob: (job: Job, instance: KyInstance, additionalOptions?: Options) => Promise<JobResponse | undefined>;
}

/**
 * Assemble the prompt.
 *
 * @export
 * @class Prompter
 */
declare class Prompter {
    /**
     * The (jinja) prompt template to use
     *
     * @private
     * @type {Template}
     * @memberof Prompter
     */
    private template;
    /**
     * A template for the template
     *
     * @private
     * @type {PromptTemplate}
     * @memberof Prompter
     */
    private config;
    /**
     * Creates an instance of Prompter.
     * @param {PromptTemplate} config
     * @memberof Prompter
     */
    constructor(config: PromptTemplate);
    /**
     * Decorate the prompt using data.
     *
     * @private
     * @param {ContextDataTypes} type
     * @param {string} [text]
     * @param {ContextDecorator[]} [decorators]
     * @memberof Prompter
     */
    private decorate;
    /**
     * Clean the string
     *
     * @private
     * @param {string} text
     * @memberof Prompter
     */
    private sanitize;
    /**
     * Use jinja to render the prompt using the current configuration and template.
     *
     * @param {string} speaker
     * @param {{ role: string, content: string }[]} chat
     * @param {Template} [template=this.template]
     * @memberof Prompter
     */
    renderPrompt: (speaker: string, chat: {
        role: string;
        content: string;
    }[], template?: Template) => string;
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
     * @return {*}
     */
    assemblePrompt: (companion: Companion, worldState: KeyValueRecord[], context: Context, history?: ChatMessage[], decorators?: ContextDecorator[], config?: PromptConfig, promptTemplate?: PromptTemplate) => string;
}

declare class Drama {
    model: Model;
    instance: KyInstance;
    additionalOptions?: Options;
    prompter: Prompter;
    companions: AutoCompanion[];
    worldState: KeyValueRecord[];
    jobs: Job[];
    chats: Chat[];
    private constructor();
    static initialize(defaultSituation: string, companionConfigs: CompanionConfig[], kyInstance?: KyInstance, additionalOptions?: Options): Promise<Drama>;
    reset: (companions?: Companion[]) => Promise<void>;
    increaseWorldStateEntry: (key: string, value: number) => Promise<void>;
    setWorldStateEntry: (key: string, value: StateTypes) => Promise<void>;
    getWorldStateValue: (key: string) => StateTypes | undefined;
    logInteraction: (companion: Companion) => void;
    logAction: (companion: Companion) => void;
    syncInteractions: () => Promise<void>;
    getActiveActions: () => {
        companion: AutoCompanion;
        action: ActionDescription;
    }[];
    pushJob: (context: Context) => Promise<void>;
    setJobState: (id: string, state: JobStatus) => void;
    setJobRemoteID: (id: string, remoteID: string) => void;
    getJobsByState: (state: JobStatus) => Job[];
    removeJob: (id: string) => void;
    getPrompt: (companion: Companion, history: ChatMessage[], context: Context, decorators?: ContextDecorator[], config?: PromptConfig) => string;
    runJob: (job: Job) => Promise<JobResponse | undefined>;
    restoreChats: (chatRecords?: ChatRecord[]) => void;
    getChat: (id: string) => Chat | undefined;
    getCompanionChat: (companion: Companion) => Chat | undefined;
    addCompanionChat: (companion: Companion, situation: string) => Chat;
    addChat: (id: string, situation: string, companionIDs: string[], maxRounds?: number, speakerSelection?: ChatSpeakerSelection) => Chat;
    removeChat: (id: string) => void;
    runConversation: (chat: Chat, rounds: number, context: Context, lastSpeaker?: AutoCompanion, except?: Companion[], callback?: (chat: Chat, message?: ChatMessage) => void) => Promise<[Chat, AutoCompanion | undefined, AutoCompanion | undefined, Context | undefined]>;
    runChat: (chat: Chat, rounds: number, context: Context, lastSpeaker?: AutoCompanion, except?: Companion[], callback?: (chat: Chat, message?: ChatMessage) => void) => Promise<[Chat, AutoCompanion | undefined, AutoCompanion | undefined, Context | undefined]>;
    runTriggers: (context: Context, callback?: (chat: Chat, message?: ChatMessage) => void) => Promise<Context>;
}

export { Drama };