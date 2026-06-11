import { DataSource } from "typeorm";
import { AppError } from "./AppError";
import logger from "./logger";

const ERRO_IA = "Busca por IA indisponível no momento.";
const RO_USER = "autofluxo_readonly";

let readOnlyDataSource: DataSource | null = null;

/**
 * DataSource dedicada à busca IA, conectada com a role Postgres read-only
 * (autofluxo_readonly): GRANT SELECT restrito, sem senhaHash nem
 * refresh_tokens, sem escrita. É a barreira real da defesa em profundidade —
 * o sqlGuard (regex) é a primeira camada, esta conexão é a que o banco impõe.
 *
 * Construída e inicializada sob demanda (lazy) para não acoplar o boot do app
 * à existência da role/senha; sem a env a busca falha fechada (503).
 */
export const getReadOnlyDataSource = async (): Promise<DataSource> => {
  const password = process.env.DB_READONLY_PASSWORD;
  if (!password) {
    logger.warn("DB_READONLY_PASSWORD ausente — busca IA indisponível");
    throw new AppError(503, ERRO_IA);
  }

  if (!readOnlyDataSource) {
    readOnlyDataSource = new DataSource({
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      username: RO_USER,
      password,
      database: process.env.DB_NAME,
      synchronize: false,
      logging: false,
      entities: [],
      migrations: [],
    });
  }

  if (!readOnlyDataSource.isInitialized) {
    try {
      await readOnlyDataSource.initialize();
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        "Falha ao inicializar a DataSource read-only da busca IA"
      );
      throw new AppError(503, ERRO_IA);
    }
  }

  return readOnlyDataSource;
};

/** Fecha a conexão read-only (graceful shutdown / testes). */
export const closeReadOnlyDataSource = async (): Promise<void> => {
  if (readOnlyDataSource?.isInitialized) {
    await readOnlyDataSource.destroy();
  }
  readOnlyDataSource = null;
};
