import { z } from "zod";
import { PerfilUsuario } from "../entities/enums";

/**
 * Schemas de validação (Zod) para o CRUD administrativo de usuários.
 *
 * Convenções alinhadas com `schemas/auth.ts`:
 * - login: 3–50 chars, regex `[a-zA-Z0-9_-]`.
 * - senha: 6–200 chars.
 * - nome: mínimo 2 chars.
 * - perfil: restrito ao enum `PerfilUsuario` (admin/vendedor/caixa/estoque/montador).
 */

const nome = z
  .string()
  .min(2, "Nome deve ter no mínimo 2 caracteres")
  .max(120, "Nome deve ter no máximo 120 caracteres");

const login = z
  .string()
  .min(3, "Login deve ter no mínimo 3 caracteres")
  .max(50, "Login deve ter no máximo 50 caracteres")
  .regex(/^[a-zA-Z0-9_-]+$/, "Login contém caracteres inválidos");

const senha = z
  .string()
  .min(6, "Senha deve ter no mínimo 6 caracteres")
  .max(200, "Senha deve ter no máximo 200 caracteres");

const perfil = z.nativeEnum(PerfilUsuario, {
  errorMap: () => ({ message: "Perfil inválido" }),
});

export const createUsuarioSchema = z.object({
  nome,
  login,
  senha,
  perfil,
});

export type CreateUsuarioRequest = z.infer<typeof createUsuarioSchema>;

export const updateUsuarioSchema = z
  .object({
    nome: nome.optional(),
    perfil: perfil.optional(),
    ativo: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export type UpdateUsuarioRequest = z.infer<typeof updateUsuarioSchema>;

export const resetSenhaSchema = z.object({
  senha,
});

export type ResetSenhaRequest = z.infer<typeof resetSenhaSchema>;
