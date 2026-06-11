// Suíte de INTEGRAÇÃO: roda as queries reais contra um Postgres de verdade
// (banco dedicado autofluxo_test). NÃO faz parte do `npm test` / `test:ci`
// (que são mockados e rodam no CI sem Postgres). Rode localmente com o banco
// no ar e as credenciais carregadas do .env:
//   set -a && . ./.env && set +a && npm run test:integration
module.exports = {
  displayName: "AutoFluxo Integration",
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "backend/src",
  testMatch: ["**/__tests__/integration/**/*.itest.ts"],
  setupFiles: ["<rootDir>/__tests__/integration/env.ts"],
  globalSetup: "<rootDir>/__tests__/integration/globalSetup.ts",
  testTimeout: 30000,
  verbose: true,
};
