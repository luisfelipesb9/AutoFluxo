// Env da suíte de integração. Diferente do setup mockado (__tests__/setup.ts),
// aqui conectamos ao Postgres REAL: mantemos DB_USER/DB_PASSWORD/DB_HOST/DB_PORT
// do ambiente (carregados do .env via shell) e só forçamos o banco dedicado.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ??
  "test_secret_key_that_is_long_enough_32_chars_minimum";
process.env.DB_NAME = "autofluxo_test";
