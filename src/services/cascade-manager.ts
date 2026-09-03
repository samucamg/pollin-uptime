import { GATEWAY_HEADERS, MAX_FALLBACK_STEPS } from "../constants/limits";
import {
  DEFAULT_CODE_FALLBACKS,
  DEFAULT_IMAGE_FALLBACKS,
  DEFAULT_TEXT_FALLBACKS,
} from "../constants/models";
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
   * Constrói a lista de 3 modelos ordenados (Primário -> Fallback 1 -> Fallback 2)
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

    // Preenche com os defaults configurados no Worker
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
   * Executa a requisição de Chat Completions através da cascata de 3 modelos
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

        // Se estivermos em modo emulado de tools, injetamos ReAct no system prompt e removemos tools nativas
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

        // Se o modelo respondeu em modo emulado, extrai o tool_calls do texto
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

        // Se o modelo falhou por não suportar 'tools' (400), chaveamos para modo emulado antes de desistir
        if (
          hasTools &&
          currentToolMode === "native" &&
          err?.statusCode === 400
        ) {
          console.info(
            `Model ${currentModel} rejected native tools. Switching to ToolCallingEmulator ReAct...`,
          );
          currentToolMode = "emulated";
          // Tenta novamente este mesmo modelo ou o próximo com o emulador
        }
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

        // Sucesso ao estabelecer o stream inicial
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

    throw (
      lastError ||
      new UpstreamError(
        "All models in streaming cascade failed to connect",
        502,
      )
    );
  }
}
