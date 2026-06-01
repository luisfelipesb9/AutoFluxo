# Checklist de Execução - AutoFluxo

## FASE 1: BASE DE DADOS ✅

### 1.1 PostgreSQL + ORM Setup
- [ ] **DECISÃO**: Escolher entre TypeORM ou Drizzle
  - TypeORM: Mais popular, melhor comunidade, decorators
  - Drizzle: Mais light, type-safe, menos magic
  - **RECOMENDAÇÃO**: TypeORM (por simplicidade)

- [ ] Instalar dependências:
  ```bash
  npm install typeorm reflect-metadata pg
  npm install -D ts-node
  ```

- [ ] Criar `backend/src/lib/database.ts`
  - [ ] DataSource configuration
  - [ ] Connection pool
  - [ ] Error handling

- [ ] Criar `backend/src/config/database.ts`
  - [ ] Import env vars
  - [ ] Validate connection
  - [ ] Export dataSource

- [ ] Testar conexão:
  ```bash
  npm run dev
  # Deve logar: "Database connected successfully"
  ```

---

### 1.2 Migrar Usuários para BD
- [ ] Criar `backend/src/entities/User.entity.ts`
  ```typescript
  @Entity("usuarios")
  export class User {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    nome: string;
    
    @Column({ unique: true })
    login: string;
    
    @Column()
    senhaHash: string;
    
    @Column()
    perfil: string;
  }
  ```

- [ ] Criar migration inicial:
  ```bash
  npm run typeorm migration:generate -- --name CreateUsersTable
  ```

- [ ] Atualizar `backend/src/services/userService.ts`
  - [ ] Remover array hardcoded
  - [ ] Adicionar `findUserByLogin(login: string)` com repository
  - [ ] Adicionar `createUser(userData)` para seed

- [ ] Criar `backend/src/seeds/users.seed.ts`
  ```typescript
  export async function seedUsers() {
    const admin = new User();
    admin.login = "admin";
    admin.senhaHash = await hashPassword("admin123");
    // ... salvar
  }
  ```

- [ ] Executar seed:
  ```bash
  npm run migrate:seed
  ```

- [ ] Testar login:
  ```bash
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"login":"admin","senha":"admin123"}'
  ```

---

### 1.3 Refresh Tokens em BD
- [ ] Criar `backend/src/entities/RefreshToken.entity.ts`
  ```typescript
  @Entity("refresh_tokens")
  export class RefreshToken {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column({ unique: true })
    token: string;
    
    @ManyToOne(() => User, { onDelete: "CASCADE" })
    user: User;
    
    @Column()
    expiresAt: Date;
  }
  ```

- [ ] Criar migration:
  ```bash
  npm run typeorm migration:generate -- --name CreateRefreshTokensTable
  ```

- [ ] Atualizar `backend/src/services/refreshTokenService.ts`
  - [ ] Remover Map em memória
  - [ ] Usar repository do TypeORM
  - [ ] Adicionar método de cleanup de tokens expirados

- [ ] Criar índices (via migration):
  ```typescript
  await queryRunner.createIndex("refresh_tokens", new TableIndex({
    name: "idx_refresh_tokens_user_id",
    columnNames: ["user_id"],
  }));
  ```

- [ ] Testar revoke e logout

---

### 1.4 Migrations CLI
- [ ] Adicionar scripts no `package.json`:
  ```json
  {
    "migrate:up": "typeorm migration:run -d src/config/database.ts",
    "migrate:down": "typeorm migration:revert -d src/config/database.ts",
    "migrate:create": "typeorm migration:generate",
    "migrate:seed": "ts-node backend/src/seeds/index.ts"
  }
  ```

- [ ] Testar cada comando:
  ```bash
  npm run migrate:up      # ✅ Deve aplicar migrations
  npm run migrate:down    # ✅ Deve reverter última
  npm run migrate:create -- --name TestMigration
  ```

