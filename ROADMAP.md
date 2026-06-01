# Plano de Execução - AutoFluxo (Roadmap)

## 📌 Visão Geral
Roadmap de 6 tarefas prioritárias em 3 fases: Base de Dados, Testes e DevOps.

---

## 🔴 FASE 1: BASE DE DADOS E PERSISTÊNCIA (Semana 1-2)
**Status**: Não iniciado  
**Impacto**: Crítico - Bloqueia produção

### 1.1️⃣ Integrar PostgreSQL com Typeorm/Drizzle
**Duração**: 3-4h  
**Dependências**: Nenhuma  
**Prioridade**: 🔴 Crítica

**Tarefas**:
- [ ] Escolher ORM: TypeORM vs Drizzle
- [ ] Instalar dependências (`typeorm` ou `drizzle-orm`)
- [ ] Criar `database.ts` com connection pool
- [ ] Criar migrations runner
- [ ] Testar conexão em `config/env.ts`

**Arquivos a criar/modificar**:
- `backend/src/lib/database.ts` (novo)
- `backend/src/config/database.ts` (novo)
- `package.json` (typeorm/drizzle deps)

**Exemplo de saída**:
```typescript
// database.ts
const dataSource = new DataSource({
  type: "postgres",
  host: config.DB_HOST,
  port: config.DB_PORT,
  username: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  entities: ["backend/src/entities/**/*.ts"],
  migrations: ["backend/src/migrations/**/*.ts"],
  synchronize: false,
  logging: false,
});
```

---

### 1.2️⃣ Migrar Usuários para Banco de Dados
**Duração**: 2-3h  
**Dependências**: 1.1  
**Prioridade**: 🔴 Crítica

**Tarefas**:
- [ ] Criar entity `User` com campos da tabela
- [ ] Criar migration inicial (usuarios table)
- [ ] Atualizar `userService.ts` para usar BD
- [ ] Seed usuarios (admin/user de teste)
- [ ] Testar login com usuários do BD

**Arquivos a criar/modificar**:
- `backend/src/entities/User.entity.ts` (novo)
- `backend/src/migrations/1706_create_users.ts` (novo)
- `backend/src/services/userService.ts` (modificar)
- `backend/src/seeds/users.seed.ts` (novo)

---

### 1.3️⃣ Persistir Refresh Tokens em Banco de Dados
**Duração**: 2-3h  
**Dependências**: 1.1, 1.2  
**Prioridade**: 🔴 Crítica

**Tarefas**:
- [ ] Criar entity `RefreshToken`
- [ ] Criar migration para tabela refresh_tokens
- [ ] Atualizar `refreshTokenService.ts`
- [ ] Adicionar índice em token + userId
- [ ] Implementar limpeza de tokens expirados

**Arquivos a criar/modificar**:
- `backend/src/entities/RefreshToken.entity.ts` (novo)
- `backend/src/migrations/1706_create_refresh_tokens.ts` (novo)
- `backend/src/services/refreshTokenService.ts` (refactor)

**Schema**:
```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

---

### 1.4️⃣ Criar Migrations Runner CLI
**Duração**: 1h  
**Dependências**: 1.1  
**Prioridade**: 🟡 Alta

**Tarefas**:
- [ ] Script `npm run migrate:up` (executar pending)
- [ ] Script `npm run migrate:down` (reverter última)
- [ ] Script `npm run migrate:seed` (popular dados teste)
- [ ] Documentar em `README.md`

**Package.json scripts**:
```json
{
  "migrate:up": "typeorm migration:run -d src/config/database.ts",
  "migrate:down": "typeorm migration:revert -d src/config/database.ts",
  "migrate:seed": "ts-node backend/src/seeds/index.ts"
}
```

---

## 🟡 FASE 2: TESTES (Semana 2-3)
**Status**: Não iniciado  
**Impacto**: Alto - Qualidade

### 2.1️⃣ Estruturar Testes Unitários (Jest)
**Duração**: 2h  
**Dependências**: 1.1  
**Prioridade**: 🟡 Alta

**Tarefas**:
- [ ] Criar diretório `backend/src/__tests__/`
- [ ] Configurar Jest com `ts-jest`
- [ ] Criar helper de mock de database
- [ ] Criar exemplo de teste

**Estrutura**:
```
backend/src/__tests__/
├── unit/
│   ├── services/
│   │   ├── authService.test.ts
│   │   └── userService.test.ts
│   └── controllers/
│       └── authController.test.ts
├── integration/
│   └── auth.integration.test.ts
└── fixtures/
    └── users.fixture.ts
