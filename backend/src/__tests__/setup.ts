// Jest setup - runs once before all tests
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_secret_key_that_is_long_enough_32_chars_minimum";
process.env.DB_HOST = "localhost";
process.env.DB_PORT = "5432";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "test";
process.env.DB_NAME = "autofluxo_test";
process.env.CORS_ORIGIN = "http://localhost:3000";

// Suppress console output in tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
