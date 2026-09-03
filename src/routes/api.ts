import { Hono } from "hono";
import {
  handleAudioSpeech,
  handleAudioTranscriptions,
} from "../handlers/audio";
import { handleChatCompletion } from "../handlers/chat";
import { handleGenerateImages } from "../handlers/images";
import { handleAnthropicMessages } from "../handlers/messages";
import { handleListModels } from "../handlers/models";
import type { HonoEnv } from "../types";

const apiRouter = new Hono<HonoEnv>();

// OpenAI-compatible Chat Completions
apiRouter.post("/chat/completions", handleChatCompletion);

// Anthropic-compatible Messages Bridge
apiRouter.post("/messages", handleAnthropicMessages);

// Model Catalog
apiRouter.get("/models", handleListModels);

// Images
apiRouter.post("/images/generations", handleGenerateImages);

// Audio
apiRouter.post("/audio/transcriptions", handleAudioTranscriptions);
apiRouter.post("/audio/speech", handleAudioSpeech);

export default apiRouter;
