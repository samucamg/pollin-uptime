import type { Context } from "hono";
import type { HonoEnv } from "../types";

export function handleHealthCheck(c: Context<HonoEnv>) {
  return c.json({
    status: "ok",
    service: "pollin-uptime",
    version: "1.0.0",
    description:
      "High Availability Serverless AI Gateway for Pollinations.ai with 3-Model Fallback Cascade & Search-Augmented Generation",
    features: {
      cascade_fallback: true,
      max_fallback_steps: 3,
      search_augmented_generation: true,
      hybrid_tool_calling: true,
      openai_compatible: true,
      anthropic_compatible: true,
    },
    uptime: "always online",
    timestamp: new Date().toISOString(),
  });
}
