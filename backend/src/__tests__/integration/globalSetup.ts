import { Client } from "pg";

// Recria o banco de teste do zero antes da suíte (isolamento total entre runs).
// Conecta ao banco administrativo "postgres" com as credenciais do .env.
export default async function globalSetup(): Promise<void> {
  const admin = new Client({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "postgres",
  });

  await admin.connect();
  // WITH (FORCE) derruba conexões pendentes (Postgres 13+).
  await admin.query(`DROP DATABASE IF EXISTS autofluxo_test WITH (FORCE)`);
  await admin.query(`CREATE DATABASE autofluxo_test`);
  await admin.end();
}
