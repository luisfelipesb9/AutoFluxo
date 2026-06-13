import "dotenv/config";
import "reflect-metadata";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import rootRouter from "./routes";
import errorHandler from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import { validateEnv } from "./config/env";
import logger from "./lib/logger";
import { initializeDatabase } from "./lib/database";
import { requestContextMiddleware } from "./lib/requestContext";

const config = validateEnv();

/**
 * Monta a aplicação Express (middlewares de segurança + rotas + error handler)
 * sem inicializar o banco nem abrir o socket. Mantida pura para ser reutilizada
 * em testes de integração (supertest) — por isso NÃO chama `initializeDatabase()`
 * nem `app.listen()`. O bootstrap de produção é quem orquestra DB + listen.
 */
export function createApp(): express.Application {
  const app = express();

  // Confia no proxy reverso para resolver o IP real do cliente (X-Forwarded-For).
  app.set("trust proxy", true);

  // Quando servido atrás de TLS (HTTPS=true), redireciona qualquer acesso http→https.
  // Defense-in-depth: o nginx já redireciona na borda; isto protege acesso direto à
  // porta do Node. req.secure respeita X-Forwarded-Proto graças ao "trust proxy".
  if (config.HTTPS) {
    app.use((req, res, next) => {
      if (req.secure) return next();
      return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
    });
  }

  // Middlewares de segurança
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc:  ["'self'"],
          styleSrc:   ["'self'"],
          imgSrc:     ["'self'", "data:"],
          connectSrc: ["'self'"],
          fontSrc:    ["'self'"],
          objectSrc:  ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      // Impede que o navegador infira o tipo MIME — bloqueia MIME-sniffing attacks.
      noSniff: true,
      // Só envia HSTS quando realmente há TLS (HTTPS=true). Em http puro o header
      // seria ignorado pelo navegador e poderia travar o acesso em dev.
      strictTransportSecurity: config.HTTPS
        ? { maxAge: 31_536_000, includeSubDomains: true }
        : false,
    })
  );

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

  // Defense-in-depth contra CSRF: a API só aceita requisições que incluam o header
  // customizado X-Requested-With. Browsers não enviam headers customizados em
  // requisições cross-origin sem preflight — o que já é impedido pela política CORS.
  // Rotas públicas (/auth, /docs) são excluídas abaixo via router, mas adicionamos
  // aqui um guard nas rotas /api (exceto preflight OPTIONS).
  app.use("/api", (req, res, next) => {
    if (req.method === "OPTIONS") return next();
    // Rotas públicas não precisam do header.
    const isPublic =
      req.path.startsWith("/auth/") || req.path.startsWith("/docs");
    if (!isPublic && !req.headers["x-requested-with"]) {
      return res.status(400).json({ error: "Header X-Requested-With ausente" });
    }
    return next();
  });

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

  return app;
}

/**
 * Sobe o servidor de produção: inicializa o banco, monta o app e abre o socket.
 */
async function bootstrap(): Promise<express.Application> {
  await initializeDatabase();

  const app = createApp();

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

// Só sobe o servidor quando este arquivo é o entrypoint (node dist/server.js).
// Em testes que importam `createApp`, este bloco não roda — evita abrir o banco
// e a porta no import.
if (require.main === module) {
  bootstrap().catch((error) => {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  });
}

export default bootstrap;
