import type { MiddlewareHandler } from "hono";
import type { HonoEnv } from "../types";
import { AuthenticationError } from "../utils/errors";

export const authMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const authHeader = c.req.header("Authorization") || "";
  const apiKeyHeader = c.req.header("x-api-key") || "";
  const queryKey = c.req.query("key") || "";

  let incomingToken = "";
  if (authHeader.startsWith("Bearer ")) {
    incomingToken = authHeader.slice(7).trim();
  } else if (apiKeyHeader) {
    incomingToken = apiKeyHeader.trim();
  } else if (queryKey) {
    incomingToken = queryKey.trim();
  }

  const configuredMasterToken = c.env.AUTH_TOKEN?.trim();
  const configuredPollinationsKey = c.env.POLLINATIONS_API_KEY?.trim();

  // Caso 1: Se o usuário passou sua própria chave Pollinations (sk_... ou pk_...)
  if (incomingToken.startsWith("sk_") || incomingToken.startsWith("pk_")) {
    c.set("apiKey", incomingToken);
    c.set("userAuthToken", incomingToken);
    return await next();
  }

  // Caso 2: Se foi configurado um Master AUTH_TOKEN no gateway
  if (configuredMasterToken) {
    if (!incomingToken || incomingToken !== configuredMasterToken) {
      throw new AuthenticationError(
        "Invalid or missing Gateway Master AUTH_TOKEN",
      );
    }
    // Token validado: usa a chave da Pollinations configurada no Worker
    c.set("apiKey", configuredPollinationsKey || "");
    c.set("userAuthToken", incomingToken);
    return await next();
  }

  // Caso 3: Sem AUTH_TOKEN configurado, usa a chave de upstream se existir ou o token enviado
  c.set("apiKey", configuredPollinationsKey || incomingToken);
  c.set("userAuthToken", incomingToken);
  await next();
};
