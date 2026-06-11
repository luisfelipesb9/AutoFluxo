import { z } from "zod";

/**
 * Validação de criação de pedido.
 * Body (snake_case): { cliente_id, veiculo_id?, itens: [{ peca_id, qtd }] }
 */
export const itemPedidoSchema = z.object({
  peca_id: z.number().int("peca_id deve ser inteiro").positive("peca_id inválido"),
  qtd: z.number().int("qtd deve ser inteiro").positive("qtd deve ser maior que zero"),
});

export const createPedidoSchema = z.object({
  cliente_id: z
    .number()
    .int("cliente_id deve ser inteiro")
    .positive("cliente_id inválido"),
  veiculo_id: z
    .number()
    .int("veiculo_id deve ser inteiro")
    .positive("veiculo_id inválido")
    .optional(),
  itens: z
    .array(itemPedidoSchema)
    .min(1, "Pedido deve conter ao menos um item"),
});

export type CreatePedidoRequest = z.infer<typeof createPedidoSchema>;
export type ItemPedidoInput = z.infer<typeof itemPedidoSchema>;

/**
 * Validação dos filtros de listagem.
 * Query (todos opcionais): ?status=&vendedor_id=&data=YYYY-MM-DD
 * vendedor_id chega como string na query → coercionado para number.
 */
export const listPedidosQuerySchema = z.object({
  status: z.string().min(1).optional(),
  vendedor_id: z.coerce
    .number()
    .int("vendedor_id deve ser inteiro")
    .positive("vendedor_id inválido")
    .optional(),
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "data deve estar no formato YYYY-MM-DD")
    .optional(),
});

export type ListPedidosQuery = z.infer<typeof listPedidosQuerySchema>;
