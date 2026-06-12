# AutoFluxo

Sistema de gestão de pedidos para oficinas/autopeças.

## Requisitos

- Node.js 18+
- Docker + docker-compose

## Como rodar

```bash
git clone <url-do-repo> && cd AutoFluxo
npm install
docker compose up -d db
cp .env.example .env
npm run build
NODE_ENV=production npm run migrate:up
NODE_ENV=production npm run migrate:seed
NODE_ENV=production node dist/server.js
```

API disponível em **http://localhost:4000** — Swagger em **http://localhost:4000/api/docs/**

Em outro terminal, sobe o frontend:

```bash
python3 -m http.server 3000 --directory frontend
```

Frontend em **http://localhost:3000/login.html**

### Credenciais de teste

| Perfil | Login | Senha |
|--------|-------|-------|
| Admin | `admin` | `admin123` |
| Caixa | `caixa` | `admin123` |
| Estoque | `estoque` | `admin123` |
| Montador | `montador` | `admin123` |
| Vendedor | `vendedor` | `admin123` |

> O `NODE_ENV=production` nos comandos de migrate/servidor é necessário para evitar um conflito de log no modo de desenvolvimento.

## Scripts

```bash
npm run build          # compilar TypeScript
npm run migrate:up     # aplicar migrations
npm run migrate:down   # reverter última migration
npm run migrate:seed   # popular dados de teste
npm test               # testes unitários
npm run test:ci        # testes + integração (requer banco rodando)
```

## Banco de dados

Ver [backend/db/README.md](backend/db/README.md) para estrutura de migrations.
