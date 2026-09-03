export interface AnthropicContentBlockText {
  type: "text";
  text: string;
}

export interface AnthropicContentBlockImage {
  type: "image";
  source: {
    type: "base64" | "url";
    media_type: string;
    data: string;
  };
}

export interface AnthropicContentBlockToolUse {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AnthropicContentBlockToolResult {
  type: "tool_result";
  tool_use_id: string;
  content: string | AnthropicContentBlockText[];
  is_error?: boolean;
}

export type AnthropicContentBlock =
  | AnthropicContentBlockText
  | AnthropicContentBlockImage
  | AnthropicContentBlockToolUse
  | AnthropicContentBlockToolResult;

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export interface AnthropicMessageRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string | AnthropicContentBlockText[];
  max_tokens?: number;
  metadata?: Record<string, unknown>;
  stop_sequences?: string[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  tools?: AnthropicTool[];
  tool_choice?: unknown;
}
