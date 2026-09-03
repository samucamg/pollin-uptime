import type { Context } from "hono";
import { GATEWAY_HEADERS } from "../constants/limits";
import { CascadeManager } from "../services/cascade-manager";
import { WebSearchRouter } from "../services/web-search-router";
import type { ChatCompletionRequest, HonoEnv } from "../types";
import { ValidationError } from "../utils/errors";
import { sanitizeMessages } from "../utils/sanitizer";

export async function handleChatCompletion(c: Context<HonoEnv>) {
  const body = await c.req.json<ChatCompletionRequest>().catch(() => {
    throw new ValidationError("Invalid JSON in request body");
  });

  if (!body.model) {
    body.model = "openai";
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new ValidationError(
      "messages array is required and cannot be empty",
      "messages",
    );
  }

  body.messages = sanitizeMessages(body.messages);

  const apiKey = c.get("apiKey");
  const clientHeaderFallbacks = c.req.header("x-fallback-models");
  const headerWebSearch = c.req.header("x-web-search");

  // ETAPA 1: Desvio de Busca Web Inteligente (Search-Augmented Generation)
  let searchPerformed = false;
  if (WebSearchRouter.shouldPerformSearch(body, headerWebSearch)) {
    const query = WebSearchRouter.extractSearchQuery(body.messages);
    if (query) {
      console.info(
        `Web search requested for query: "${query}". Delegating to fast search model...`,
      );
      const searchResult = await WebSearchRouter.executeSearch(
        c.env,
        query,
        apiKey,
      );
      if (searchResult.success) {
        body.messages = WebSearchRouter.injectSearchResults(
          body.messages,
          searchResult.searchSummary,
          searchResult.modelUsed,
        );
        searchPerformed = true;
      }
    }
  }

  // ETAPA 2: Cascata de 3 Modelos de Fallback
  const cascade = new CascadeManager(c.env);

  // Se stream = true
  if (body.stream) {
    const streamResult = await cascade.executeChatStreamCascade(
      body,
      apiKey,
      clientHeaderFallbacks,
    );
    const headers = new Headers(streamResult.response.headers);
    headers.set(GATEWAY_HEADERS.MODEL_USED, streamResult.modelUsed);
    headers.set(
      GATEWAY_HEADERS.ATTEMPTS,
      streamResult.attemptsCount.toString(),
    );
    headers.set(
      GATEWAY_HEADERS.FALLBACK_CHAIN,
      streamResult.fallbackChain.join(" -> "),
    );
    headers.set(
      GATEWAY_HEADERS.SEARCH_PERFORMED,
      searchPerformed ? "true" : "false",
    );

    return new Response(streamResult.response.body, {
      status: streamResult.response.status,
      headers,
    });
  }

  // Se stream = false
  const cascadeResult = await cascade.executeChatCascade(
    body,
    apiKey,
    clientHeaderFallbacks,
  );

  c.header(GATEWAY_HEADERS.MODEL_USED, cascadeResult.modelUsed);
  c.header(GATEWAY_HEADERS.ATTEMPTS, cascadeResult.attemptsCount.toString());
  c.header(
    GATEWAY_HEADERS.FALLBACK_CHAIN,
    cascadeResult.fallbackChain.join(" -> "),
  );
  c.header(GATEWAY_HEADERS.LATENCY_MS, cascadeResult.totalLatencyMs.toString());
  c.header(GATEWAY_HEADERS.TOOL_MODE, cascadeResult.toolMode);
  c.header(
    GATEWAY_HEADERS.SEARCH_PERFORMED,
    searchPerformed ? "true" : "false",
  );

  return c.json(cascadeResult.response);
}
