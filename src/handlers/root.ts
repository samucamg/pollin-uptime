import type { Context } from "hono";
import type { HonoEnv } from "../types";

export function handleHealthCheck(c: Context<HonoEnv>) {
  const accept = c.req.header("accept") || "";

  // Se o cliente for um navegador web solicitando HTML
  if (accept.includes("text/html")) {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>pollin-uptime · Powered by Pollinations.ai</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090a0f;
      --card-bg: rgba(18, 20, 29, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #8b5cf6;
      --primary-glow: rgba(139, 92, 246, 0.35);
      --accent: #10b981;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --code-bg: rgba(0, 0, 0, 0.4);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: var(--bg);
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.15) 0%, transparent 60%),
        radial-gradient(circle at 100% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 40%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2.5rem 1.25rem;
    }
    .container {
      max-width: 860px;
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 2.5rem;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      padding: 0.35rem 0.9rem;
      border-radius: 9999px;
      font-size: 0.82rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 0.75rem;
      background: linear-gradient(135deg, #ffffff 30%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 1.05rem;
      color: var(--text-muted);
      line-height: 1.6;
      max-width: 620px;
      margin: 0 auto;
    }
    .powered-card {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%);
      border: 1px solid rgba(139, 92, 246, 0.35);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 8px 32px var(--primary-glow);
      backdrop-filter: blur(12px);
      text-align: center;
    }
    .powered-title {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    .powered-link {
      color: #c084fc;
      text-decoration: none;
      border-bottom: 2px solid #c084fc;
      transition: all 0.2s ease;
    }
    .powered-link:hover {
      color: #e9d5ff;
      border-color: #e9d5ff;
    }
    .powered-desc {
      font-size: 0.95rem;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .powered-actions {
      margin-top: 1rem;
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: #7c3aed;
      color: #fff;
    }
    .btn-primary:hover {
      background: #6d28d9;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid var(--card-border);
      color: var(--text);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1rem;
      padding: 1.75rem;
      margin-bottom: 1.5rem;
      backdrop-filter: blur(12px);
    }
    h2 {
      font-size: 1.15rem;
      font-weight: 700;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }
    .feature-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--card-border);
      border-radius: 0.6rem;
      padding: 0.85rem;
    }
    .feature-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 0.25rem;
    }
    .feature-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .endpoint-list {
      list-style: none;
    }
    .endpoint-item {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      padding: 0.6rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.875rem;
    }
    .endpoint-item:last-child {
      border-bottom: none;
    }
    .method {
      font-weight: 700;
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 0.3rem;
      letter-spacing: 0.03em;
    }
    .method.post { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .method.get { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .path {
      font-family: monospace;
      color: #f1f5f9;
      font-weight: 600;
    }
    .endpoint-desc {
      color: var(--text-muted);
      margin-left: auto;
      font-size: 0.8rem;
    }
    footer {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--card-border);
    }
    footer a {
      color: #a78bfa;
      text-decoration: none;
    }
    footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="status-badge">
        <span class="status-dot"></span>
        <span>Gateway Online & Operacional</span>
      </div>
      <h1>pollin-uptime</h1>
      <p class="subtitle">
        Gateway Serverless de Alta Disponibilidade com Cascata de 4 Níveis e Desvio de Busca Web em Tempo Real.
      </p>
    </div>

    <!-- BLOCO OBRIGATÓRIO DE DESTAQUE: POWERED BY POLLINATIONS.AI -->
    <div class="powered-card">
      <div class="powered-title">
        <span>⚡ Powered by</span>
        <a href="https://pollinations.ai" target="_blank" rel="noopener noreferrer" class="powered-link">Pollinations.ai</a>
      </div>
      <p class="powered-desc">
        Todos os modelos de IA, inferência generativa de texto, visão computacional, síntese de voz (TTS) e geração de imagens deste gateway são fornecidos e viabilizados pela plataforma descentralizada <strong>Pollinations.ai</strong>.
      </p>
      <div class="powered-actions">
        <a href="https://pollinations.ai" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
          🌐 Conheça a Pollinations.ai
        </a>
        <a href="https://enter.pollinations.ai/keys" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
          🔑 Obter API Key (enter.pollinations.ai)
        </a>
      </div>
    </div>

    <div class="card">
      <h2>🔌 Matriz de Endpoints Disponíveis</h2>
      <ul class="endpoint-list">
        <li class="endpoint-item">
          <span class="method post">POST</span>
          <span class="path">/v1/chat/completions</span>
          <span class="endpoint-desc">Chat OpenAI-compatível com cascata e busca web</span>
        </li>
        <li class="endpoint-item">
          <span class="method post">POST</span>
          <span class="path">/v1/messages</span>
          <span class="endpoint-desc">API Anthropic Claude compatível</span>
        </li>
        <li class="endpoint-item">
          <span class="method get">GET</span>
          <span class="path">/v1/models</span>
          <span class="endpoint-desc">Catálogo unificado de modelos com cache inteligente</span>
        </li>
        <li class="endpoint-item">
          <span class="method post">POST</span>
          <span class="path">/v1/images/generations</span>
          <span class="endpoint-desc">Geração de imagens (Flux, etc.)</span>
        </li>
        <li class="endpoint-item">
          <span class="method post">POST</span>
          <span class="path">/v1/audio/speech</span>
          <span class="endpoint-desc">Síntese de voz Text-to-Speech (TTS)</span>
        </li>
      </ul>
    </div>

    <div class="card">
      <h2>🛡️ Recursos de Resiliência</h2>
      <div class="features-grid">
        <div class="feature-item">
          <div class="feature-title">Cascata de 4 Níveis</div>
          <div class="feature-desc">Failover inteligente entre modelos e provedor de emergência externo.</div>
        </div>
        <div class="feature-item">
          <div class="feature-title">Busca Web em Tempo Real</div>
          <div class="feature-desc">Integração nativa com SearXNG privado e DuckDuckGo $0 sem chave.</div>
        </div>
        <div class="feature-item">
          <div class="feature-title">Cloudflare Edge</div>
          <div class="feature-desc">Execução serverless global com latência ultrabaixa e zero cold starts.</div>
        </div>
      </div>
    </div>

    <footer>
      <p>
        pollin-uptime v1.0.0 · Core AI Infrastructure powered by 
        <a href="https://pollinations.ai" target="_blank" rel="noopener noreferrer">Pollinations.ai</a>
      </p>
    </footer>
  </div>
</body>
</html>`;
    return c.html(html);
  }

  // Resposta padrão JSON (para cURL, monitoramento ou chamadas de API)
  return c.json({
    status: "ok",
    service: "pollin-uptime",
    version: "1.0.0",
    powered_by: "Pollinations.ai",
    provider_url: "https://pollinations.ai",
    provider_portal: "https://enter.pollinations.ai",
    attribution:
      "All generative AI models, text inference, vision, image generation, and audio synthesis are powered by the Pollinations.ai ecosystem (https://pollinations.ai)",
    description:
      "High Availability Serverless AI Gateway for Pollinations.ai with 4-Tier Fallback Cascade & Search-Augmented Generation",
    features: {
      cascade_fallback: true,
      max_fallback_steps: 4,
      search_augmented_generation: true,
      hybrid_tool_calling: true,
      openai_compatible: true,
      anthropic_compatible: true,
    },
    uptime: "always online",
    timestamp: new Date().toISOString(),
  });
}
