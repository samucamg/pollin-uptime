import { DEFAULT_SEARCH_TIMEOUT_MS } from "../constants/limits";
import { DEFAULT_SEARCH_FALLBACKS } from "../constants/models";
import type { ChatCompletionRequest, ChatMessage, EnvBindings } from "../types";
import { PollinationsClient } from "./pollinations";

export interface SearchResultItem {
  title: string;
  url: string;
  content: string;
}

export interface SearchExecutionResult {
  success: boolean;
  provider: string;
  query: string;
  results: SearchResultItem[];
  summary: string;
}

export interface FetchExecutionResult {
  success: boolean;
  provider: string;
  url: string;
  content: string;
}

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
   * Identifica URLs em mensagens para leitura / web fetch
   */
  static extractUrlFromMessages(messages: ChatMessage[]): string | null {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg || typeof lastUserMsg.content !== "string") return null;

    const urlMatch = lastUserMsg.content.match(
      /https?:\/\/[^\s<>"{}|\\^~[\]`]+/i,
    );
    return urlMatch ? urlMatch[0] : null;
  }

  // -------------------------------------------------------------
  // PROVEDORES DE BUSCA COM FREE TIER REAL
  // -------------------------------------------------------------

  /**
   * 1. SearXNG Self-Hosted (100% Gratuito $0, Ilimitado, sem cartão)
   */
  static async searchSearXNG(
    url: string,
    query: string,
    timeoutMs: number = 8000,
  ): Promise<SearchResultItem[] | null> {
    const cleanUrl = url?.trim();
    if (!cleanUrl) return null;
    try {
      const endpoint = `${cleanUrl.replace(/\/+$/, "")}/search?q=${encodeURIComponent(query)}&format=json`;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(id);

      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          return data.results.slice(0, 5).map((r: any) => ({
            title: r.title || "Untitled",
            url: r.url || "",
            content: r.content || "",
          }));
        }
      }
    } catch (err) {
      console.warn("SearXNG search error:", err);
    }
    return null;
  }

  /**
   * 2. Tavily Search (Free Tier Real: 1.000 requisições/mês sem cartão)
   */
  static async searchTavily(
    apiKey: string,
    query: string,
    timeoutMs: number = 8000,
  ): Promise<SearchResultItem[] | null> {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) return null;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: cleanKey,
          query,
          search_depth: "basic",
          max_results: 5,
        }),
        signal: controller.signal,
      });
      clearTimeout(id);

      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          return data.results.map((r: any) => ({
            title: r.title || "Untitled",
            url: r.url || "",
            content: r.content || "",
          }));
        }
      }
    } catch (err) {
      console.warn("Tavily search error:", err);
    }
    return null;
  }

  /**
   * 3. Google Serper (Free Tier Real: 2.500 buscas grátis na criação da conta sem cartão)
   */
  static async searchSerper(
    apiKey: string,
    query: string,
    timeoutMs: number = 8000,
  ): Promise<SearchResultItem[] | null> {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) return null;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": cleanKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, num: 5 }),
        signal: controller.signal,
      });
      clearTimeout(id);

      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data.organic) && data.organic.length > 0) {
          return data.organic.slice(0, 5).map((r: any) => ({
            title: r.title || "Untitled",
            url: r.link || "",
            content: r.snippet || "",
          }));
        }
      }
    } catch (err) {
      console.warn("Google Serper search error:", err);
    }
    return null;
  }

  /**
   * 4. DuckDuckGo HTML (100% Gratuito $0, Edge Fetching sem chave de API)
   */
  static async searchDuckDuckGo(
    query: string,
    timeoutMs: number = 8000,
  ): Promise<SearchResultItem[] | null> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch("https://html.duckduckgo.com/html/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        body: `q=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(id);

      if (res.ok) {
        const html = await res.text();
        const results: SearchResultItem[] = [];
        const regex =
          /<a class="result__url" href="([^"]+)".*?<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
        const match = regex.exec(html);
        while (match !== null && results.length < 5) {
          const rawUrl = match[1].replace(
            /\/\/duckduckgo\.com\/l\/\?uddg=/,
            "",
          );
          const decodedUrl = decodeURIComponent(rawUrl.split("&")[0]);
          const snippet = match[2].replace(/<[^>]+>/g, "").trim();
          if (decodedUrl && snippet) {
            results.push({
              title: "Web Result",
              url: decodedUrl,
              content: snippet,
            });
          }
        }

        if (results.length > 0) return results;
      }
    } catch (err) {
      console.warn("DuckDuckGo search error:", err);
    }
    return null;
  }

  /**
   * Despacha a busca para um slot específico (Slot 1 ou Slot 2)
   */
  private static async dispatchSearchSlot(
    type?: string,
    url?: string,
    key?: string,
    query: string = "",
  ): Promise<{ results: SearchResultItem[]; provider: string } | null> {
    const cleanType = type?.trim();
    const cleanUrl = url?.trim();
    const cleanKey = key?.trim();

    if (!cleanType) return null;

    if (cleanType === "searxng" && cleanUrl) {
      const res = await WebSearchRouter.searchSearXNG(cleanUrl, query);
      if (res && res.length > 0) return { results: res, provider: "searxng" };
    }

    if (cleanType === "tavily" && cleanKey) {
      const res = await WebSearchRouter.searchTavily(cleanKey, query);
      if (res && res.length > 0) return { results: res, provider: "tavily" };
    }

    if (cleanType === "serper" && cleanKey) {
      const res = await WebSearchRouter.searchSerper(cleanKey, query);
      if (res && res.length > 0) return { results: res, provider: "serper" };
    }

    if (cleanType === "duckduckgo") {
      const res = await WebSearchRouter.searchDuckDuckGo(query);
      if (res && res.length > 0)
        return { results: res, provider: "duckduckgo" };
    }

    return null;
  }

  /**
   * Executa a busca através dos 2 slots configurados + Fallback nativo Pollinations
   */
  static async search(
    env: EnvBindings,
    query: string,
  ): Promise<SearchExecutionResult> {
    // 1. Tenta Provedor de Busca 1
    const slot1 = await WebSearchRouter.dispatchSearchSlot(
      env.SEARCH_PROVIDER_1_TYPE,
      env.SEARCH_PROVIDER_1_URL,
      env.SEARCH_PROVIDER_1_KEY,
      query,
    );
    if (slot1) {
      const summary = slot1.results
        .map((r) => `- [${r.title}](${r.url}): ${r.content}`)
        .join("\n\n");
      return {
        success: true,
        provider: slot1.provider,
        query,
        results: slot1.results,
        summary,
      };
    }

    // 2. Tenta Provedor de Busca 2
    const slot2 = await WebSearchRouter.dispatchSearchSlot(
      env.SEARCH_PROVIDER_2_TYPE,
      env.SEARCH_PROVIDER_2_URL,
      env.SEARCH_PROVIDER_2_KEY,
      query,
    );
    if (slot2) {
      const summary = slot2.results
        .map((r) => `- [${r.title}](${r.url}): ${r.content}`)
        .join("\n\n");
      return {
        success: true,
        provider: slot2.provider,
        query,
        results: slot2.results,
        summary,
      };
    }

    // 3. Fallback Final: Modelos de Busca Nativos da Pollinations (gemini-search / perplexity-fast)
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
        const searchPrompt = `Pesquise e resuma de forma concisa e factual as informações mais recentes da internet sobre: "${query}". Seja objetivo e cite fontes se houver.`;

        const res = await client.request<{
          choices?: Array<{ message?: { content?: string } }>;
        }>({
          path: "/v1/chat/completions",
          method: "POST",
          apiKey: env.POLLINATIONS_API_KEY,
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
            success: true,
            provider: `pollinations:${searchModel}`,
            query,
            results: [
              {
                title: `Result via ${searchModel}`,
                url: "https://pollinations.ai",
                content: content.trim(),
              },
            ],
            summary: content.trim(),
          };
        }
      } catch (err) {
        console.warn(
          `Pollinations native search model ${searchModel} failed, trying next...`,
          err,
        );
      }
    }

    return {
      success: false,
      provider: "none",
      query,
      results: [],
      summary: "",
    };
  }

  // -------------------------------------------------------------
  // PROVEDORES DE WEB FETCH / SCRAPE (Jina Reader $0 e Firecrawl)
  // -------------------------------------------------------------

  /**
   * 1. Jina Reader (100% Gratuito $0, sem chave, Markdown limpo)
   */
  static async fetchJinaReader(
    targetUrl: string,
    timeoutMs: number = 10000,
  ): Promise<string | null> {
    try {
      const endpoint = `https://r.jina.ai/${targetUrl}`;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(endpoint, {
        headers: { Accept: "text/plain" },
        signal: controller.signal,
      });
      clearTimeout(id);

      if (res.ok) {
        const text = await res.text();
        return text.slice(0, 15000);
      }
    } catch (err) {
      console.warn("Jina Reader fetch error:", err);
    }
    return null;
  }

  /**
   * 2. Firecrawl (Free Tier: 500 créditos)
   */
  static async fetchFirecrawl(
    apiKey: string,
    targetUrl: string,
    customBaseUrl?: string,
    timeoutMs: number = 12000,
  ): Promise<string | null> {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) return null;
    try {
      const cleanCustomUrl = customBaseUrl?.trim();
      const baseUrl = (cleanCustomUrl || "https://api.firecrawl.dev").replace(
        /\/+$/,
        "",
      );
      const endpoint = `${baseUrl}/v1/scrape`;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({ url: targetUrl, formats: ["markdown"] }),
        signal: controller.signal,
      });
      clearTimeout(id);

      if (res.ok) {
        const data: any = await res.json();
        if (data.data?.markdown) {
          return data.data.markdown.slice(0, 15000);
        }
      }
    } catch (err) {
      console.warn("Firecrawl scrape error:", err);
    }
    return null;
  }

  /**
   * Executa web fetch através dos 2 slots configurados
   */
  static async fetchUrl(
    env: EnvBindings,
    targetUrl: string,
  ): Promise<FetchExecutionResult> {
    const type1 = env.FETCH_PROVIDER_1_TYPE?.trim() || "jina";
    const key1 = env.FETCH_PROVIDER_1_KEY?.trim();
    const url1 = env.FETCH_PROVIDER_1_URL?.trim();

    // 1. Tenta Fetch Slot 1 (Padrão Jina Reader $0 se não configurado)
    if (type1 === "jina") {
      const text = await WebSearchRouter.fetchJinaReader(targetUrl);
      if (text)
        return {
          success: true,
          provider: "jina-reader",
          url: targetUrl,
          content: text,
        };
    } else if (type1 === "firecrawl" && key1) {
      const text = await WebSearchRouter.fetchFirecrawl(key1, targetUrl, url1);
      if (text)
        return {
          success: true,
          provider: "firecrawl",
          url: targetUrl,
          content: text,
        };
    }

    // 2. Tenta Fetch Slot 2
    const type2 = env.FETCH_PROVIDER_2_TYPE?.trim();
    const key2 = env.FETCH_PROVIDER_2_KEY?.trim();
    const url2 = env.FETCH_PROVIDER_2_URL?.trim();

    if (type2 === "firecrawl" && key2) {
      const text = await WebSearchRouter.fetchFirecrawl(key2, targetUrl, url2);
      if (text)
        return {
          success: true,
          provider: "firecrawl",
          url: targetUrl,
          content: text,
        };
    } else if (type2 === "jina") {
      const text = await WebSearchRouter.fetchJinaReader(targetUrl);
      if (text)
        return {
          success: true,
          provider: "jina-reader",
          url: targetUrl,
          content: text,
        };
    }

    // 3. Fallback Direto Jina Reader
    const fallbackText = await WebSearchRouter.fetchJinaReader(targetUrl);
    if (fallbackText) {
      return {
        success: true,
        provider: "jina-reader",
        url: targetUrl,
        content: fallbackText,
      };
    }

    return {
      success: false,
      provider: "none",
      url: targetUrl,
      content: "",
    };
  }

  /**
   * Injeta os dados da busca no contexto da mensagem para o modelo de origem
   */
  static injectSearchResults(
    messages: ChatMessage[],
    searchSummary: string,
    provider: string,
  ): ChatMessage[] {
    if (!searchSummary) return messages;

    const contextMessage: ChatMessage = {
      role: "system",
      content: `=== INFORMAÇÕES DA WEB EM TEMPO REAL (BUSCA: ${provider}) ===
Resultados obtidos:
${searchSummary}
==============================================================
Instruções: Utilize os fatos e dados acima para responder de forma atualizada e precisa, mantendo seu próprio estilo e capacidade analítica.`,
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
