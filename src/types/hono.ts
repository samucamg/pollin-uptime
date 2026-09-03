export interface EnvBindings {
  RATE_LIMIT_STORE: KVNamespace;
  CACHE_STORE: KVNamespace;

  // Pollinations API Base
  POLLINATIONS_API_BASE_URL: string;
  POLLINATIONS_API_KEY?: string;
  AUTH_TOKEN?: string;

  // Cascata Interna de Fallback (Pollinations)
  DEFAULT_FALLBACK_1?: string;
  DEFAULT_FALLBACK_2?: string;
  DEFAULT_FALLBACK_3?: string;

  // Modelos de Busca da Pollinations (Fallback da Própria Pollinations)
  DEFAULT_SEARCH_MODEL?: string;
  SEARCH_FALLBACK_MODEL?: string;
  SEARCH_TIMEOUT_MS?: string;
  CASCADE_TIMEOUT_MS?: string;

  // Ultimate External Fallback (Qualquer provedor compatível com OpenAI: Groq, OpenRouter, CheaperInference, etc.)
  EXTERNAL_FALLBACK_URL?: string;
  EXTERNAL_FALLBACK_KEY?: string;
  EXTERNAL_FALLBACK_MODEL?: string;

  // Provedores de Busca Web (Até 2 Provedores com Free Tier Real: searxng, tavily, serper, duckduckgo)
  SEARCH_PROVIDER_1_TYPE?: "searxng" | "tavily" | "serper" | "duckduckgo";
  SEARCH_PROVIDER_1_URL?: string;
  SEARCH_PROVIDER_1_KEY?: string;

  SEARCH_PROVIDER_2_TYPE?: "searxng" | "tavily" | "serper" | "duckduckgo";
  SEARCH_PROVIDER_2_URL?: string;
  SEARCH_PROVIDER_2_KEY?: string;

  // Provedores de Web Fetch / Scrape (Até 2 Provedores: jina, firecrawl)
  FETCH_PROVIDER_1_TYPE?: "jina" | "firecrawl";
  FETCH_PROVIDER_1_URL?: string;
  FETCH_PROVIDER_1_KEY?: string;

  FETCH_PROVIDER_2_TYPE?: "jina" | "firecrawl";
  FETCH_PROVIDER_2_URL?: string;
  FETCH_PROVIDER_2_KEY?: string;

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
