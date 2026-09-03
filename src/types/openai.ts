export interface ChatMessagePart {
  type: "text" | "image_url" | "input_audio";
  text?: string;
  image_url?: {
    url: string;
    detail?: "low" | "high" | "auto";
  };
  input_audio?: {
    data: string;
    format: "wav" | "mp3";
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool" | "function";
  content: string | ChatMessagePart[] | null;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  tools?: ToolDefinition[];
  tool_choice?: unknown;
  parallel_tool_calls?: boolean;
  response_format?: { type: "text" | "json_object" };
  seed?: number;
  reasoning_effort?: "none" | "minimal" | "low" | "medium" | "high";
  safe?: string | boolean;
  web_search?: boolean;
  web_search_options?: {
    search_context_size?: "low" | "medium" | "high";
  };
  [key: string]: unknown;
}

export interface ChatCompletionChoice {
  index: number;
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: ToolCall[];
  };
  finish_reason: "stop" | "tool_calls" | "length" | "content_filter" | null;
}

export interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

export interface ModelItem {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
  description?: string;
  type?: "chat" | "image" | "audio" | "embedding";
  supports_tools?: boolean;
  supports_search?: boolean;
  supports_vision?: boolean;
  supports_reasoning?: boolean;
}

export interface ModelListResponse {
  object: "list";
  data: ModelItem[];
}
