export const DEFAULT_TEXT_FALLBACKS = [
  "gemini-3-flash",
  "openai-fast",
  "mistral",
] as const;
export const DEFAULT_CODE_FALLBACKS = [
  "qwen-coder",
  "deepseek",
  "gemini-3-flash",
] as const;
export const DEFAULT_SEARCH_FALLBACKS = [
  "gemini-search",
  "perplexity-fast",
  "perplexity",
] as const;
export const DEFAULT_IMAGE_FALLBACKS = ["zimage", "flux", "seedream"] as const;
export const DEFAULT_AUDIO_FALLBACKS = [
  "openai-audio",
  "openai-audio-large",
] as const;

export const KNOWN_MODELS_METADATA: Record<
  string,
  {
    type: "chat" | "image" | "audio";
    supports_tools: boolean;
    supports_search: boolean;
  }
> = {
  // Chat Models
  openai: { type: "chat", supports_tools: true, supports_search: false },
  "openai-fast": { type: "chat", supports_tools: true, supports_search: false },
  "openai-large": {
    type: "chat",
    supports_tools: true,
    supports_search: false,
  },
  claude: { type: "chat", supports_tools: true, supports_search: false },
  "claude-fast": { type: "chat", supports_tools: true, supports_search: false },
  "claude-large": {
    type: "chat",
    supports_tools: true,
    supports_search: false,
  },
  gemini: { type: "chat", supports_tools: true, supports_search: false },
  "gemini-3-flash": {
    type: "chat",
    supports_tools: true,
    supports_search: false,
  },
  "gemini-fast": { type: "chat", supports_tools: true, supports_search: false },
  deepseek: { type: "chat", supports_tools: false, supports_search: false },
  "deepseek-pro": {
    type: "chat",
    supports_tools: false,
    supports_search: false,
  },
  mistral: { type: "chat", supports_tools: false, supports_search: false },
  "mistral-large": {
    type: "chat",
    supports_tools: false,
    supports_search: false,
  },
  "qwen-coder": { type: "chat", supports_tools: true, supports_search: false },
  "qwen-coder-large": {
    type: "chat",
    supports_tools: true,
    supports_search: false,
  },

  // Search Grounded Models
  "gemini-search": {
    type: "chat",
    supports_tools: false,
    supports_search: true,
  },
  perplexity: { type: "chat", supports_tools: false, supports_search: true },
  "perplexity-fast": {
    type: "chat",
    supports_tools: false,
    supports_search: true,
  },
  "perplexity-reasoning": {
    type: "chat",
    supports_tools: false,
    supports_search: true,
  },

  // Image Models
  zimage: { type: "image", supports_tools: false, supports_search: false },
  flux: { type: "image", supports_tools: false, supports_search: false },
  "flux-2-pro": {
    type: "image",
    supports_tools: false,
    supports_search: false,
  },
  seedream: { type: "image", supports_tools: false, supports_search: false },
  "seedream-pro": {
    type: "image",
    supports_tools: false,
    supports_search: false,
  },
  nanobanana: { type: "image", supports_tools: false, supports_search: false },
  kontext: { type: "image", supports_tools: false, supports_search: false },

  // Audio Models
  "openai-audio": {
    type: "audio",
    supports_tools: false,
    supports_search: false,
  },
  "openai-audio-large": {
    type: "audio",
    supports_tools: false,
    supports_search: false,
  },
};
