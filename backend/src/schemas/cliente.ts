import { z } from "zod";

export const createClienteSchema = z.object({
  nome: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(200, "Nome deve ter no máximo 200 caracteres"),
  telefone: z
    .string()
    .min(8, "Telefone deve ter no mínimo 8 caracteres")
    .max(20, "Telefone deve ter no máximo 20 caracteres"),
});

export type CreateClienteRequest = z.infer<typeof createClienteSchema>;

export const updateClienteSchema = z.object({
  nome: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(200, "Nome deve ter no máximo 200 caracteres")
    .optional(),
  telefone: z
    .string()
    .min(8, "Telefone deve ter no mínimo 8 caracteres")
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .optional(),
  ativo: z.boolean().optional(),
});

export type UpdateClienteRequest = z.infer<typeof updateClienteSchema>;

export const createVeiculoSchema = z.object({
  placa: z
    .string()
    .min(5, "Placa deve ter no mínimo 5 caracteres")
    .max(10, "Placa deve ter no máximo 10 caracteres"),
  modelo: z
    .string()
    .max(100, "Modelo deve ter no máximo 100 caracteres")
    .optional(),
  ano: z
    .number()
    .int("Ano deve ser um número inteiro")
    .optional(),
});

export type CreateVeiculoRequest = z.infer<typeof createVeiculoSchema>;
