import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/AppError";

/**
 * Controle de acesso por perfil. Lê `req.user.perfil` (admin, vendedor, caixa,
 * estoque, montador) populado pelo authMiddleware. Erros são propagados via
 * `next(AppError)` para o errorHandler formatar a resposta.
 */
export const requireRole =
  (...perfis: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "Não autenticado"));
    }
    if (!perfis.includes(req.user.perfil)) {
      return next(new AppError(403, "Acesso não permitido"));
    }
    return next();
  };

export const requireAdmin = requireRole("admin");
