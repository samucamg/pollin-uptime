export const DEFAULT_ATTEMPT_TIMEOUT_MS = 25000;
export const DEFAULT_SEARCH_TIMEOUT_MS = 12000;
export const MAX_FALLBACK_STEPS = 3;

export const GATEWAY_HEADERS = {
  MODEL_USED: "x-gateway-model-used",
  ATTEMPTS: "x-gateway-attempts",
  FALLBACK_CHAIN: "x-gateway-fallback-chain",
  LATENCY_MS: "x-gateway-latency-ms",
  SEARCH_PERFORMED: "x-gateway-search-performed",
  TOOL_MODE: "x-gateway-tool-mode",
} as const;
