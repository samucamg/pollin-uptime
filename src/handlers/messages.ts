import type { Context } from "hono";
import { GATEWAY_HEADERS } from "../constants/limits";
import { CascadeManager } from "../services/cascade-manager";
import { WebSearchRouter } from "../services/web-search-router";
import type {
  AnthropicMessageRequest,
  ChatCompletionRequest,
  ChatMessage,
  HonoEnv,
  ToolDefinition,
} from "../types";
import { ValidationError } from "../utils/errors";

export async function handleAnthropicMessages(c: Context<HonoEnv>) {
  const body = await c.req.json<AnthropicMessageRequest>().catch(() => {
    throw new ValidationError("Invalid JSON body");
  });

  if (!body.messages || !Array.isArray(body.messages)) {
    throw new ValidationError("messages field is required", "messages");
  }

  // Converte formato Anthropic para OpenAI messages
  const openAiMessages: ChatMessage[] = [];

  // Injeta system prompt se fornecido
  if (body.system) {
    const sysText =
      typeof body.system === "string"
        ? body.system
        : body.system.map((s) => s.text).join("\n");
    openAiMessages.push({ role: "system", content: sysText });
  }

  for (const m of body.messages) {
    if (typeof m.content === "string") {
      openAiMessages.push({ role: m.role, content: m.content });
    } else if (Array.isArray(m.content)) {
      const textParts = m.content
        .filter((part) => part.type === "text")
        .map((part: any) => part.text)
        .join("\n");
      openAiMessages.push({ role: m.role, content: textParts });
    }
  }

  // Mapeia tools do Anthropic para OpenAI
  let tools: ToolDefinition[] | undefined;
  if (body.tools && Array.isArray(body.tools)) {
    tools = body.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));
  }

  const apiKey = c.get("apiKey");
  const openAiReq: ChatCompletionRequest = {
    model: body.model || "claude",
    messages: openAiMessages,
    temperature: body.temperature,
    max_tokens: body.max_tokens || 1024,
    top_p: body.top_p,
    tools,
    stream: body.stream,
  };

  const cascade = new CascadeManager(c.env);
  const cascadeResult = await cascade.executeChatCascade(openAiReq, apiKey);
  const resp: any = cascadeResult.response;

  // Traduz de volta para resposta Anthropic Messages
  const contentBlocks: any[] = [];
  const choice = resp?.choices?.[0];
  const message = choice?.message;

  if (message?.content) {
    contentBlocks.push({ type: "text", text: message.content });
  }

  if (message?.tool_calls && Array.isArray(message.tool_calls)) {
    for (const tc of message.tool_calls) {
      let inputObj = {};
      try {
        inputObj = JSON.parse(tc.function.arguments);
      } catch {}
      contentBlocks.push({
        type: "tool_use",
        id: tc.id,
        name: tc.function.name,
        input: inputObj,
      });
    }
  }

  c.header(GATEWAY_HEADERS.MODEL_USED, cascadeResult.modelUsed);
  c.header(GATEWAY_HEADERS.ATTEMPTS, cascadeResult.attemptsCount.toString());

  return c.json({
    id: resp.id || `msg_${crypto.randomUUID().slice(0, 12)}`,
    type: "message",
    role: "assistant",
    model: cascadeResult.modelUsed,
    content: contentBlocks,
    stop_reason:
      choice?.finish_reason === "tool_calls" ? "tool_use" : "end_turn",
    usage: {
      input_tokens: resp.usage?.prompt_tokens || 0,
      output_tokens: resp.usage?.completion_tokens || 0,
    },
  });
}
