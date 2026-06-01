# Decisões Técnicas - AutoFluxo

## 1. Escolha do ORM (CRÍTICA)

### Opção A: TypeORM
**Voto**: ✅ RECOMENDADO

**Vantagens**:
- ✅ Mais popular em projetos Node + TypeScript
- ✅ Excelente suporte a migrations
- ✅ Decorators (sintaxe elegante)
- ✅ Melhor comunidade e mais exemplos
- ✅ Suporte nativo a relacionamentos
- ✅ Query builder forte

**Desvantagens**:
- ❌ Um pouco mais pesado (maior bundle)
- ❌ Magic dos decorators pode confundir
- ❌ Performance inferior ao Drizzle em casos complexos

**Implementação**:
```bash
npm install typeorm reflect-metadata pg
npm install -D ts-node
```

---

### Opção B: Drizzle ORM
**Status**: Alternativa

**Vantagens**:
- ✅ Muito mais leve
- ✅ Type-safe por default
- ✅ Query builder mais explícito
- ✅ Melhor performance
- ✅ Menos boilerplate

**Desvantagens**:
- ❌ Comunidade menor
- ❌ Menos exemplos online
- ❌ Curva de aprendizado maior
- ❌ Migrations são JSON (menos flexível)

**Implementação**:
```bash
npm install drizzle-orm
npm install -D drizzle-kit
```

---

### Opção C: Raw SQL + SQL.js / Knex
**Status**: Não recomendado

**Motivo**: Perderíamos type safety, que é principal benefício do TypeScript

---

### DECISÃO FINAL: ✅ TypeORM
- Escolhido por: simplicidade, comunidade, migrations
- Data: 1 de junho de 2026
- Prioridade: Implementar em 1.1

---

## 2. Estrutura de Conexão do Banco

### Padrão A: DataSource Singleton
**Status**: ✅ SELECIONADO

```typescript
// lib/database.ts
export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.DB_HOST,
  port: config.DB_PORT,
  username: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  synchronize: false, // Usar migrations!
  logging: config.NODE_ENV === "development",
  entities: ["src/entities/**/*.ts"],
  migrations: ["src/migrations/**/*.ts"],
  migrationsRun: false, // Controlar manualmente
});
```

**Vantagens**:
- Fácil acesso em qualquer lugar
- Singleton pattern (uma instância)
- Controle fino sobre inicialização

**Inicialização em server.ts**:
```typescript
async function bootstrap() {
  await AppDataSource.initialize();
  // ... resto do server
}
```

---

### Padrão B: Factory Pattern
**Status**: Alternativa

Pros: Mais testável  
Cons: Mais complexo

---

## 3. Estratégia de Migrations

### Versioning
```
backend/src/migrations/
├── 1706000001_create_users.ts
├── 1706000002_create_refresh_tokens.ts
└── 1706000003_add_indexes.ts
```

**Padrão**: `TIMESTAMP_description.ts`

### Rollback Strategy
- ✅ TypeORM gera `down()` automático
- ✅ Testar reverter em staging
- ❌ Não recomendado em produção (com dados)

### Seeding
```bash
backend/src/seeds/
├── index.ts          # Runner
├── users.seed.ts
└── fixtures/
    └── users.fixture.ts
```

**Comando**:
```bash
npm run migrate:seed
```

---

## 4. Segurança de Senha

### Hash Strategy: Bcrypt ✅
- Já implementado com `SALT_ROUNDS = 12`
- Adequado para 2026
- Alternativa: Argon2 (mais seguro, mas mais lento)

### Nunca Fazer:
```typescript
// ❌ NUNCA retornar senha
return user; // contém senhaHash!

// ✅ Fazer:
const { senhaHash, ...userWithoutPassword } = user;
return userWithoutPassword;
```

---

## 5. Estratégia de JWT

### Access Token
- **Expiração**: 8 horas ✅
- **Algoritmo**: HS256 ✅
- **Payload**: `{id, login, perfil, iat, exp}`

### Refresh Token
- **Armazenamento**: Banco de dados ✅ (antes: Map)
- **Expiração**: 7 dias
- **Revogação**: Soft delete com `revoked_at`

### Token Rotation (Futuro)
```typescript
// Endpoint a considerar: POST /auth/refresh
export const refresh = (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  // 1. Validar refresh token
  // 2. Gerar novo access token
  // 3. Opcionalmente: rotacionar refresh token (gerar novo)
  // 4. Revogar token antigo
};
```

---

## 6. Estratégia de Testes

### Estrutura Recomendada
```
__tests__/
├── unit/
│   ├── services/
│   ├── controllers/
│   └── middleware/
├── integration/
│   ├── auth.integration.test.ts
│   └── database.integration.test.ts
└── fixtures/
    ├── users.fixture.ts
    └── tokens.fixture.ts
```

### Coverage Targets
- **Serviços**: 90%+
- **Controllers**: 80%+
- **Middleware**: 85%+
- **Global**: 80%+

