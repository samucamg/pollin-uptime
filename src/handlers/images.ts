import type { Context } from "hono";
import { GATEWAY_HEADERS } from "../constants/limits";
import { DEFAULT_IMAGE_FALLBACKS } from "../constants/models";
import { PollinationsClient } from "../services/pollinations";
import type { HonoEnv } from "../types";
import { UpstreamError, ValidationError } from "../utils/errors";

export async function handleGenerateImages(c: Context<HonoEnv>) {
  const body = await c.req.json().catch(() => {
    throw new ValidationError("Invalid JSON body");
  });

  if (!body.prompt) {
    throw new ValidationError("prompt is required", "prompt");
  }

  const apiKey = c.get("apiKey");
  const requestedModel = body.model || "flux";
  const imageModels = [
    requestedModel,
    ...DEFAULT_IMAGE_FALLBACKS.filter((m) => m !== requestedModel),
  ];

  const client = new PollinationsClient(c.env);
  let lastError: unknown = null;

  for (let i = 0; i < imageModels.length; i++) {
    const currentModel = imageModels[i];
    try {
      const res = await client.request({
        path: "/v1/images/generations",
        method: "POST",
        body: { ...body, model: currentModel },
        apiKey,
        timeoutMs: 40000,
      });

      c.header(GATEWAY_HEADERS.MODEL_USED, currentModel);
      c.header(GATEWAY_HEADERS.ATTEMPTS, (i + 1).toString());
      return c.json(res.data);
    } catch (err) {
      lastError = err;
      console.warn(
        `Image generation fallback: model ${currentModel} failed, trying next...`,
      );
    }
  }

  throw (
    lastError || new UpstreamError("All image models in cascade failed", 502)
  );
}

export async function handleGetImageByPrompt(c: Context<HonoEnv>) {
  const prompt = c.req.param("prompt") || "";
  const query = c.req.query();
  const apiKey = c.get("apiKey");

  const searchParams = new URLSearchParams(query);
  if (apiKey && !searchParams.has("key")) {
    searchParams.set("key", apiKey);
  }

  const path = `/image/${encodeURIComponent(prompt)}?${searchParams.toString()}`;
  const client = new PollinationsClient(c.env);
  const { response } = await client.fetchRaw({
    path,
    method: "GET",
    timeoutMs: 35000,
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
