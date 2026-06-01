# 🔧 AutoFluxo - Sistema de Gestão de Pedidos para Oficinas

> **Status**: Em desenvolvimento com plano de execução detalhado  
> **Fase Atual**: Infraestrutura de segurança e qualidade (✅ Completa)  
> **Próxima Fase**: Base de dados e persistência

---

## 📋 Documentação do Projeto

### 🎯 Começar Aqui
- **[PLAN_QUICKSTART.md](PLAN_QUICKSTART.md)** - Visão geral do plano em 5 minutos

### 📊 Planejamento Detalhado
- **[ROADMAP.md](ROADMAP.md)** - Roadmap completo com 6 tarefas em 3 fases (25-30h)
- **[CHECKLIST.md](CHECKLIST.md)** - Checklist executável com comandos específicos
- **[TECHNICAL_DECISIONS.md](TECHNICAL_DECISIONS.md)** - Decisões técnicas e trade-offs

### 📝 Análise e Melhorias
- **[REVIEW.md](REVIEW.md)** - Revisão de segurança e código (Nota: 4.5/10 → 7.0/10)
- **[IMPROVEMENTS.md](IMPROVEMENTS.md)** - Melhorias implementadas

### 📚 Banco de Dados
- **[backend/db/README.md](backend/db/README.md)** - Estrutura de migrations
- **[backend/db/migrations/001_create_tables.sql](backend/db/migrations/001_create_tables.sql)** - SQL das 8 tabelas

---

## 🚀 Quick Start

### Instalação
```bash
npm install
```

### Desenvolvimento
```bash
# Com JWT_SECRET configurado
JWT_SECRET=dev_secret_here npm run dev

# Servidor roda em http://localhost:4000
```

### Validação
```bash
# Lint
npm run lint

# Format
npm run format

# Build
npm run build

# Testes (em fase 2)
npm test
```

---

## 🏗️ Arquitetura Atual

```
backend/src/
├── config/
│   └── env.ts              # Validação de variáveis de ambiente
├── lib/
│   └── logger.ts           # Logger estruturado (Pino)
├── controllers/
│   ├── authController.ts   # Login/Logout com validação
│   └── rootController.ts
├── services/
│   ├── authService.ts      # JWT (HS256, 8h, validação algoritmo)
│   ├── userService.ts      # Usuários (TODO: migrar para BD)
│   └── refreshTokenService.ts # Refresh tokens (TODO: BD)
├── middleware/
│   ├── authMiddleware.ts   # Token validation
│   ├── errorHandler.ts     # Error handling com mascaramento
│   └── rateLimiter.ts      # Rate limiting (5/15min login)
├── routes/
│   ├── auth.ts             # POST /auth/login, /auth/logout
│   └── index.ts
├── schemas/
│   └── auth.ts             # Zod validation schemas
└── types/
    └── express/            # Type augmentation
```

---

## 🔒 Segurança Implementada

✅ **Autenticação JWT**
- Access token: 8h (HS256)
- Refresh token: 7 dias
- Validação de algoritmo
- Payload: `{id, login, perfil, iat, exp}`

✅ **Proteção HTTP**
- Helmet para headers seguros
- CORS com whitelist
- Rate limiting no login (5 req/15min)

✅ **Validação**
- Zod schemas para input validation
- Bcrypt com 12 salt rounds
- Tratamento seguro de erros

✅ **Logging**
- Auditoria de login/falhas
- Logging estruturado com Pino
- Sem exposição de stack traces em produção

---

## 📊 Plano de Desenvolvimento (ROADMAP)

### FASE 1: DATABASE (1-2 semanas) ⏳ TODO
```
[ ] PostgreSQL + TypeORM integration
[ ] Migrar usuários para BD (removendo hardcoded)
[ ] Refresh tokens persistidos em BD
[ ] Migrations CLI (up/down/seed)
```

### FASE 2: TESTES (1-2 semanas) ⏳ TODO
```
[ ] Jest + Supertest estruturado
[ ] Auth service tests (80%+)
[ ] Controller e middleware tests
[ ] Coverage CI checks
```

### FASE 3: DEVOPS (1-2 semanas) ⏳ TODO
```
[ ] Auto migrations on startup
[ ] Swagger/OpenAPI documentation
[ ] Commitlint + Husky
[ ] GitHub Actions CI/CD
[ ] Docker setup (bonus)
```

**Tempo Total**: ~25-30 horas | ~3-4 semanas

---

## 📚 Endpoints Atuais

### Autenticação (Sem Rate Limit em Dev)
```bash
# Login
POST /api/auth/login
Content-Type: application/json

{
  "login": "admin",
  "senha": "admin123"
}

# Response
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "abc123...",
  "expiresIn": 28800
}

# Logout
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "abc123..."
}
```

### Protegido
```bash
# Qualquer rota após /api/auth precisa de token
GET /api/
Authorization: Bearer <accessToken>
```

---

## 🛠️ Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento com hot reload
npm run build        # Compilar TypeScript
npm run start        # Rodar servidor built
npm run lint         # ESLint
npm run format       # Prettier
npm test             # Jest (phase 2)

# Migrations (phase 1)
npm run migrate:up       # Aplicar pendentes
npm run migrate:down     # Reverter última
npm run migrate:seed     # Popular com dados teste
npm run test:coverage    # Coverage report
```

---

## 🔑 Variáveis de Ambiente

```env
# Servidor
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:3000

# Database (Phase 1)
DB_HOST=localhost
DB_PORT=5432
DB_USER=autofluxo_user
DB_PASSWORD=secure_password
DB_NAME=autofluxo

# Autenticação
JWT_SECRET=your_secret_with_at_least_32_chars

# Integrações
OPENAI_API_KEY=optional_for_future
```

Copiar `.env.example` para `.env` e configurar.

---

## 📈 Notas de Progresso

| Fase | Status | Nota |
|------|--------|------|
| Estrutura Base | ✅ Completa | TypeScript, ESLint, Prettier |
| Segurança | ✅ Completa | JWT, CORS, Rate Limit, Validação |
| Logging | ✅ Completa | Pino estruturado |
| Database | ⏳ TODO | TypeORM + PostgreSQL |
| Testes | ⏳ TODO | Jest + coverage |
| DevOps | ⏳ TODO | Swagger, Commitlint, CI/CD |

---

## 🤝 Contribuindo

1. Ler [TECHNICAL_DECISIONS.md](TECHNICAL_DECISIONS.md) para entender decisões
2. Usar [CHECKLIST.md](CHECKLIST.md) durante implementação
3. Seguir [Conventional Commits](https://www.conventionalcommits.org/) (quando Commitlint ativar)
4. Manter testes acima de 80% (quando testes ativarem)

---

## 📞 Status e Próximos Passos

**Última atualização**: 1 de junho de 2026  
**Commits recentes**:
- ✅ `refactor: melhorias de segurança, logging e qualidade de código`
- ✅ `docs: adicionar plano de execução completo (roadmap)`

**Próximo passo**: 
👉 Ler [PLAN_QUICKSTART.md](PLAN_QUICKSTART.md) e iniciar FASE 1

---

## 📖 Recursos

- [Node.js](https://nodejs.org)
- [Express](https://expressjs.com)
- [TypeScript](https://www.typescriptlang.org)
- [TypeORM](https://typeorm.io) (próximo)
- [Jest](https://jestjs.io) (próximo)
- [GitHub Actions](https://docs.github.com/actions) (próximo)

---

**AutoFluxo** - Transformando oficinas em operações eficientes 🏎️
