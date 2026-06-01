# 🧪 FASE 2 - PLANO DE EXECUÇÃO: TESTES COM JEST

## 📊 Visão Geral
- **Duração Estimada**: 11-12 horas (1-2 semanas)
- **Tarefas**: 5 principais (2.1 até 2.5)
- **Objetivo Final**: 80%+ cobertura de testes, CI/CD funcional
- **Status**: ⏳ Iniciando

---

## ✅ Checklist de Tarefas

### TAREFA 2.1: Estruturar Testes Unitários (Jest) - 2h
**Status**: ⏳ TODO  
**Dependências**: FASE 1 completa  

**O que fazer**:
- [ ] Instalar Jest, ts-jest, @types/jest
- [ ] Instalar supertest, @types/supertest
- [ ] Criar jest.config.js com ts-jest preset
- [ ] Criar estrutura de diretórios: `backend/src/__tests__/{unit,integration,fixtures}`
- [ ] Criar helper de mock para Database
- [ ] Criar example test para validar setup

**Arquivos a criar**:
```
backend/src/__tests__/
├── fixtures/
│   └── users.fixture.ts
├── mocks/
│   └── database.mock.ts
├── unit/
│   ├── services/
│   │   ├── authService.test.ts
│   │   └── userService.test.ts
│   └── controllers/
│       └── authController.test.ts
└── integration/
    └── auth.integration.test.ts
```

**Arquivos a modificar**:
- package.json (adicionar jest deps e npm run test, npm run test:watch)
- tsconfig.json (verificar compatibility)

---

### TAREFA 2.2: Testes de Autenticação - 3-4h
**Status**: ⏳ TODO  
**Dependências**: 2.1  

**O que testar**:

#### authService.test.ts
- generateAccessToken():
  - ✓ Payload correto (id, login, perfil)
  - ✓ Expira em 8 horas
  - ✓ Algoritmo HS256
- verifyAccessToken():
  - ✓ Token válido retorna payload
  - ✓ Token expirado lança erro
  - ✓ Token inválido lança erro
  - ✓ Signature inválida lança erro

#### userService.test.ts
- findUserByLogin():
  - ✓ Encontra usuário existente
  - ✓ Retorna null para usuário inexistente
- verifyPassword():
  - ✓ Retorna true para senha correta
  - ✓ Retorna false para senha incorreta
- hashPassword():
  - ✓ Retorna hash diferente a cada chamada (salt)
  - ✓ Hash verificável com verifyPassword

#### refreshTokenService.test.ts
- createRefreshToken():
  - ✓ Gera token válido
  - ✓ Armazena em BD
  - ✓ Expira em 7 dias
- isRefreshTokenValid():
  - ✓ Retorna true para token válido
  - ✓ Retorna false para token expirado
  - ✓ Retorna false para token revogado
- revokeRefreshToken():
  - ✓ Marca token como revogado
  - ✓ Retorna true/false corretamente

**Cobertura Mínima**: 80%

---

### TAREFA 2.3: Testes de Controllers - 3h
**Status**: ⏳ TODO  
**Dependências**: 2.1, 2.2  

**O que testar**:

#### authController.test.ts
- POST /auth/login:
  - ✓ Sucesso: retorna accessToken e refreshToken
  - ✓ Credenciais inválidas: retorna 401
  - ✓ Usuário não existe: retorna 401
  - ✓ Dados inválidos: retorna 400
  - ✓ Rate limit: retorna 429 após 5 tentativas

- POST /auth/logout:
  - ✓ Sucesso: retorna 204
  - ✓ Token inválido: retorna 400
  - ✓ Token vazio: retorna 400

**Ferramentas**: supertest para mock HTTP  
**Cobertura Mínima**: 75%

---

### TAREFA 2.4: Testes de Middleware - 2h
**Status**: ⏳ TODO  
**Dependências**: 2.1  

**O que testar**:

#### authMiddleware.test.ts
- ✓ Token válido: passa (next)
- ✓ Token ausente: retorna 401
- ✓ Token inválido: retorna 401
- ✓ Token expirado: retorna 401
- ✓ Signature inválida: retorna 401
- ✓ Request.user é populado corretamente

#### errorHandler.test.ts
- ✓ Erro de validação Zod: retorna 400
- ✓ Erro não tratado: retorna 500
- ✓ NODE_ENV=development: stack trace no response
- ✓ NODE_ENV=production: sem stack trace

