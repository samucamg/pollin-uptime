import type { MiddlewareHandler } from "hono";
import type { HonoEnv } from "../types";
import { RateLimitError } from "../utils/errors";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_MINUTE = 120;

export const rateLimitMiddleware: MiddlewareHandler<HonoEnv> = async (
  c,
  next,
) => {
  const kv = c.env.RATE_LIMIT_STORE;
  if (!kv) {
    return await next();
  }

  const clientIp =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown-client";

  c.set("clientIp", clientIp);

  const currentWindow = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
  const key = `rl:${clientIp}:${currentWindow}`;

  try {
    const countStr = await kv.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;

    if (count >= MAX_REQUESTS_PER_MINUTE) {
      throw new RateLimitError(
        `Rate limit of ${MAX_REQUESTS_PER_MINUTE} req/min exceeded.`,
      );
    }

    c.executionCtx.waitUntil(
      kv.put(key, (count + 1).toString(), {
        expirationTtl: WINDOW_SECONDS * 2,
      }),
    );
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    // Falha do KV não bloqueia a requisição
    console.warn("Rate limit KV store warning:", err);
  }

  await next();
};
