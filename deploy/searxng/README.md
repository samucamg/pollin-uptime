# 🔍 SearXNG Self-Hosted para pollin-uptime

Deploy do seu próprio motor de meta-pesquisa SearXNG 100% gratuito, sem limites de API e sem necessidade de cartão de crédito.

## 🚀 Opção 1: Docker Compose

1. Entre na pasta do deploy:
   ```bash
   cd deploy/searxng
   ```
2. Inicie os containers:
   ```bash
   docker compose up -d
   ```
3. O SearXNG estará disponível em `http://SEU_IP:8080`.
4. Configure a URL no seu Worker (em `.dev.vars` ou Secrets da Cloudflare):
   ```env
   SEARCH_PROVIDER_1_TYPE=searxng
   SEARCH_PROVIDER_1_URL=http://SEU_IP:8080
   ```

## 🚢 Opção 2: Portainer Web UI (Stack em 1 clique)

1. No seu Portainer, acesse **Stacks** ➔ **Add stack**.
2. Dê o nome `searxng`.
3. Cole o conteúdo de `portainer-stack.yml` no editor web.
4. Clique em **Deploy the stack**.
5. Pronto! O endpoint de busca JSON estará ativo na porta 8080.
