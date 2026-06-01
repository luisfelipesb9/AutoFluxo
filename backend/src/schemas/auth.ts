import { z } from "zod";

export const loginSchema = z.object({
  login: z
    .string()
    .min(3, "Login deve ter no mínimo 3 caracteres")
    .max(50, "Login deve ter no máximo 50 caracteres")
    .regex(/^[a-zA-Z0-9_-]+$/, "Login contém caracteres inválidos"),
  senha: z
    .string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .max(200, "Senha deve ter no máximo 200 caracteres"),
});

export type LoginRequest = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, "Refresh token inválido"),
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
