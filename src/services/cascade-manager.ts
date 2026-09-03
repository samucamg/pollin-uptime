import { MAX_FALLBACK_STEPS } from "../constants/limits";
import { DEFAULT_TEXT_FALLBACKS } from "../constants/models";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  EnvBindings,
} from "../types";
import { UpstreamError } from "../utils/errors";
import { ToolCallingEmulator } from "../utils/tool-emulator";
import { PollinationsClient } from "./pollinations";

export interface CascadeResult {
  response: ChatCompletionResponse | Response;
  modelUsed: string;
  attemptsCount: number;
  fallbackChain: string[];
  totalLatencyMs: number;
  toolMode: "native" | "emulated" | "none";
}

export class CascadeManager {
  private client: PollinationsClient;

  constructor(private env: EnvBindings) {
    this.client = new PollinationsClient(env);
  }

  /**
   * Constrói a lista de modelos da Pollinations
   */
  buildCascadeChain(
    primaryModel: string,
    clientHeaderFallbacks?: string,
  ): string[] {
    const chain: string[] = [primaryModel];

    if (clientHeaderFallbacks) {
      const models = clientHeaderFallbacks
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      for (const m of models) {
        if (!chain.includes(m) && chain.length < MAX_FALLBACK_STEPS) {
          chain.push(m);
        }
      }
    }

    const envFallbacks = [
      this.env.DEFAULT_FALLBACK_1 || DEFAULT_TEXT_FALLBACKS[0],
      this.env.DEFAULT_FALLBACK_2 || DEFAULT_TEXT_FALLBACKS[1],
      this.env.DEFAULT_FALLBACK_3 || DEFAULT_TEXT_FALLBACKS[2],
    ];

    for (const fb of envFallbacks) {
      if (!chain.includes(fb) && chain.length < MAX_FALLBACK_STEPS) {
        chain.push(fb);
      }
    }

    return chain;
  }

  /**
   * Executa chamada para Provedor Externo Compatível com OpenAI (Última Camada de Resiliência)
   */
  private async executeExternalFallback(
    req: ChatCompletionRequest,
    startTime: number,
    attempts: number,
    triedModels: string[],
  ): Promise<CascadeResult> {
    const externalUrl = this.env.EXTERNAL_FALLBACK_URL?.trim();
    const externalKey = this.env.EXTERNAL_FALLBACK_KEY?.trim();
    const externalModel = this.env.EXTERNAL_FALLBACK_MODEL?.trim() || req.model;

    if (!externalUrl || !externalKey) {
      throw new UpstreamError(
        "All Pollinations models failed and no external fallback provider is configured",
        502,
      );
    }

    console.info(
      `[Ultimate Failover] Invoking external OpenAI provider: ${externalUrl} (${externalModel})`,
    );
    const endpoint = `${externalUrl.replace(/\/+$/, "")}/chat/completions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort("External timeout"),
      30000,
    );

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${externalKey}`,
        },
        body: JSON.stringify({
          ...req,
          model: externalModel,
          stream: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new UpstreamError(
          `External provider returned ${res.status}: ${errText.slice(0, 200)}`,
          res.status,
        );
      }

      const data: any = await res.json();
      const totalLatencyMs = Date.now() - startTime;
      triedModels.push(`external:${externalModel}`);

      return {
        response: data,
        modelUsed: `${externalModel} (external)`,
        attemptsCount: attempts + 1,
        fallbackChain: triedModels,
        totalLatencyMs,
        toolMode: "native",
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new UpstreamError(
        `External fallback provider failed: ${err.message || err}`,
        502,
      );
    }
  }