### Testing Tools
```bash
npm install -D jest ts-jest @types/jest supertest
npm install -D @types/supertest
```

### Exemplo de Teste
```typescript
describe("authService.generateAccessToken", () => {
  it("deve gerar token válido", () => {
    const user = { id: 1, login: "admin", perfil: "ADMIN" };
    const token = generateAccessToken(user);
    
    const decoded = jwt.decode(token) as any;
    expect(decoded.id).toBe(1);
    expect(decoded.login).toBe("admin");
  });

  it("deve expirar em 8 horas", () => {
    const user = { id: 1, login: "admin", perfil: "ADMIN" };
    const token = generateAccessToken(user);
    
    const decoded = jwt.decode(token) as any;
    const expiresIn = decoded.exp - decoded.iat;
    expect(expiresIn).toBe(8 * 60 * 60); // 8 horas em segundos
  });
});
```

---

## 7. Documentação com Swagger

### Localização
```
GET /api-docs → Swagger UI
GET /api/swagger.json → JSON spec
```

### Reusable Schemas
```typescript
const components = {
  schemas: {
    LoginRequest: {
      type: "object",
      required: ["login", "senha"],
      properties: {
        login: { type: "string", minLength: 3 },
        senha: { type: "string", minLength: 6 },
      },
    },
    TokenResponse: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        refreshToken: { type: "string" },
        expiresIn: { type: "number" },
      },
    },
  },
};
```

### Documentação por Endpoint
```typescript
/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Fazer login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       401:
 *         description: Credenciais inválidas
 */
```

---

## 8. CI/CD Pipeline

### Stages de GitHub Actions

```
1. LINT
   ├─ ESLint
   └─ Prettier check

2. BUILD
   ├─ tsc --noEmit
   └─ npm run build

3. TEST
   ├─ Jest unit tests
   ├─ Jest integration tests
   └─ Coverage report

4. COVERAGE
   ├─ Codecov upload
   └─ Badge generation

5. SECURITY (Future)
   ├─ Dependency scan
   └─ Code scanning
```

### Triggers
- ✅ Push para `main` e `develop`
- ✅ Pull requests
- ❌ Manual (por enquanto)

---

## 9. Docker Strategy

### Imagem Production
```dockerfile
# Multi-stage build
# Stage 1: Builder (com node_modules)
# Stage 2: Runtime (apenas dist)
```

### docker-compose para Dev
```yaml
services:
  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
  
  app:
    build: .
    ports: ["4000:4000"]
    depends_on: [postgres]
    environment:
      DB_HOST: postgres
```

---

## 10. Commitlint e Conventional Commits

### Tipos Permitidos
```
feat:      Nova funcionalidade
fix:       Correção de bug
docs:      Documentação
style:     Formatação (sem lógica)
refactor:  Refatoração
perf:      Performance
test:      Testes
chore:     Dependências, build
```

### Exemplos Válidos
```
✅ feat: adicionar autenticação OAuth
✅ fix: corrigir validação de email
✅ docs: atualizar README
✅ test: adicionar testes de login

❌ feat: some changes
❌ FIX: corrigir bug
❌ adicionar feature
```

### Pre-commit Hook
```bash
# Lint + format antes de commit
npm run lint && npm run format
```

---

## 11. Dependências Críticas

### Versões Pinadas
```json
{
  "typeorm": "^0.3.17",
  "pg": "^8.11.0",
  "bcrypt": "^5.1.0",
  "jsonwebtoken": "^9.0.2",
  "helmet": "^7.0.0",
  "express-rate-limit": "^7.0.0",
  "zod": "^3.22.2",
  "pino": "^8.14.1"
}
```

### Security Audits
```bash
npm audit
npm audit fix
```

---

## 12. Logging Strategy

### Pino Configuration
```typescript
const logger = pino(
  {
    level: isDev ? "debug" : "info",
    transport: isDev ? { target: "pino-pretty" } : undefined,
  }
);

// Uso
logger.info({ userId: 1 }, "User login");
logger.error({ error }, "Database error");
```

### Log Levels
- `trace`: Detalhado demais (dev only)
- `debug`: Debug info (dev only)
- `info`: Informação importante
- `warn`: Avisos (ataque, config issues)
- `error`: Erros
- `fatal`: Sistema não funciona

---

## Decisão Final Consolidada

| Item | Decisão | Razão |
|------|---------|-------|
| ORM | TypeORM | Comunidade, migrations |
| Database | PostgreSQL | Já setup, confiável |
| Tests | Jest + Supertest | Padrão Node.js |
| Docs | Swagger/OpenAPI | Padrão REST |
| CI/CD | GitHub Actions | Nativo do repo |
| Docker | Compose + Multi-stage | Produção-ready |
| Commits | Commitlint | Disciplina |
| Logging | Pino | Performance |

---

**Data**: 1 de junho de 2026  
**Status**: ✅ Decisões Consolidadas  
**Próximo**: Iniciar Fase 1 com TypeORM