- [ ] Documentar no README.md

---

## FASE 2: TESTES ✅

### 2.1 Jest Setup
- [ ] Jest já instalado em `jest.config.js`
- [ ] Criar diretórios:
  ```bash
  mkdir -p backend/src/__tests__/{unit,integration,fixtures}
  ```

- [ ] Criar helper `backend/src/__tests__/setup.ts`
  ```typescript
  import { DataSource } from "typeorm";
  
  export async function setupTestDatabase() {
    // Database de teste
  }
  ```

- [ ] Criar fixture de usuário:
  ```typescript
  export const mockUser = {
    id: 1,
    login: "testuser",
    perfil: "USER",
    senhaHash: "hashed_password",
  };
  ```

---

### 2.2 Auth Service Tests
- [ ] Criar `backend/src/__tests__/unit/services/authService.test.ts`
  - [ ] `generateAccessToken()` tests (3 casos)
  - [ ] `verifyAccessToken()` tests (4 casos)
  - [ ] Algoritmo HS256 validation
  - [ ] Expiração em 8h

- [ ] Criar `backend/src/__tests__/unit/services/userService.test.ts`
  - [ ] `findUserByLogin()` tests
  - [ ] `verifyPassword()` tests

- [ ] Rodar testes:
  ```bash
  npm test -- authService.test.ts
  # Deve exibir: PASS ✓ 7 tests passed
  ```

---

### 2.3 Controller Tests
- [ ] Criar `backend/src/__tests__/unit/controllers/authController.test.ts`
  ```typescript
  describe("authController.login", () => {
    it("deve retornar 401 para credenciais inválidas", async () => {
      // ...
    });
    
    it("deve retornar accessToken e refreshToken", async () => {
      // ...
    });
  });
  ```

- [ ] Usar supertest para mock HTTP
- [ ] Rodar e verificar cobertura

---

### 2.4 Middleware Tests
- [ ] `authMiddleware.test.ts`
  - [ ] Token válido → next()
  - [ ] Token inválido → 401
  - [ ] Sem token → 401

- [ ] `errorHandler.test.ts`
  - [ ] Error com stack trace
  - [ ] Env development vs production

- [ ] `rateLimiter.test.ts`
  - [ ] Limite atingido
  - [ ] Reset após windowMs

---

### 2.5 Coverage e CI
- [ ] Configurar `jest.config.js` com threshold:
  ```javascript
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  }
  ```

- [ ] Adicionar script:
  ```json
  {
    "test:coverage": "jest --coverage"
  }
  ```

- [ ] Rodar:
  ```bash
  npm run test:coverage
  # Deve exibir: Coverage ≥80%
  ```

---

## FASE 3: DEVOPS ✅

### 3.1 Auto Migrations on Startup
- [ ] Atualizar `backend/src/server.ts`:
  ```typescript
  async function bootstrap() {
    const config = validateEnv();
    const dataSource = await AppDataSource.initialize();
    
    logger.info("Running pending migrations...");
    await dataSource.runMigrations();
    
    // Rest of server setup...
  }
  ```

- [ ] Testar:
  ```bash
  npm run dev
  # Deve logar: "Running pending migrations..."
  # E: "x migrations executed"
  ```

---

### 3.2 Swagger/OpenAPI
- [ ] Instalar:
  ```bash
  npm install swagger-jsdoc swagger-ui-express
  npm install -D @types/swagger-jsdoc @types/swagger-ui-express
  ```

- [ ] Criar `backend/src/lib/swagger.ts`:
  ```typescript
  import swaggerJsdoc from "swagger-jsdoc";
  
  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "AutoFluxo API",
        version: "1.0.0",
      },
      servers: [{ url: "/api" }],
    },
    apis: ["backend/src/routes/**/*.ts"],
  };
  
  export const swaggerSpec = swaggerJsdoc(options);
  ```

- [ ] Adicionar rota em `server.ts`:
  ```typescript
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  ```

