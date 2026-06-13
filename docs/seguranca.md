# Bateria de Segurança — AutoFluxo (pré-entrega)

**Data:** 2026-06-13 · **Escopo:** backend (Express + TypeScript + TypeORM + Postgres) · **Resultado:** ✅ zero vulnerabilidades críticas

## Metodologia

Bateria adversarial de **integração HTTP**: o app real é montado por `createApp()` e exercitado via `supertest` contra um Postgres dedicado (`autofluxo_test`), disparando os ataques de fato (não apenas mocks). Complementada pelos 324 testes unitários da suíte mockada.

- Bateria: [`backend/src/__tests__/integration/security.itest.ts`](../backend/src/__tests__/integration/security.itest.ts) — **14/14 verde**
- Reproduzir: `set -a && . ./.env && set +a && npm run test:integration` (e `npm test` para os unitários)

## Checklist do ticket → evidência

| Item | Verificação | Resultado |
|---|---|---|
| **SQLi** — `' OR 1=1 --` nos campos de busca | `security.itest`: busca de clientes e filtro de status de pedidos retornam **vazio** (payload tratado como literal, sem bypass) | ✅ |
| **SQLi** — Prepared Statements em todo o código | ILIKE `:q` ([clienteService](../backend/src/services/clienteService.ts)), QueryBuilder `:status` ([pedidoQuery](../backend/src/services/pedidoQuery.ts)), `$1::date` ([relatorioService](../backend/src/services/relatorioService.ts)); `'; DROP TABLE clientes; --` **não altera o schema** | ✅ |
| **Authz** — Vendedor em `GET /relatorios` → 403 | `security.itest` "vendedor em GET /relatorios → 403" | ✅ |
| **Authz** — Montador em `POST /pedidos` → 403 | `security.itest` "montador em POST /pedidos → 403" | ✅ |
| **Authz** — Token expirado → 401 | `security.itest` "token expirado → 401" (JWT HS256 expirado) | ✅ |
| **IA** — Query `DELETE FROM` → 400 | `assertSafeSelect` bloqueia DDL/DML ([sqlGuard](../backend/src/lib/sqlGuard.ts)) + [sqlGuard.test.ts](../backend/src/__tests__/unit/lib/sqlGuard.test.ts) | ✅ |
| **IA** — Query referenciando `senha_hash` → 400 | `assertSafeSelect` bloqueia colunas sensíveis (`\bsenha`, `token`, `refresh_token`) | ✅ |
| **Senhas** — nenhuma senha em texto puro no banco | `security.itest`: `senhaHash` casa `^\$2[aby]\$` (bcrypt, cost 12) e `!=` senha em claro | ✅ |

**Bônus verificados:** requisição sem token → 401; requisição sem header anti-CSRF `X-Requested-With` → 400.

**Auditoria (Ticket de logs, critérios reconfirmados na bateria):** login falho grava `usuario_id=null` + IP sem vazar a senha; login bem-sucedido grava `usuario_id`; `GET /api/z_admin/logs` responde 200 paginado para admin e 403 para vendedor.

## Defesa em profundidade (resumo)

- **SQL:** consultas parametrizadas (TypeORM QueryBuilder / `pg` `$n`) — sem concatenação de input do usuário.
- **AuthN/AuthZ:** JWT HS256 (expira em 8h) validado no `authMiddleware`; RBAC `requireRole`/`requireAdmin` (401 sem token, 403 perfil incorreto).
- **Módulo IA (NL→SQL):** `assertSafeSelect` (apenas `SELECT`, sem `;`, bloqueia DDL/DML e colunas sensíveis) + role Postgres `autofluxo_readonly` (somente `GRANT SELECT`, sem `senhaHash`/`refresh_tokens`) + `statement_timeout` 5s + `LIMIT 100` + rate limit.
- **Senhas:** bcrypt (cost 12); respostas de usuário nunca expõem `senhaHash`.
- **Auditoria:** `logs_acao` com `sanitizeDetalhe` redigindo `senha/senhaHash/token/secret/password`.
- **Cabeçalhos/transporte:** Helmet (CSP, `noSniff`, HSTS em produção), CORS por allowlist, guard anti-CSRF (`X-Requested-With`), rate limiting (login 5/15min, API 100/min, busca IA 10/min).

## Conclusão

Todos os itens do checklist foram exercitados e aprovados. **Nenhuma vulnerabilidade crítica encontrada.** A bateria fica versionada e é reexecutável localmente antes de cada entrega.
