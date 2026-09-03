import type { EnvBindings } from "../types";
import { UpstreamError } from "../utils/errors";

export interface PollinationsRequestOptions {
  path: string;
  method?: string;
  body?: unknown;
  apiKey?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export class PollinationsClient {
  private baseUrl: string;

  constructor(private env: EnvBindings) {
    this.baseUrl = (
      env.POLLINATIONS_API_BASE_URL || "https://gen.pollinations.ai"
    ).replace(/\/+$/, "");
  }

  async request<T = unknown>(
    options: PollinationsRequestOptions,
  ): Promise<{ data: T; response: Response; durationMs: number }> {
    const url = `${this.baseUrl}${options.path.startsWith("/") ? options.path : "/" + options.path}`;
    const headers: Record<string, string> = {
      ...options.headers,
    };

    if (options.apiKey) {
      headers["Authorization"] = `Bearer ${options.apiKey}`;
    }

    if (
      options.body &&
      typeof options.body === "object" &&
      !(options.body instanceof FormData)
    ) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeoutMs = options.timeoutMs || 30000;
    const timeoutId = setTimeout(
      () => controller.abort("Request timeout"),
      timeoutMs,
    );

    const startTime = Date.now();
    try {
      const response = await fetch(url, {
        method: options.method || (options.body ? "POST" : "GET"),
        headers,
        body: options.body
          ? typeof options.body === "string" || options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body)
          : undefined,
        signal: controller.signal,
      });

      const durationMs = Date.now() - startTime;
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new UpstreamError(
          `Pollinations API returned ${response.status}: ${errorText.slice(0, 300)}`,
          response.status,
        );
      }

      const contentType = response.headers.get("content-type") || "";
      let data: T;
      if (contentType.includes("application/json")) {
        data = (await response.json()) as T;
      } else {
        data = (await response.text()) as unknown as T;
      }

      return { data, response, durationMs };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      if (err instanceof UpstreamError) throw err;
      if (err?.name === "AbortError" || err === "Request timeout") {
        throw new UpstreamError(
          `Pollinations upstream timeout after ${timeoutMs}ms`,
          504,
        );
      }
      throw new UpstreamError(
        `Failed to communicate with Pollinations API: ${err?.message || err}`,
        502,
      );
    }
  }

  async fetchRaw(
    options: PollinationsRequestOptions,
  ): Promise<{ response: Response; durationMs: number }> {
    const url = `${this.baseUrl}${options.path.startsWith("/") ? options.path : "/" + options.path}`;
    const headers: Record<string, string> = { ...options.headers };

    if (options.apiKey) {
      headers["Authorization"] = `Bearer ${options.apiKey}`;
    }

    if (
      options.body &&
      typeof options.body === "object" &&
      !(options.body instanceof FormData)
    ) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeoutMs = options.timeoutMs || 35000;
    const timeoutId = setTimeout(
      () => controller.abort("Request timeout"),
      timeoutMs,
    );

    const startTime = Date.now();
    try {
      const response = await fetch(url, {
        method: options.method || (options.body ? "POST" : "GET"),
        headers,
        body: options.body
          ? typeof options.body === "string" || options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body)
          : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new UpstreamError(
          `Pollinations API returned ${response.status}: ${errorText.slice(0, 300)}`,
          response.status,
        );
      }

      return { response, durationMs };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      if (err instanceof UpstreamError) throw err;
      if (err?.name === "AbortError" || err === "Request timeout") {
        throw new UpstreamError(
          `Pollinations upstream timeout after ${timeoutMs}ms`,
          504,
        );
      }
      throw new UpstreamError(
        `Failed to connect to Pollinations API: ${err?.message || err}`,
        502,
      );
    }
  }
}
