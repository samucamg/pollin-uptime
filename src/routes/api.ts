import { Hono } from "hono";
import {
  handleAudioSpeech,
  handleAudioTranscriptions,
  handleAudioTranslations,
} from "../handlers/audio";
import { handleChatCompletion } from "../handlers/chat";
import { handleGenerateImages } from "../handlers/images";
import { handleAnthropicMessages } from "../handlers/messages";
import { handleListModels } from "../handlers/models";
import { handleResponsesApi } from "../handlers/responses";
import { handleSearchEndpoint } from "../handlers/search";
import { handleWebFetchEndpoint } from "../handlers/web-fetch";
import type { HonoEnv } from "../types";

const apiRouter = new Hono<HonoEnv>();

// OpenAI-compatible Chat Completions
apiRouter.post("/chat/completions", handleChatCompletion);

// OpenAI-compatible Responses API
apiRouter.post("/responses", handleResponsesApi);

// Anthropic-compatible Messages Bridge
apiRouter.post("/messages", handleAnthropicMessages);

// Model Catalog
apiRouter.get("/models", handleListModels);

// Images
apiRouter.post("/images/generations", handleGenerateImages);

// Audio
apiRouter.post("/audio/speech", handleAudioSpeech);
apiRouter.post("/audio/transcriptions", handleAudioTranscriptions);
apiRouter.post("/audio/translations", handleAudioTranslations);

// Dedicated Gateway Web Search & Web Fetch
apiRouter.post("/search", handleSearchEndpoint);
apiRouter.post("/web/fetch", handleWebFetchEndpoint);

export default apiRouter;
