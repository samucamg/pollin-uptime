import { KNOWN_MODELS_METADATA } from "../constants/models";
import type { EnvBindings, ModelItem, ModelListResponse } from "../types";
import { PollinationsClient } from "./pollinations";

const CACHE_KEY = "pollin:models:catalog";
const CACHE_TTL_SECONDS = 3600; // 1 hora de cache

export async function getModelRegistry(
  env: EnvBindings,
  apiKey?: string,
): Promise<ModelListResponse> {
  const kv = env.CACHE_STORE;

  if (kv) {
    try {
      const cached = await kv.get(CACHE_KEY, "json");
      if (cached && Array.isArray((cached as ModelListResponse).data)) {
        return cached as ModelListResponse;
      }
    } catch (err) {
      console.warn("Model registry KV read failed:", err);
    }
  }

  const client = new PollinationsClient(env);
  try {
    const res = await client.request<any[]>({
      path: "/models",
      method: "GET",
      apiKey,
      timeoutMs: 10000,
    });

    const rawList = Array.isArray(res.data) ? res.data : [];
    const models: ModelItem[] = rawList.map((m: any) => {
      const id = typeof m === "string" ? m : m.name || m.id || "unknown";
      const meta = KNOWN_MODELS_METADATA[id] || {
        type: "chat",
        supports_tools: false,
        supports_search: false,
      };

      return {
        id,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "pollinations.ai",
        description:
          m.description || `Pollinations.ai ${meta.type} model ${id}`,
        type: meta.type,
        supports_tools: meta.supports_tools,
        supports_search: meta.supports_search,
      };
    });

    const result: ModelListResponse = {
      object: "list",
      data: models,
    };

    if (kv && models.length > 0) {
      await kv.put(CACHE_KEY, JSON.stringify(result), {
        expirationTtl: CACHE_TTL_SECONDS,
      });
    }

    return result;
  } catch (err) {
    console.warn(
      "Failed to fetch live model catalog from Pollinations, using fallback catalog:",
      err,
    );
    // Retorna catálogo embutido de emergência
    const fallbackList: ModelItem[] = Object.keys(KNOWN_MODELS_METADATA).map(
      (id) => ({
        id,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "pollinations.ai",
        description: `Pollinations.ai fallback model definition: ${id}`,
        type: KNOWN_MODELS_METADATA[id].type,
        supports_tools: KNOWN_MODELS_METADATA[id].supports_tools,
        supports_search: KNOWN_MODELS_METADATA[id].supports_search,
      }),
    );

    return {
      object: "list",
      data: fallbackList,
    };
  }
}
