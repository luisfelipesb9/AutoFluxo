import crypto from "crypto";

export type RefreshTokenRecord = {
  token: string;
  userId: number;
  expiresAt: number;
};

const tokens = new Map<string, RefreshTokenRecord>();
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export const createRefreshToken = (userId: number): string => {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = Date.now() + REFRESH_TOKEN_TTL_MS;
  tokens.set(token, { token, userId, expiresAt });
  return token;
};

export const isRefreshTokenValid = (token: string): RefreshTokenRecord | null => {
  const record = tokens.get(token);
  if (!record) {
    return null;
  }

  if (record.expiresAt < Date.now()) {
    tokens.delete(token);
    return null;
  }

  return record;
};

export const revokeRefreshToken = (token: string): boolean => {
  return tokens.delete(token);
};
