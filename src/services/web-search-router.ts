import { DEFAULT_SEARCH_TIMEOUT_MS } from "../constants/limits";
import { DEFAULT_SEARCH_FALLBACKS } from "../constants/models";
import type { ChatCompletionRequest, ChatMessage, EnvBindings } from "../types";
import { PollinationsClient } from "./pollinations";

export class WebSearchRouter {
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

    // Detecta se a última mensagem do usuário pede busca explícita
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
   * Executa a busca delegada no modelo mais barato com fallback
   */
  static async executeSearch(
    env: EnvBindings,
    query: string,
    apiKey?: string,
  ): Promise<{ searchSummary: string; modelUsed: string; success: boolean }> {
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

    // Insere logo antes da última mensagem do usuário ou após o prompt de sistema inicial
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
