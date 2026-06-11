# Próximos passos — Swagger, integração frontend↔API e deploy

## 1. Swagger completo (documentar os ~25 endpoints novos)

**Hoje:** o backend serve Swagger UI em `/api/docs` a partir de um `openapi.json`
estático que só documenta `POST /auth/login`. A API funciona; falta documentá-la.

**Abordagem recomendada — gerar o spec a partir dos Zod schemas** (cada endpoint já
tem um schema Zod, então é a opção mais DRY e que não desatualiza):

- Lib: `@asteasolutions/zod-to-openapi` (compatível com Zod 3, que já usamos).
- Passos:
  1. Criar `backend/src/docs/registry.ts`: um `OpenAPIRegistry` onde registramos os
     schemas (request/response) e cada rota (método, path, tags, segurança, respostas).
  2. Registrar por feature: auth, usuarios, pecas, clientes, pedidos, caixa, estoque,
     montagem. Reaproveitar os schemas de `backend/src/schemas/*` e os enums.
  3. Adicionar o **bearer JWT** como security scheme (pra o botão "Authorize" do Swagger
     funcionar e dar pra testar os endpoints autenticados na própria página).
  4. Gerar o documento OpenAPI no boot e servir via `swagger-ui-express` (já instalado),
     substituindo o `openapi.json` estático.
  5. Conferir: cada endpoint aparece com corpo de request, respostas (200/400/401/403/
     404/409) e cadeado de auth.

> Alternativa mais simples de começar: `swagger-jsdoc` com comentários `@openapi` em
> cada rota. Mais verboso e fácil de desatualizar — por isso prefiro o caminho via Zod.

**Esforço:** ~meio dia. Entrega: `/api/docs` com tudo navegável e testável.

---

## 2. Conectar o frontend à API real

**Hoje:** o frontend é 100% mock (nenhum `fetch`). Os pontos de troca já estão marcados
no código (`core/auth.js`, e as funções `_fetch*`/`_submit*`/`_save*` de cada página).

**Passos:**
1. **Cliente HTTP** (`frontend/core/api.js`): base URL configurável, anexa o token JWT
   da sessão no header `Authorization`, trata `401` (refresh/logout), helpers de GET/POST.
2. **Auth** (`core/auth.js`): trocar o `login()` mock por `POST /api/auth/login`; guardar
   `accessToken`+`refreshToken`; no `_fetchSession()` mapear `perfil` (backend) → `role`
   (front). Mapear também o rótulo `login`↔`email` da tela de cadastro.
3. **Ligar cada página** às rotas reais:
   - **novo-pedido** (vendedor): buscar clientes/peças + `POST /api/pedidos`.
   - **caixa**: `GET /api/pedidos?status=aberto`, `POST /api/pedidos/:id/pagar` e `/cancelar`.
   - **estoque**: `iniciar-separacao`, `separar`, `enviar-montagem`, `devolver-caixa`.
   - **montador**: `iniciar-montagem`, `concluir`.
   - **cadastros** (admin): CRUD de usuarios/pecas/clientes.
4. **CORS:** ajustar `CORS_ORIGIN` no backend para a origem do frontend (em produção, o
   domínio público).

**⚠️ Ajuste necessário no backend (achei agora):** `GET /pecas` e `GET /clientes` estão
como **admin-only** (`requireAdmin`), mas a tela de **novo pedido** é do **vendedor** e
precisa buscar peças e clientes. Solução: liberar leitura dessas rotas para
`vendedor`/`caixa` (trocar `requireAdmin` por `requireRole(...)` nos GET de busca), ou
criar endpoints de busca dedicados. Pequeno, mas é pré-requisito pra ligar o novo-pedido.

**Esforço:** ~1–2 dias (depende de quantas telas ligar de uma vez).

---

## 3. Deploy em produção (URL pública)

**Realidade da arquitetura:**
- **Frontend** = arquivos estáticos → hospeda em qualquer lugar (fácil).
- **Backend** = Node/Express + TypeORM, **com estado** (Postgres, rate-limit em memória)
  → **NÃO** encaixa bem em serverless (Vercel). Precisa de um host Node "de verdade".
- **Banco** = Postgres → precisa de Postgres gerenciado ou self-hosted.

### Opções

**A) Tudo na sua VPS — RECOMENDADO (você já tem)**
- `docker-compose` de produção: **Postgres + backend (Node) + Nginx**.
- Nginx serve o frontend estático **e** faz proxy de `/api` → backend.
- **HTTPS** com Caddy ou Nginx+Certbot (Let's Encrypt) + um domínio.
- Uma única URL pública (`https://seu-dominio`). Controle total, custo baixo, encaixe
  perfeito pro stack.
- Passos: Dockerfile do backend (já existe) → compose prod → Nginx + TLS → `.env` de
  produção (JWT_SECRET forte, creds do banco, CORS = domínio) → rodar `migrate:up`+`seed`
  no primeiro deploy → (opcional) CI/CD via GitHub Actions + SSH.

**B) Split gerenciado — Frontend na Vercel + Backend/DB no Railway/Render/Fly.io**
- Frontend estático na **Vercel** (grátis, deploy automático do git).
- Backend + **Postgres gerenciado** no Railway/Render (rodam Node + DB sem configurar
  servidor). Menos administração de máquina, mais serviços/contas.

**C) Tudo na Vercel — NÃO recomendado**
- Exigiria reescrever o backend para serverless functions + Postgres externo
  (Neon/Supabase) + remover o rate-limit em memória. Bastante retrabalho.

### Recomendação
Como você **já tem uma VPS**, a **Opção A** dá a melhor relação custo/controle e uma URL
de produção com HTTPS. Se preferir zero administração de servidor, **Opção B**.

---

## Ordem sugerida de execução
1. Liberar leitura de peças/clientes (ajuste pequeno, destrava o novo-pedido).
2. Swagger completo (ajuda você e o colega a entender/integrar a API).
3. Conectar o frontend à API.
4. Deploy (A ou B).
