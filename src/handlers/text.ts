import type { Context } from "hono";
import { PollinationsClient } from "../services/pollinations";
import type { HonoEnv } from "../types";

export async function handleGetTextByPrompt(c: Context<HonoEnv>) {
  const prompt = c.req.param("prompt") || "";
  const query = c.req.query();
  const apiKey = c.get("apiKey");

  const searchParams = new URLSearchParams(query);
  if (apiKey && !searchParams.has("key")) {
    searchParams.set("key", apiKey);
  }

  const path = `/text/${encodeURIComponent(prompt)}?${searchParams.toString()}`;
  const client = new PollinationsClient(c.env);
  const { response } = await client.fetchRaw({
    path,
    method: "GET",
    timeoutMs: 25000,
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function handlePostText(c: Context<HonoEnv>) {
  const body = await c.req.json();
  const apiKey = c.get("apiKey");

  const client = new PollinationsClient(c.env);
  const { response } = await client.fetchRaw({
    path: "/text",
    method: "POST",
    body,
    apiKey,
    timeoutMs: 30000,
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
