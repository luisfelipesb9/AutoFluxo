import { z } from "zod";

/**
 * Validação das operações de ESTOQUE / SEPARAÇÃO (snake_case).
 *
 * - separarSchema:  body de PUT /pedidos/:id/itens/:item_id/separar
 *                   → { qtd_confirmada } (inteiro positivo; a qtd de fato
 *                     separada/baixada do estoque para o item).
 * - devolverSchema: body de POST /pedidos/:id/devolver-caixa
 *                   → { motivo } (texto, mínimo 3 chars).
 */
export const separarSchema = z.object({
  qtd_confirmada: z
    .number()
    .int("qtd_confirmada deve ser inteiro")
    .positive("qtd_confirmada deve ser maior que zero"),
});

export const devolverSchema = z.object({
  motivo: z.string().min(3, "motivo deve ter ao menos 3 caracteres"),
});

export type SepararRequest = z.infer<typeof separarSchema>;
export type DevolverRequest = z.infer<typeof devolverSchema>;