  /**
   * Executa a requisição de Chat Completions através da cascata de 3 modelos + Provedor Externo
   */
  async executeChatCascade(
    req: ChatCompletionRequest,
    apiKey?: string,
    clientHeaderFallbacks?: string,
  ): Promise<CascadeResult> {
    const chain = this.buildCascadeChain(req.model, clientHeaderFallbacks);
    const timeoutMs = parseInt(this.env.CASCADE_TIMEOUT_MS || "25000", 10);
    const startTime = Date.now();

    let lastError: unknown = null;
    let attempts = 0;
    const triedModels: string[] = [];

    const hasTools = Array.isArray(req.tools) && req.tools.length > 0;
    let currentToolMode: "native" | "emulated" | "none" = hasTools
      ? "native"
      : "none";

    for (let i = 0; i < chain.length; i++) {
      const currentModel = chain[i];
      attempts++;
      triedModels.push(currentModel);

      try {
        const requestBody = { ...req, model: currentModel };

        if (currentToolMode === "emulated" && hasTools) {
          const systemMsg = requestBody.messages.find(
            (m) => m.role === "system",
          );
          const existingSystem =
            typeof systemMsg?.content === "string" ? systemMsg.content : "";
          const injectedSystem = ToolCallingEmulator.injectToolsPrompt(
            existingSystem,
            req.tools!,
            req.tool_choice,
          );

          requestBody.messages = requestBody.messages.map((m) =>
            m.role === "system" ? { ...m, content: injectedSystem } : m,
          );

          if (!systemMsg) {
            requestBody.messages.unshift({
              role: "system",
              content: injectedSystem,
            });
          }

          delete requestBody.tools;
          delete requestBody.tool_choice;
        }

        const res = await this.client.request<ChatCompletionResponse>({
          path: "/v1/chat/completions",
          method: "POST",
          body: requestBody,
          apiKey,
          timeoutMs,
        });

        const totalLatencyMs = Date.now() - startTime;
        const responseData = res.data;

        if (
          currentToolMode === "emulated" &&
          responseData?.choices?.[0]?.message?.content
        ) {
          const parsed = ToolCallingEmulator.extractToolCalls(
            responseData.choices[0].message.content,
          );
          if (parsed.toolCalls && parsed.toolCalls.length > 0) {
            responseData.choices[0].message.tool_calls = parsed.toolCalls;
            responseData.choices[0].message.content = parsed.textContent;
            responseData.choices[0].finish_reason = "tool_calls";
          }
        }

        return {
          response: responseData,
          modelUsed: currentModel,
          attemptsCount: attempts,
          fallbackChain: triedModels,
          totalLatencyMs,
          toolMode: currentToolMode,
        };
      } catch (err: any) {
        lastError = err;
        console.warn(
          `Cascade step ${i + 1} (${currentModel}) failed:`,
          err.message,
        );

        if (
          hasTools &&
          currentToolMode === "native" &&
          err?.statusCode === 400
        ) {
          console.info(
            `Model ${currentModel} rejected native tools. Switching to ToolCallingEmulator ReAct...`,
          );
          currentToolMode = "emulated";
        }
      }
    }

    // ÚLTIMA CAMADA DE RESILIÊNCIA: Provedor Externo (se configurado)
    const extUrl = this.env.EXTERNAL_FALLBACK_URL?.trim();
    const extKey = this.env.EXTERNAL_FALLBACK_KEY?.trim();
    if (extUrl && extKey) {
      try {
        return await this.executeExternalFallback(
          req,
          startTime,
          attempts,
          triedModels,
        );
      } catch (extErr) {
        console.error("External fallback also failed:", extErr);
      }
    }

    throw (
      lastError ||
      new UpstreamError("All models in fallback cascade failed", 502)
    );
  }

  /**
   * Executa streaming SSE através da cascata de 3 modelos
   */
  async executeChatStreamCascade(
    req: ChatCompletionRequest,
    apiKey?: string,
    clientHeaderFallbacks?: string,
  ): Promise<{
    response: Response;
    modelUsed: string;
    attemptsCount: number;
    fallbackChain: string[];
  }> {
    const chain = this.buildCascadeChain(req.model, clientHeaderFallbacks);
    const timeoutMs = parseInt(this.env.CASCADE_TIMEOUT_MS || "30000", 10);

    let lastError: unknown = null;
    let attempts = 0;
    const triedModels: string[] = [];

    for (let i = 0; i < chain.length; i++) {
      const currentModel = chain[i];
      attempts++;
      triedModels.push(currentModel);

      try {
        const requestBody = { ...req, model: currentModel, stream: true };
        const { response } = await this.client.fetchRaw({
          path: "/v1/chat/completions",
          method: "POST",
          body: requestBody,
          apiKey,
          timeoutMs,
        });

        return {
          response,
          modelUsed: currentModel,
          attemptsCount: attempts,
          fallbackChain: triedModels,
        };
      } catch (err) {
        lastError = err;
        console.warn(
          `Stream cascade step ${i + 1} (${currentModel}) failed to connect:`,
          err,
        );
      }
    }

    // Streaming com failover externo
    const extUrlStream = this.env.EXTERNAL_FALLBACK_URL?.trim();
    const extKeyStream = this.env.EXTERNAL_FALLBACK_KEY?.trim();
    if (extUrlStream && extKeyStream) {
      try {
        const extEndpoint = `${extUrlStream.replace(/\/+$/, "")}/chat/completions`;
        const extModel = this.env.EXTERNAL_FALLBACK_MODEL?.trim() || req.model;
        const res = await fetch(extEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${extKeyStream}`,
          },
          body: JSON.stringify({ ...req, model: extModel, stream: true }),
        });
        if (res.ok) {
          triedModels.push(`external:${extModel}`);
          return {
            response: res,
            modelUsed: `${extModel} (external)`,
            attemptsCount: attempts + 1,
            fallbackChain: triedModels,
          };
        }
      } catch (extErr) {
        console.error("External stream failover error:", extErr);
      }
    }

    throw (
      lastError ||
      new UpstreamError(
        "All models in streaming cascade failed to connect",
        502,
      )
    );
  }
}
