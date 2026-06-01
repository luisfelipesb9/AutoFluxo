import { DataSource } from "typeorm";
import logger from "../lib/logger";
import { User } from "../entities/User";
import { RefreshToken } from "../entities/RefreshToken";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
  entities: [User, RefreshToken],
  migrations: ["dist/backend/src/migrations/**/*.js"],
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
