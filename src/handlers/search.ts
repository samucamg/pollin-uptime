import type { Context } from "hono";
import { WebSearchRouter } from "../services/web-search-router";
import type { HonoEnv } from "../types";
import { ValidationError } from "../utils/errors";

export async function handleSearchEndpoint(c: Context<HonoEnv>) {
  const body = await c.req.json().catch(() => {
    throw new ValidationError("Invalid JSON body");
  });

  const query = body.query || body.q;
  if (!query || typeof query !== "string") {
    throw new ValidationError("query field (string) is required", "query");
  }

  const result = await WebSearchRouter.search(c.env, query.trim());
  return c.json({
    object: "search.results",
    query: result.query,
    provider: result.provider,
    results_count: result.results.length,
    results: result.results,
    summary: result.summary,
  });
}
