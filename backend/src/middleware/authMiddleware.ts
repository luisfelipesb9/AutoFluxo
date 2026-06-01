import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/authService";
import logger from "../lib/logger";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn({ path: req.path }, "Requisição sem token de autenticação");
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.id,
      login: payload.login,
      perfil: payload.perfil,
    };
    logger.debug({ userId: payload.id, path: req.path }, "Token validado");
    return next();
  } catch (error) {
    logger.warn({ path: req.path, error: (error as Error).message }, "Token inválido");
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
};
