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

  SEARXNG_URL?: string;
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
