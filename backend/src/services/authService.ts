import jwt, { VerifyOptions } from "jsonwebtoken";
import { User } from "../entities/User";
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

export const issueRefreshToken = async (userId: number): Promise<string> => {
  return createRefreshToken(userId);
};

export const validateRefreshToken = async (
  token: string
): Promise<{ userId: number } | null> => {
  return isRefreshTokenValid(token);
};

export const invalidateRefreshToken = async (token: string): Promise<boolean> => {
  return revokeRefreshToken(token);
};