- [ ] Documentar endpoints com JSDoc:
  ```typescript
  /**
   * @swagger
   * /auth/login:
   *   post:
   *     tags:
   *       - Authentication
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   */
  ```

- [ ] Testar:
  ```bash
  curl http://localhost:4000/api-docs
  # Deve abrir Swagger UI
  ```

---

### 3.3 Commitlint + Husky
- [ ] Instalar:
  ```bash
  npm install -D commitlint @commitlint/config-conventional husky
  npx husky install
  ```

- [ ] Criar `.commitlintrc.js`:
  ```javascript
  module.exports = {
    extends: ["@commitlint/config-conventional"],
    rules: {
      "type-enum": [2, "always", [
        "feat", "fix", "docs", "style", "refactor", "perf", "test", "chore"
      ]],
    },
  };
  ```

- [ ] Adicionar hooks:
  ```bash
  npx husky add .husky/commit-msg 'npx commitlint --edit $1'
  npx husky add .husky/pre-commit 'npm run lint && npm run format'
  ```

- [ ] Testar:
  ```bash
  git commit -m "invalid message"
  # Deve falhar: "type must be one of..."
  
  git commit -m "feat: add new feature"
  # Deve aceitar ✅
  ```

---

### 3.4 GitHub Actions CI/CD
- [ ] Criar `.github/workflows/test.yml`:
  ```yaml
  name: CI

  on:
    push:
      branches: [main, develop]
    pull_request:
      branches: [main]

  jobs:
    test:
      runs-on: ubuntu-latest
      services:
        postgres:
          image: postgres:15
          env:
            POSTGRES_PASSWORD: postgres
          options: >-
            --health-cmd pg_isready
            --health-interval 10s
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-node@v3
          with:
            node-version: 20
        - run: npm ci
        - run: npm run lint
        - run: npm run build
        - run: npm test -- --coverage
        - uses: codecov/codecov-action@v3
  ```

- [ ] Fazer push para testar:
  ```bash
  git push origin main
  # Deve triggerar workflow no GitHub
  ```

- [ ] Verificar status em Actions tab

- [ ] Adicionar badge ao README:
  ```markdown
  ![CI](https://github.com/luisfelipesb9/AutoFluxo/workflows/CI/badge.svg)
  ```

---

### 3.5 Docker Setup (Bonus)
- [ ] Criar `Dockerfile`:
  ```dockerfile
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package*.json .
  RUN npm ci
  COPY . .
  RUN npm run build

  FROM node:20-alpine
  WORKDIR /app
  COPY --from=builder /app/dist ./dist
  COPY --from=builder /app/node_modules ./node_modules
  COPY package*.json .
  EXPOSE 4000
  CMD ["npm", "start"]
  ```

- [ ] Criar `docker-compose.yml`:
  ```yaml
  services:
    postgres:
      image: postgres:15
      environment:
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: autofluxo
      ports:
        - "5432:5432"

    app:
      build: .
      ports:
        - "4000:4000"
      depends_on:
        - postgres
      environment:
        DB_HOST: postgres
  ```

- [ ] Testar:
  ```bash
  docker-compose up
  ```

---

## 📋 Quick Reference

### Verificar Progresso
```bash
# Testes
npm test

# Coverage
npm run test:coverage

# Lint
npm run lint

# Build
npm run build

# Migrations
npm run migrate:up
npm run migrate:down

# Docker
docker-compose up
docker-compose logs -f app
```

### Comandos Úteis
```bash
# Gerar nova migration
npm run migrate:create -- --name DescriptiveName

# Ver status de migrations
npm run typeorm migration:show

# Seed database
npm run migrate:seed

# Reset database
npm run typeorm schema:drop && npm run migrate:up && npm run migrate:seed
```

---

**Status**: 📝 Pronto para iniciar  
**Próximo**: Escolher ORM e começar 1.1
