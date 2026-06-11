import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/AppError";
import logger from "../lib/logger";

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Erros de aplicação com status semântico.
  if (err instanceof AppError) {
    logger.warn(
      { error: err.message, code: err.code, path: req.path, method: req.method },
      "Erro de aplicação"
    );
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.code && { code: err.code }),
    });
  }

  // Erros de validação do Zod.
  if (err instanceof ZodError) {
    logger.warn(
      { issues: err.issues, path: req.path, method: req.method },
      "Erro de validação"
    );
    return res.status(400).json({
      error: "Dados inválidos",
      detalhes: err.issues.map((issue) => ({
        campo: issue.path.join("."),
        mensagem: issue.message,
      })),
    });
  }

  // Erros que carregam um statusCode numérico (ex.: helper da máquina de
  // estados → Object.assign(new Error(msg), { statusCode: 409 })).
  const statusCode = (err as { statusCode?: unknown }).statusCode;
  if (typeof statusCode === "number") {
    logger.warn(
      { error: err.message, statusCode, path: req.path, method: req.method },
      "Erro tratado"
    );
    return res.status(statusCode).json({ error: err.message });
  }

  // Fallback: erro não tratado → 500.
  logger.error(
    {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    },
    "Erro não tratado"
  );

  return res.status(500).json({
    error: "Erro interno do servidor",
    ...(process.env.NODE_ENV === "development" && { details: err.message }),
  });
};

export default errorHandler;
