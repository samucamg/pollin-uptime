import { DEFAULT_SEARCH_TIMEOUT_MS } from "../constants/limits";
import { DEFAULT_SEARCH_FALLBACKS } from "../constants/models";
import type { ChatCompletionRequest, ChatMessage, EnvBindings } from "../types";
import { PollinationsClient } from "./pollinations";

export class WebSearchRouter {
  /**
   * Identifica URLs em mensagens para interceptação com Jina Reader ($0)
   */
  static extractUrlFromMessages(messages: ChatMessage[]): string | null {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg || typeof lastUserMsg.content !== "string") return null;

    const urlMatch = lastUserMsg.content.match(
      /https?:\/\/[^\s<>"{}|\\^~[\]`]+/i,
    );
    return urlMatch ? urlMatch[0] : null;
  }

  /**
   * Busca conteúdo limpo de URLs via Jina Reader (r.jina.ai - Gratuito $0)
   */
  static async fetchWithJinaReader(
    targetUrl: string,
    timeoutMs: number = 10000,
  ): Promise<string | null> {
    try {
      const jinaUrl = `https://r.jina.ai/${targetUrl}`;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(jinaUrl, {
        headers: { Accept: "text/plain" },
        signal: controller.signal,
      });
      clearTimeout(id);

      if (res.ok) {
        const text = await res.text();
        return text.slice(0, 15000); // Limita tamanho para caber no contexto
      }
    } catch (err) {
      console.warn("Jina Reader fetch failed:", err);
    }
    return null;
  }

  /**
   * Identifica se a requisição precisa de busca na Web
   */
  static shouldPerformSearch(
    req: ChatCompletionRequest,
    headerSearch?: string,
  ): boolean {
    if (headerSearch === "true" || req.web_search === true) return true;
    if (
      req.web_search_options &&
      Object.keys(req.web_search_options).length > 0
    )
      return true;

    const lastUserMsg = [...(req.messages || [])]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUserMsg || typeof lastUserMsg.content !== "string") return false;

    const content = lastUserMsg.content.toLowerCase();
    const searchKeywords = [
      "busque na web",
      "pesquise na web",
      "procure na internet",
      "search the web",
      "search online",
      "notícias de hoje",
      "preço atual de",
    ];

