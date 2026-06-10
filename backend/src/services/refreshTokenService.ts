import crypto from "crypto";
import { LessThan } from "typeorm";
import { AppDataSource } from "../lib/database";
import { RefreshToken } from "../entities/RefreshToken";
import logger from "../lib/logger";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export const createRefreshToken = async (userId: number): Promise<string> => {
  try {
    const tokenRepository = AppDataSource.getRepository(RefreshToken);
    const token = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const refreshToken = new RefreshToken();
    refreshToken.token = token;
    refreshToken.userId = userId;
    refreshToken.expiresAt = expiresAt;

    await tokenRepository.save(refreshToken);
    return token;
  } catch (error) {
    logger.error({ error: (error as Error).message }, "Failed to create refresh token");
    throw error;
  }
};

export const isRefreshTokenValid = async (
  token: string
): Promise<{ userId: number } | null> => {
  try {
    const tokenRepository = AppDataSource.getRepository(RefreshToken);
    const record = await tokenRepository.findOne({ where: { token } });

    if (!record) {
      return null;
    }

    // Check if revoked
    if (record.revokedAt) {
      return null;
    }

    // Check if expired
    if (record.expiresAt < new Date()) {
      return null;
    }

    return { userId: record.userId };
  } catch (error) {
    logger.error({ error: (error as Error).message }, "Failed to validate refresh token");
    throw error;
  }
};

export const revokeRefreshToken = async (token: string): Promise<boolean> => {
  try {
    const tokenRepository = AppDataSource.getRepository(RefreshToken);
    const record = await tokenRepository.findOne({ where: { token } });

    if (!record) {
      return false;
    }

    record.revokedAt = new Date();
    await tokenRepository.save(record);
    return true;
  } catch (error) {
    logger.error({ error: (error as Error).message }, "Failed to revoke refresh token");
    throw error;
  }
};

export const cleanupExpiredTokens = async (): Promise<void> => {
  try {
    const tokenRepository = AppDataSource.getRepository(RefreshToken);
    // Remove todos os tokens cujo expiresAt já passou (não apenas o instante
    // exato de agora). Tokens revogados mantêm o expiresAt original, então
    // também são removidos aqui quando seu TTL de 7 dias expira.
    await tokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    logger.info("Cleanup expired refresh tokens completed");
  } catch (error) {
    logger.error({ error: (error as Error).message }, "Failed to cleanup expired tokens");
  }
};
