export interface EnvBindings {
  RATE_LIMIT_STORE: KVNamespace;
  CACHE_STORE: KVNamespace;

  POLLINATIONS_API_BASE_URL: string;
  POLLINATIONS_API_KEY?: string;
  AUTH_TOKEN?: string;

  DEFAULT_FALLBACK_1?: string;
  DEFAULT_FALLBACK_2?: string;
  DEFAULT_FALLBACK_3?: string;

  DEFAULT_SEARCH_MODEL?: string;
  SEARCH_FALLBACK_MODEL?: string;
  SEARCH_TIMEOUT_MS?: string;
  CASCADE_TIMEOUT_MS?: string;

  // Ultimate External Fallback (Qualquer provedor compatível com OpenAI: Groq, OpenRouter, CheaperInference, DeepSeek, Together)
  EXTERNAL_FALLBACK_URL?: string;
  EXTERNAL_FALLBACK_KEY?: string;
  EXTERNAL_FALLBACK_MODEL?: string;

  // Provedor Externo Dedicado para Busca Web (Opcional - Ex: Perplexity API ou OpenRouter online)
  EXTERNAL_SEARCH_URL?: string;
  EXTERNAL_SEARCH_KEY?: string;
  EXTERNAL_SEARCH_MODEL?: string;

  // Motores de Busca & RAG
  SEARXNG_URL?: string;
  ENABLE_JINA_READER?: string;
}

export interface HonoVariables {
  apiKey: string;
  userAuthToken?: string;
  modelCascade?: string[];
  clientIp?: string;
}

export interface HonoEnv {
  Bindings: EnvBindings;
  Variables: HonoVariables;
}
