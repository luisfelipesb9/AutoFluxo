import { Request, Response, NextFunction } from "express";
import { iniciarMontagem, concluirPedido } from "../services/montagemService";

/**
 * Controllers de MONTAGEM (base /pedidos). Acesso restrito a montador/admin
 * (aplicado na rota via requireRole). Sem corpo de requisição — o id vem da URL
 * e o montador do token (req.user). Erros são propagados ao errorHandler.
 */

/**
 * POST /pedidos/:id/iniciar-montagem — inicia a montagem (liberado → em_montagem).
 * Retorna 200 com o pedido atualizado.
 */
export const postIniciarMontagem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const pedido = await iniciarMontagem(id, req.user!.id);
    return res.json(pedido);
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /pedidos/:id/concluir — conclui a montagem (em_montagem → concluido).
 * Retorna 200 com o pedido atualizado.
 */
export const postConcluir = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const pedido = await concluirPedido(id, req.user!.id);
    return res.json(pedido);
  } catch (err) {
    return next(err);
  }
};