```

---

### 2.2️⃣ Testes de Serviços de Autenticação
**Duração**: 3-4h  
**Dependências**: 2.1, 1.1  
**Prioridade**: 🟡 Alta

**Tarefas**:
- [ ] Testes `generateAccessToken()` (payload, expiração)
- [ ] Testes `verifyAccessToken()` (válido, expirado, inválido)
- [ ] Testes `createRefreshToken()` (geração, armazenamento)
- [ ] Testes `validateRefreshToken()` (validade, expiração)
- [ ] Cobertura mínima: 80%

**Exemplos de testes**:
```typescript
describe("authService.generateAccessToken", () => {
  it("deve gerar token com payload correto", () => {
    const user = { id: 1, login: "admin", perfil: "ADMIN" };
    const token = generateAccessToken(user);
    const decoded = jwt.decode(token);
    expect(decoded.id).toBe(1);
    expect(decoded.login).toBe("admin");
  });

  it("deve expirar em 8 horas", () => {
    // ...
  });
});
```

---

### 2.3️⃣ Testes de Controllers
**Duração**: 3h  
**Dependências**: 2.1  
**Prioridade**: 🟡 Alta

**Tarefas**:
- [ ] Testes `login()` (sucesso, falha, validação)
- [ ] Testes `logout()` (revoke token)
- [ ] Testes com supertest para HTTP
- [ ] Cobertura: 75%

---

### 2.4️⃣ Testes de Middleware
**Duração**: 2h  
**Dependências**: 2.1  
**Prioridade**: 🟡 Média

**Tarefas**:
- [ ] Testes `authMiddleware` (token válido, inválido, ausente)
- [ ] Testes `errorHandler` (diferentes tipos de erro)
- [ ] Testes `rateLimiter` (limite atingido, reset)

---

### 2.5️⃣ Configurar Coverage e CI Checks
**Duração**: 1h  
**Dependências**: 2.1-2.4  
**Prioridade**: 🟡 Média

**Tarefas**:
- [ ] Configurar `jest.config.js` com coverage threshold
- [ ] Adicionar script `npm run test:coverage`
- [ ] GitHub Actions executar testes

---

## 🟢 FASE 3: DEVOPS E AUTOMAÇÃO (Semana 3-4)
**Status**: Não iniciado  
**Impacto**: Médio - Produção

### 3.1️⃣ Adicionar Migrations Automáticas no Startup
**Duração**: 1h  
**Dependências**: 1.4  
**Prioridade**: 🟡 Alta

**Tarefas**:
- [ ] Função `runPendingMigrations()` ao iniciar
- [ ] Tratamento de erro se migration falhar
- [ ] Log de migrations executadas
- [ ] Testado em dev e produção

**Exemplo**:
```typescript
// server.ts
async function bootstrap() {
  const config = validateEnv();
  const dataSource = await initializeDataSource(config);
  
  if (dataSource.migrations.length > 0) {
    logger.info("Executando migrations pendentes...");
    await dataSource.runMigrations();
  }

  const app = express();
  // ... resto do servidor
}
```

---

### 3.2️⃣ Swagger/OpenAPI Documentation
**Duração**: 3-4h  
**Dependências**: Nenhuma (paralelo)  
**Prioridade**: 🟡 Média

**Tarefas**:
- [ ] Instalar `swagger-jsdoc`, `swagger-ui-express`
- [ ] Criar `swagger.ts` com configuração
- [ ] Documentar endpoints em JSDoc
- [ ] Rota `/api-docs` com Swagger UI
- [ ] Incluir schemas, exemplos

**Exemplo**:
```typescript
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/login", loginLimiter, authController.login);
```

---

### 3.3️⃣ Commitlint + Husky
**Duração**: 1.5h  
**Dependências**: Nenhuma  
**Prioridade**: 🟡 Média

**Tarefas**:
- [ ] Instalar `commitlint`, `husky`, `@commitlint/config-conventional`
- [ ] Configurar `.commitlintrc.js`
- [ ] Setup husky hooks (pre-commit, commit-msg)
- [ ] Pre-commit: lint + format
- [ ] Commit-msg: validar conventional commits

**Arquivo `.commitlintrc.js`**:
```javascript
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", [
      "feat", "fix", "docs", "style", "refactor", "perf", "test", "chore"
    ]],
    "subject-case": [2, "never", ["start-case", "pascal-case"]],
  },
};
```

---

### 3.4️⃣ GitHub Actions CI/CD Pipeline
**Duração**: 3-4h  
**Dependências**: 2.5, 3.3  
**Prioridade**: 🟡 Média

**Tarefas**:
- [ ] Criar `.github/workflows/test.yml`
- [ ] Trigger: PR, push main
- [ ] Jobs: lint, build, test, coverage
- [ ] Criar `.github/workflows/release.yml` (opcional)
- [ ] Badge de status no README

**Workflow test.yml**:
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test -- --coverage
```

