import { z } from "zod";

export const createPecaSchema = z.object({
  codigo: z
    .string()
    .min(1, "Código é obrigatório")
    .max(50, "Código deve ter no máximo 50 caracteres"),
  nome: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(200, "Nome deve ter no máximo 200 caracteres"),
  estoque: z.number().int().nonnegative().optional(),
  minimo: z.number().int().nonnegative().optional(),
  preco: z.number().nonnegative("Preço não pode ser negativo"),
  ativo: z.boolean().optional(),
});

export type CreatePecaRequest = z.infer<typeof createPecaSchema>;

export const updatePecaSchema = z.object({
  codigo: z
    .string()
    .min(1, "Código é obrigatório")
    .max(50, "Código deve ter no máximo 50 caracteres")
    .optional(),
  nome: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(200, "Nome deve ter no máximo 200 caracteres")
    .optional(),
  estoque: z.number().int().nonnegative().optional(),
  minimo: z.number().int().nonnegative().optional(),
  preco: z.number().nonnegative("Preço não pode ser negativo").optional(),
  ativo: z.boolean().optional(),
});

export type UpdatePecaRequest = z.infer<typeof updatePecaSchema>;
