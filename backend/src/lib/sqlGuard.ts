import { AppError } from "./AppError";

// Comandos de escrita / DDL / execução proibidos em qualquer posição.
const BLOCKLIST =
  /\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE|CREATE|ALTER|GRANT|REVOKE|REPLACE|MERGE|COPY|CALL|EXECUTE|VACUUM|COMMENT|SET)\b/i;

// Colunas/tabelas sensíveis que nunca podem ser referenciadas.
// `\bsenha` cobre senha, senhaHash e senha_hash.
const SENSITIVE = /\bsenha|refresh_token|\btoken\b/i;

const stripTrailingSemicolons = (sql: string): string =>
  sql.trim().replace(/;+\s*$/, "").trim();

/**
 * Garante que o SQL é um único SELECT somente-leitura e não toca dados
 * sensíveis. Lança AppError(400) em qualquer violação.
 */
export const assertSafeSelect = (rawSql: string): void => {
  const sql = stripTrailingSemicolons(rawSql);

  if (!sql) {
    throw new AppError(400, "Consulta vazia");
  }
  if (!/^select\b/i.test(sql)) {
    throw new AppError(400, "Apenas consultas SELECT são permitidas");
  }
  if (sql.includes(";")) {
    throw new AppError(400, "Múltiplos comandos não são permitidos");
  }
  if (BLOCKLIST.test(sql)) {
    throw new AppError(400, "Consulta contém comando não permitido");
  }
  if (SENSITIVE.test(sql)) {
    throw new AppError(400, "Consulta referencia dados sensíveis");
  }
};

/**
 * Acrescenta `LIMIT n` quando a consulta não declara um LIMIT próprio.
 */
export const injectLimit = (rawSql: string, max: number): string => {
  const sql = stripTrailingSemicolons(rawSql);
  if (/\blimit\b\s+\d+/i.test(sql)) return sql;
  return `${sql} LIMIT ${max}`;
};
