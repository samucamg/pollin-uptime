import type { Context } from "hono";
import { CascadeManager } from "../services/cascade-manager";
import type { ChatCompletionRequest, ChatMessage, HonoEnv } from "../types";
import { ValidationError } from "../utils/errors";

export async function handleResponsesApi(c: Context<HonoEnv>) {
  const body = await c.req.json().catch(() => {
    throw new ValidationError("Invalid JSON body");
  });

  // Aceita input ou messages
  let messages: ChatMessage[] = [];
  if (typeof body.input === "string") {
    if (body.instructions) {
      messages.push({ role: "system", content: body.instructions });
    }
    messages.push({ role: "user", content: body.input });
  } else if (Array.isArray(body.input)) {
    for (const item of body.input) {
      if (typeof item === "string") {
        messages.push({ role: "user", content: item });
      } else if (item?.role && item?.content) {
        messages.push({ role: item.role, content: item.content });
      }
    }
  } else if (Array.isArray(body.messages)) {
    messages = body.messages;
  } else {
    throw new ValidationError("input or messages field is required", "input");
  }

  const chatReq: ChatCompletionRequest = {
    model: body.model || "openai",
    messages,
    temperature: body.temperature,
    max_tokens: body.max_output_tokens || body.max_tokens,
    response_format: body.response_format,
  };

  const apiKey = c.get("apiKey");
  const cascade = new CascadeManager(c.env);
  const result = await cascade.executeChatCascade(chatReq, apiKey);
  const resp: any = result.response;
  const choice = resp.choices?.[0];

  return c.json({
    id: resp.id
      ? resp.id.replace("chatcmpl", "resp")
      : `resp_${crypto.randomUUID().slice(0, 10)}`,
    object: "response",
    created: resp.created || Math.floor(Date.now() / 1000),
    model: result.modelUsed,
    output: [
      {
        index: 0,
        type: "message",
        role: "assistant",
        content: choice?.message?.content || "",
      },
    ],
    usage: resp.usage || {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
    },
  });
}