#### rateLimiter.test.ts
- ✓ Primeiras requisições passam
- ✓ Após 5 requisições: retorna 429
- ✓ Rate limit reseta após 15 minutos

**Cobertura Mínima**: 70%

---

### TAREFA 2.5: Coverage e CI Checks - 1h
**Status**: ⏳ TODO  
**Dependências**: 2.1-2.4  

**O que fazer**:
- [ ] Adicionar jest.config.js com coverage thresholds:
  ```json
  {
    "statements": 80,
    "branches": 75,
    "functions": 80,
    "lines": 80
  }
  ```
- [ ] npm script: `npm run test:coverage`
- [ ] npm script: `npm run test:ci` (para CI/CD)
- [ ] Gerar relatório em HTML
- [ ] GitHub Actions workflow (2.6 ou FASE 3)

---

## 🚀 Plano de Execução por Dia

### Dia 1 (2-3h) - Jest Setup
- Instalar dependências
- Configurar jest.config.js
- Criar estrutura de diretórios
- Rodar primeiro teste de exemplo (PASSOU)

### Dia 2-3 (5-6h) - Testes de Autenticação
- authService tests (1.5h)
- userService tests (1.5h)
- refreshTokenService tests (1.5h)
- Atingir 80% coverage

### Dia 4 (3h) - Controllers & Middleware
- authController tests (2h)
- authMiddleware + errorHandler tests (1h)

### Dia 5 (1h) - Coverage & Finalize
- Coverage configuration
- npm scripts finalizados
- CI/CD preparation

---

## 📁 Estrutura de Diretórios Após FASE 2

```
backend/
├── src/
│   ├── __tests__/
│   │   ├── fixtures/
│   │   │   ├── users.fixture.ts
│   │   │   └── tokens.fixture.ts
│   │   ├── mocks/
│   │   │   ├── database.mock.ts
│   │   │   ├── authService.mock.ts
│   │   │   └── userService.mock.ts
│   │   ├── unit/
│   │   │   ├── services/
│   │   │   │   ├── authService.test.ts
│   │   │   │   ├── userService.test.ts
│   │   │   │   └── refreshTokenService.test.ts
│   │   │   ├── controllers/
│   │   │   │   └── authController.test.ts
│   │   │   └── middleware/
│   │   │       ├── authMiddleware.test.ts
│   │   │       ├── errorHandler.test.ts
│   │   │       └── rateLimiter.test.ts
│   │   └── integration/
│   │       └── auth.integration.test.ts
│   ├── services/
│   ├── controllers/
│   └── ...
├── jest.config.js
├── tsconfig.json
└── package.json
```

---

## 📊 Métricas de Sucesso FASE 2

### Coverage Mínimo
- Statements: **≥80%**
- Branches: **≥75%**
- Functions: **≥80%**
- Lines: **≥80%**

### Test Outcomes
- ✅ Todos os testes passam
- ✅ npm run test:coverage gera relatório
- ✅ npm run test:watch funciona para desenvolvimento
- ✅ npm run test:ci pronto para GitHub Actions

### Arquivos Alterados
- package.json (deps + scripts)
- tsconfig.json (se necessário)
- jest.config.js (novo)

### Commits Esperados
1. "chore: setup jest e structure de testes"
2. "test: add authService tests (80% coverage)"
3. "test: add authController tests"
4. "test: add middleware tests"
5. "chore: configure coverage thresholds"

---

## 🔗 Próximos Passos Após FASE 2

### FASE 3: DevOps & Automação
- 3.1 Migrations automáticas (já feito em FASE 1)
- 3.2 Swagger/OpenAPI documentation
- 3.3 GitHub Actions CI/CD
- 3.4 Commitlint + pre-commit hooks
- 3.5 Docker containerization

---

## 📋 Dependências de Pacotes (a instalar)

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "@types/jest": "^29.5.7",
    "supertest": "^6.3.3",
    "@types/supertest": "^2.0.12",
    "jest-mock-extended": "^3.0.5"
  }
}
```

---

## 🎯 Objetivo Final

**Após FASE 2, o projeto terá:**
- ✅ Suite completa de testes (unit + integration)
- ✅ 80%+ cobertura de código
- ✅ Testes rodando em CI/CD
- ✅ Ambiente pronto para desenvolvimento com TDD
- ✅ Segurança validada através de testes

**Resultado**: Código production-ready com qualidade garantida.

