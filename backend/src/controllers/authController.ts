import { Request, Response } from "express";
import { findUserByLogin, verifyPassword } from "../services/userService";
import {
  generateAccessToken,
  issueRefreshToken,
  invalidateRefreshToken,
} from "../services/authService";
import { loginSchema, refreshTokenSchema } from "../schemas/auth";
import { registrarLog } from "../services/logService";
import { sanitizeDetalhe } from "../lib/requestContext";
import { AuditAction, AuditEntity } from "../lib/auditActions";
import logger from "../lib/logger";

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { login, senha } = validatedData;

    const user = await findUserByLogin(login);
    if (!user) {
      logger.warn({ login }, "Tentativa de login com usuário inexistente");
      // Falhas de login não vinculam usuario_id (mesmo login existente):
      // registramos usuario_id=null + IP (do contexto) e o login no detalhe.
      await registrarLog({
        usuario_id: null,
        acao: AuditAction.LOGIN_FALHA,
        entidade: AuditEntity.AUTH,
        detalhe: sanitizeDetalhe({ login, motivo: "usuario_inexistente" }),
      });
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const senhaValida = await verifyPassword(senha, user.senhaHash);
    if (!senhaValida) {
      logger.warn({ userId: user.id, login }, "Tentativa de login com senha inválida");
      await registrarLog({
        usuario_id: null,
        acao: AuditAction.LOGIN_FALHA,
        entidade: AuditEntity.AUTH,
        detalhe: sanitizeDetalhe({ login, motivo: "senha_invalida" }),
      });
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);

    await registrarLog({
      usuario_id: user.id,
      acao: AuditAction.LOGIN_SUCESSO,
      entidade: AuditEntity.AUTH,
      entidade_id: user.id,
      detalhe: sanitizeDetalhe({ login }),
    });
    logger.info({ userId: user.id, login }, "Login realizado com sucesso");

    return res.json({
      accessToken,
      refreshToken,
      expiresIn: 8 * 60 * 60,
      usuario: {
        id: user.id,
        nome: user.nome,
        login: user.login,
        perfil: user.perfil,
      },
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
    await registrarLog({
      acao: AuditAction.LOGIN_LOGOUT,
      entidade: AuditEntity.AUTH,
    });
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
