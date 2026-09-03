import type { ChatMessage } from "../types";

export function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  if (!Array.isArray(messages)) return [];

  return messages.map((msg) => {
    const sanitized: ChatMessage = {
      role: msg.role || "user",
      content: msg.content ?? "",
    };

    if (msg.name) sanitized.name = msg.name;
    if (msg.tool_calls) sanitized.tool_calls = msg.tool_calls;
    if (msg.tool_call_id) sanitized.tool_call_id = msg.tool_call_id;

    return sanitized;
  });
}
