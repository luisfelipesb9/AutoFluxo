import { z } from "zod";
import { FormaPagamento } from "../entities/enums";

/**
 * Validação das operações de CAIXA sobre um pedido.
 *
 * Bodies em snake_case. Campos monetários são `number` (transformer numérico nas
 * entidades). Erros de validação viram 400 no errorHandler central (ZodError).
 */

/**
 * POST /pedidos/:id/pagar
 * Body: { forma_pagamento, valor }
 * - forma_pagamento ∈ FormaPagamento (dinheiro | pix | cartao_debito | cartao_credito)
 * - valor: número positivo (> 0)
 */
export const pagarSchema = z.object({
  forma_pagamento: z.nativeEnum(FormaPagamento, {
    error: "forma_pagamento inválida",
  }),
  valor: z.number().positive("valor deve ser maior que zero"),
});

/**
 * POST /pedidos/:id/cancelar
 * Body: { motivo }
 * - motivo: string com ao menos 3 caracteres (justificativa do cancelamento).
 */
export const cancelarSchema = z.object({
  motivo: z.string().min(3, "motivo deve ter ao menos 3 caracteres"),
});

export type PagarRequest = z.infer<typeof pagarSchema>;
export type CancelarRequest = z.infer<typeof cancelarSchema>;
