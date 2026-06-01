import { Request, Response } from "express";
import { findUserByLogin, verifyPassword } from "../services/userService";
import {
  generateAccessToken,
  issueRefreshToken,
  invalidateRefreshToken,
} from "../services/authService";
import { loginSchema, refreshTokenSchema } from "../schemas/auth";
import logger from "../lib/logger";

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { login, senha } = validatedData;

    const user = await findUserByLogin(login);
    if (!user) {
      logger.warn({ login }, "Tentativa de login com usuário inexistente");
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const senhaValida = await verifyPassword(senha, user.senhaHash);
    if (!senhaValida) {
      logger.warn({ userId: user.id, login }, "Tentativa de login com senha inválida");
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);

    logger.info({ userId: user.id, login }, "Login realizado com sucesso");

    return res.json({
      accessToken,
      refreshToken,
      expiresIn: 8 * 60 * 60,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ error: error.message }, "Erro ao fazer login");
      return res.status(400).json({ error: "Dados inválidos" });
    }
    throw error;
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const validatedData = refreshTokenSchema.parse(req.body);
    const { refreshToken } = validatedData;

    await invalidateRefreshToken(refreshToken);
    logger.info("Logout realizado");
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ error: error.message }, "Erro ao fazer logout");
      return res.status(400).json({ error: "Dados inválidos" });
    }
    throw error;
  }
};
