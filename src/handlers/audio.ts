import type { Context } from "hono";
import { PollinationsClient } from "../services/pollinations";
import type { HonoEnv } from "../types";

export async function handleAudioTranscriptions(c: Context<HonoEnv>) {
  const formData = await c.req.formData();
  const apiKey = c.get("apiKey");

  const client = new PollinationsClient(c.env);
  const { response } = await client.fetchRaw({
    path: "/v1/audio/transcriptions",
    method: "POST",
    body: formData,
    apiKey,
    timeoutMs: 45000,
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function handleAudioSpeech(c: Context<HonoEnv>) {
  const body = await c.req.json();
  const apiKey = c.get("apiKey");

  const client = new PollinationsClient(c.env);
  const { response } = await client.fetchRaw({
    path: "/v1/audio/speech",
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

export async function handleAudioTranslations(c: Context<HonoEnv>) {
  const formData = await c.req.formData();
  const apiKey = c.get("apiKey");

  const client = new PollinationsClient(c.env);
  const { response } = await client.fetchRaw({
    path: "/v1/audio/translations",
    method: "POST",
    body: formData,
    apiKey,
    timeoutMs: 45000,
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
