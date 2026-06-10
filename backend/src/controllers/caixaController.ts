import { Request, Response, NextFunction } from "express";
import { pagarSchema, cancelarSchema } from "../schemas/caixa";
import { pagarPedido, cancelarPedido } from "../services/caixaService";

/**
 * POST /pedidos/:id/pagar — registra o pagamento e promove o pedido para "pago".
 * Requer perfil caixa/admin (aplicado na rota). Retorna o pedido atualizado e
 * o pagamento (com numero_nf). Conflito de status (já pago) → 409.
 */
export const pagar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const data = pagarSchema.parse(req.body);
    const result = await pagarPedido(id, data, req.user!.id);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /pedidos/:id/cancelar — cancela o pedido (com estorno de estoque quando
 * já separado). Requer perfil caixa/admin. Cancelar um pedido "concluido" → 409.
 */
export const cancelar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const { motivo } = cancelarSchema.parse(req.body);
    const pedido = await cancelarPedido(id, motivo, req.user!.id);
    return res.json(pedido);
  } catch (err) {
    return next(err);
  }
};
