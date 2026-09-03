import type { Context } from "hono";
import { WebSearchRouter } from "../services/web-search-router";
import type { HonoEnv } from "../types";
import { ValidationError } from "../utils/errors";

export async function handleWebFetchEndpoint(c: Context<HonoEnv>) {
  const body = await c.req.json().catch(() => {
    throw new ValidationError("Invalid JSON body");
  });

  const targetUrl = body.url || body.target;
  if (!targetUrl || typeof targetUrl !== "string") {
    throw new ValidationError("url field (string) is required", "url");
  }

  const result = await WebSearchRouter.fetchUrl(c.env, targetUrl.trim());
  return c.json({
    object: "web.fetch",
    url: result.url,
    provider: result.provider,
    length: result.content.length,
    content: result.content,
  });
}
