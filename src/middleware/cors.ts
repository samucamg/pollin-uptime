import type { MiddlewareHandler } from "hono";
import type { HonoEnv } from "../types";

export const corsMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, x-api-key, anthropic-version, x-fallback-models, x-web-search, User-Agent",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  await next();

  c.res.headers.set("Access-Control-Allow-Origin", "*");
  c.res.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  );
  c.res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key, anthropic-version, x-fallback-models, x-web-search, User-Agent",
  );
};
