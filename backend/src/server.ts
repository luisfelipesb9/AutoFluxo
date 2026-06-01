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

dotenv.config();

const config = validateEnv();

const app = express();

// Middlewares de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  credentials: true,
}));

// Logger HTTP
app.use(pinoHttp({ logger }));

// Rate limiting
app.use(apiLimiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));

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

export default app;
