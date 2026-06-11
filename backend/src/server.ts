import "reflect-metadata";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import dotenv from "dotenv";
import rootRouter from "./routes";
import errorHandler from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import { validateEnv } from "./config/env";
import logger from "./lib/logger";
import { initializeDatabase } from "./lib/database";
import { requestContextMiddleware } from "./lib/requestContext";

dotenv.config();

const config = validateEnv();

async function bootstrap(): Promise<express.Application> {
  // Initialize database
  await initializeDatabase();

  const app = express();

  // Confia no proxy reverso para resolver o IP real do cliente (X-Forwarded-For).
  app.set("trust proxy", true);

  // Middlewares de segurança
  app.use(helmet());
  // CORS_ORIGIN aceita uma lista separada por vírgula, p.ex.:
  // "http://localhost:3000,http://192.168.1.13:3000"
  const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    })
  );

  // Logger HTTP
  app.use(pinoHttp({ logger }));

  // Rate limiting
  app.use(apiLimiter);

  // Body parsing
  app.use(express.json({ limit: "10mb" }));

  // Contexto de auditoria por requisição (IP + usuário) — antes das rotas.
  app.use(requestContextMiddleware);

  // Rotas
  app.use("/api", rootRouter);

  // Error handler
  app.use(errorHandler);

  // Iniciar servidor
  const port = config.PORT;
  const server = app.listen(port, () => {
    logger.info(`✅ Server running on http://localhost:${port}`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down...");
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });

  return app;
}

bootstrap().catch((error) => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});

export default bootstrap;
