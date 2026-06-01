import jwt, { VerifyOptions } from "jsonwebtoken";
import { User } from "./userService";
import {
  createRefreshToken,
  isRefreshTokenValid,
  revokeRefreshToken,
} from "./refreshTokenService";

const ACCESS_TOKEN_EXPIRATION = "8h";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não está definido");
  }
  return secret;
};

export type AuthPayload = {
  id: number;
  login: string;
  perfil: string;
  iat: number;
  exp: number;
};

export const generateAccessToken = (user: User): string => {
  const payload = {
    id: user.id,
    login: user.login,
    perfil: user.perfil,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRATION,
    algorithm: "HS256",
  });
};

export const verifyAccessToken = (token: string): AuthPayload => {
  const verifyOptions: VerifyOptions = {
    algorithms: ["HS256"],
  };

  return jwt.verify(token, getJwtSecret(), verifyOptions) as AuthPayload;
};

export const issueRefreshToken = (userId: number): string => {
  return createRefreshToken(userId);
};

export const validateRefreshToken = (
  token: string
): { userId: number } | null => {
  const record = isRefreshTokenValid(token);
  return record ? { userId: record.userId } : null;
};

export const invalidateRefreshToken = (token: string): boolean => {
  return revokeRefreshToken(token);
};
