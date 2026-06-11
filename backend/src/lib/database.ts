import "reflect-metadata";
import { DataSource } from "typeorm";
import { types as pgTypes } from "pg";
import logger from "../lib/logger";

// Política de timezone (raiz): as colunas de data são `timestamp without time
// zone` e o Postgres (container em UTC) armazena os valores em UTC. Sem isto, o
// driver pg lê esse `timestamp` no fuso do HOST (ex.: -03) e desloca a saída em
// +3h (ex.: um log de 03:29Z volta como 06:29Z; R1 devolvia 03:00Z em vez de
// 00:00Z). Forçamos a leitura como UTC. OID 1114 = `timestamp` sem tz.
// Vale para TODA leitura (TypeORM e AppDataSource.query), pois o registry de
// tipos do pg é global. Sub-segundos abaixo de ms são truncados pelo JS Date.
pgTypes.setTypeParser(1114, (value: string) =>
  new Date(value.replace(" ", "T") + "Z")
);
import { User } from "../entities/User";
import { RefreshToken } from "../entities/RefreshToken";
import { Cliente } from "../entities/Cliente";
import { Veiculo } from "../entities/Veiculo";
import { Peca } from "../entities/Peca";
import { Pedido } from "../entities/Pedido";
import { ItemPedido } from "../entities/ItemPedido";
import { Pagamento } from "../entities/Pagamento";
import { MovimentacaoEstoque } from "../entities/MovimentacaoEstoque";
import { LogAcao } from "../entities/LogAcao";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
  entities: [
    User,
    RefreshToken,
    Cliente,
    Veiculo,
    Peca,
    Pedido,
    ItemPedido,
    Pagamento,
    MovimentacaoEstoque,
    LogAcao,
  ],
  migrations: [__dirname + "/../migrations/*.{ts,js}"],
  subscribers: [],
});

export async function initializeDatabase(): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info("✅ Database connected successfully");
    }

    // Run pending migrations
    const pendingMigrations = await AppDataSource.showMigrations();
    if (pendingMigrations) {
      logger.info("Running pending migrations...");
      await AppDataSource.runMigrations();
      logger.info("✅ Migrations executed successfully");
    }
  } catch (error) {
    logger.error(
      { error: (error as Error).message },
      "Failed to initialize database"
    );
    process.exit(1);
  }
}
