import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { authMiddleware } from "./middleware/auth";
import { corsMiddleware } from "./middleware/cors";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import apiRoutes from "./routes/api";
import directRoutes from "./routes/direct";
import rootRoutes from "./routes/root";
import type { HonoEnv } from "./types";
import { ApiError, toAnthropicError, toOpenAIError } from "./utils/errors";

const app = new Hono<HonoEnv>();

// 1. CORS
app.use("*", corsMiddleware);

// 2. Rate Limiting (desconsidera OPTIONS)
app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return await next();
  return rateLimitMiddleware(c, next);
});

// 3. Autenticação (Master Token ou BYOP)
app.use("*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  // Rotas públicas que não exigem auth
  if (path === "/" || c.req.method === "OPTIONS") {
    return await next();
  }
  return authMiddleware(c, next);
});

// 4. Global Error Handler
app.onError((err, c) => {
  console.error("Gateway error:", err);
  const path = new URL(c.req.url).pathname;

  if (path.startsWith("/v1/messages")) {
    const errorData = toAnthropicError(err);
    return c.json(
      {
        type: "error",
        error: { type: errorData.type, message: errorData.message },
      },
      errorData.status as ContentfulStatusCode,
    );
  }

  const errorData = toOpenAIError(err);
  return c.json(
    {
      error: {
        message: errorData.message,
        type: errorData.type,
        code: errorData.code,
        param: errorData.param,
      },
    },
    errorData.status as ContentfulStatusCode,
  );
});

// 5. Mount Rotas
app.route("/", rootRoutes);
app.route("/v1", apiRoutes);
app.route("/", directRoutes);

// 6. 404 Handler
app.notFound((c) => {
  return c.json(
    {
      error: {
        message: "Endpoint not found on pollin-uptime gateway",
        type: "not_found",
      },
    },
    404,
  );
});

export default app;
