import type { Context } from "hono";
import { getModelRegistry } from "../services/model-registry";
import type { HonoEnv } from "../types";

export async function handleListModels(c: Context<HonoEnv>) {
  const apiKey = c.get("apiKey");
  const registry = await getModelRegistry(c.env, apiKey);
  return c.json(registry);
}
