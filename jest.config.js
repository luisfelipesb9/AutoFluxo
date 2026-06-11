module.exports = {
  displayName: "AutoFluxo API",
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "backend/src",
  testMatch: ["**/__tests__/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/__tests__/integration/"],
  collectCoverageFrom: [
    "**/*.ts",
    "!**/*.test.ts",
    "!**/__tests__/**",
    "!server.ts",
    "!config/**",
    "!migrations/**",
    "!seeds/**",
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
  setupFiles: ["<rootDir>/__tests__/setup.ts"],
  testTimeout: 10000,
  verbose: true,
};
