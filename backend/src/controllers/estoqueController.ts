import { Request, Response, NextFunction } from "express";
import { separarSchema, devolverSchema } from "../schemas/estoque";
import {
  iniciarSeparacao,
  separarItem,
  enviarMontagem,
  devolverCaixa,
} from "../services/estoqueService";

/**
 * Controllers de ESTOQUE / SEPARAÇÃO. Requer perfil estoque/admin (aplicado na
 * rota). Validam o body via Zod e delegam a regra ao estoqueService; erros são
 * propagados via next(err) para o errorHandler formatar a resposta.
 */

/**
 * POST /pedidos/:id/iniciar-separacao — pago/devolvido_caixa → em_separacao.
 */
export const postIniciarSeparacao = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const pedido = await iniciarSeparacao(id, req.user!.id);
    return res.json(pedido);
  } catch (err) {
    return next(err);
  }
};

/**
 * PUT /pedidos/:id/itens/:item_id/separar — baixa `qtd_confirmada` do estoque
 * da peça do item (transação com lock + recheck; nunca deixa negativo).
 * Retorna { estoque_restante, alerta }.
 */
export const putSepararItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const itemId = Number(req.params.item_id);
    const { qtd_confirmada } = separarSchema.parse(req.body);
    const resultado = await separarItem(
      id,
      itemId,
      qtd_confirmada,
      req.user!.id
    );
    return res.json(resultado);
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /pedidos/:id/enviar-montagem — em_separacao → liberado
 * (400 se houver itens não separados).
 */
export const postEnviarMontagem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const pedido = await enviarMontagem(id, req.user!.id);
    return res.json(pedido);
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /pedidos/:id/devolver-caixa — em_separacao/liberado → devolvido_caixa.
 */
export const postDevolverCaixa = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const { motivo } = devolverSchema.parse(req.body);
    const pedido = await devolverCaixa(id, motivo, req.user!.id);
    return res.json(pedido);
  } catch (err) {
    return next(err);
  }
};