---

### 3.5️⃣ Docker Setup (Opcional, Bonus)
**Duração**: 2-3h  
**Dependências**: 3.1  
**Prioridade**: 🟢 Baixa (bonus)

**Tarefas**:
- [ ] Criar `Dockerfile`
- [ ] Criar `docker-compose.yml` (app + postgres)
- [ ] Otimizar build multi-stage
- [ ] Documentar em README

---

## 📊 Timeline de Execução

```
SEMANA 1-2: FASE 1 (Base de Dados)
├─ Dia 1-2: PostgreSQL + TypeORM setup (1.1)
├─ Dia 2-3: Migrar Usuários (1.2)
├─ Dia 3-4: Refresh Tokens em BD (1.3)
└─ Dia 5: Migrations CLI (1.4)

SEMANA 2-3: FASE 2 (Testes)
├─ Dia 6-7: Jest setup (2.1)
├─ Dia 7-8: Auth service tests (2.2)
├─ Dia 8-9: Controller tests (2.3)
├─ Dia 9: Middleware tests (2.4)
└─ Dia 10: Coverage CI (2.5)

SEMANA 3-4: FASE 3 (DevOps)
├─ Dia 11: Auto migrations (3.1)
├─ Dia 11-12: Swagger docs (3.2)
├─ Dia 13: Commitlint (3.3)
└─ Dia 14: GitHub Actions (3.4)

BONUS (Se tempo permitir):
└─ Dia 15: Docker setup (3.5)
```

**Tempo Total Estimado**: 25-30 horas de desenvolvimento

---

## 🎯 Critérios de Sucesso

### Fase 1:
- ✅ Login com usuários do banco
- ✅ Refresh tokens persistidos
- ✅ Migrations executam automático no startup
- ✅ Zero usuários hardcoded

### Fase 2:
- ✅ 80%+ cobertura de testes
- ✅ Todos os services com testes
- ✅ Controllers com testes
- ✅ CI executa testes automaticamente

### Fase 3:
- ✅ Swagger UI acessível
- ✅ Conventional commits enforçados
- ✅ GitHub Actions pipeline funcional
- ✅ Builds automáticos passando

---

## 📝 Notas Importantes

1. **Ordem não é flexível**: Fase 1 é bloqueadora de Fase 2+3
2. **Testes paralelos**: 2.2, 2.3, 2.4 podem ser paralelizados
3. **DevOps independente**: 3.2, 3.3, 3.4 podem começar enquanto 2.x rola
4. **Database**: Precisa estar up antes de testar
5. **CI/CD**: Só faz sentido depois de testes + linting prontos

---

**Data**: 1 de junho de 2026  
**Status**: ⏳ Pronto para iniciar Fase 1  
**Próximo passo**: Escolher ORM (TypeORM vs Drizzle)