    return searchKeywords.some((kw) => content.includes(kw));
  }

  /**
   * Extrai a query de pesquisa do histórico recente
   */
  static extractSearchQuery(messages: ChatMessage[]): string {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg || !lastUserMsg.content) return "";
    if (typeof lastUserMsg.content === "string")
      return lastUserMsg.content.trim();
    if (Array.isArray(lastUserMsg.content)) {
      const textPart = lastUserMsg.content.find((p) => p.type === "text");
      return textPart?.text?.trim() || "";
    }
    return "";
  }

  /**
   * Executa busca no SearXNG se configurado
   */
  static async searchWithSearXNG(
    searxngUrl: string,
    query: string,
    timeoutMs: number = 8000,
  ): Promise<string | null> {
    try {
      const endpoint = `${searxngUrl.replace(/\/+$/, "")}/search?q=${encodeURIComponent(query)}&format=json`;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(id);

      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          const topResults = data.results
            .slice(0, 5)
            .map((r: any) => `- [${r.title}](${r.url}): ${r.content || ""}`);
          return topResults.join("\n\n");
        }
      }
    } catch (err) {
      console.warn("SearXNG search error:", err);
    }
    return null;
  }

  /**
   * Executa a busca delegada no modelo mais barato com fallback
   */
  static async executeSearch(
    env: EnvBindings,
    query: string,
    apiKey?: string,
  ): Promise<{ searchSummary: string; modelUsed: string; success: boolean }> {
    // 0. Tenta Provedor Externo Dedicado de Busca se configurado
    if (env.EXTERNAL_SEARCH_URL && env.EXTERNAL_SEARCH_KEY) {
      try {
        const extEndpoint = `${env.EXTERNAL_SEARCH_URL.replace(/\/+$/, "")}/chat/completions`;
        const extModel = env.EXTERNAL_SEARCH_MODEL || "sonar";
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(extEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.EXTERNAL_SEARCH_KEY}`,
          },
          body: JSON.stringify({
            model: extModel,
            messages: [
              {
                role: "user",
                content: `Pesquise e resuma fatos recentes sobre: "${query}". Seja objetivo e cite fontes.`,
              },
            ],
            temperature: 0.2,
            max_tokens: 800,
          }),
          signal: controller.signal,
        });
        clearTimeout(id);

        if (res.ok) {
          const data: any = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && content.trim().length > 20) {
            return {
              searchSummary: content.trim(),
              modelUsed: `${extModel} (external-search)`,
              success: true,
            };
          }
        }
      } catch (err) {
        console.warn(
          "External web search provider failed, falling back to next provider:",
          err,
        );
      }
    }

    // 1. Tenta SearXNG se configurado
    if (env.SEARXNG_URL) {
      const searxngResults = await WebSearchRouter.searchWithSearXNG(
        env.SEARXNG_URL,
        query,
      );
      if (searxngResults) {
        return {
          searchSummary: searxngResults,
          modelUsed: "searxng-search",
          success: true,
        };
      }
    }

    // 2. Desvia para modelo de busca mais barato da Pollinations (gemini-search / perplexity)
    const searchModels = [
      env.DEFAULT_SEARCH_MODEL || DEFAULT_SEARCH_FALLBACKS[0],
      env.SEARCH_FALLBACK_MODEL || DEFAULT_SEARCH_FALLBACKS[1],
      DEFAULT_SEARCH_FALLBACKS[2],
    ];

    const client = new PollinationsClient(env);
    const timeoutMs = parseInt(
      env.SEARCH_TIMEOUT_MS || `${DEFAULT_SEARCH_TIMEOUT_MS}`,
      10,
    );

    for (const searchModel of searchModels) {
      try {
        const searchPrompt = `Pesquise e resuma de forma concisa e factual as informações mais recentes e precisas da internet sobre: "${query}". Inclua fontes ou datas se aplicável.`;

        const res = await client.request<{
          choices?: Array<{ message?: { content?: string } }>;
        }>({
          path: "/v1/chat/completions",
          method: "POST",
          apiKey,
          timeoutMs,
          body: {
            model: searchModel,
            messages: [{ role: "user", content: searchPrompt }],
            temperature: 0.2,
            max_tokens: 800,
          },
        });

        const content = res.data?.choices?.[0]?.message?.content;
        if (content && content.trim().length > 20) {
          return {
            searchSummary: content.trim(),
            modelUsed: searchModel,
            success: true,
          };
        }
      } catch (err) {
        console.warn(
          `Web search failed on model ${searchModel}, trying next fallback:`,
          err,
        );
      }
    }

    return {
      searchSummary: "",
      modelUsed: "none",
      success: false,
    };
  }

  /**
   * Injeta o contexto de busca factual na mensagem antes de enviar para o modelo original
   */
  static injectSearchResults(
    messages: ChatMessage[],
    searchSummary: string,
    searchModel: string,
  ): ChatMessage[] {
    if (!searchSummary) return messages;

    const contextMessage: ChatMessage = {
      role: "system",
      content: `=== INFORMAÇÕES DA WEB EM TEMPO REAL (PESQUISA ATUALIZADA) ===
Dados obtidos via busca na web (${searchModel}):
${searchSummary}
==============================================================
Instruções: Use os dados acima para enriquecer sua resposta com fatos atualizados, mantendo seu próprio estilo e raciocínio.`,
    };

    const cloned = [...messages];
    const systemIndex = cloned.findIndex((m) => m.role === "system");

    if (systemIndex !== -1) {
      cloned.splice(systemIndex + 1, 0, contextMessage);
    } else {
      cloned.unshift(contextMessage);
    }

    return cloned;
  }
}
