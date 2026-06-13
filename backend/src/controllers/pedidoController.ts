import { Request, Response, NextFunction } from "express";
import { createPedidoSchema, listPedidosQuerySchema } from "../schemas/pedido";
import { criarPedido } from "../services/pedidoService";
import { getPedidoWithItens, listPedidos } from "../services/pedidoQuery";

/**
 * POST /pedidos — cria um pedido (status "aberto") para o vendedor autenticado.
 * Requer perfil vendedor/admin (aplicado na rota). Retorna 201 com o pedido completo.
 */
export const createPedido = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createPedidoSchema.parse(req.body);
    const pedido = await criarPedido(data, req.user!.id);
    return res.status(201).json(pedido);
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /pedidos — lista pedidos com filtros opcionais (status, vendedor_id, data).
 * Scoping automático por papel: vendedor vê só os próprios; caixa/estoque/montador
 * veem somente pedidos no estágio do seu workflow.
 */
export const getPedidos = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = listPedidosQuerySchema.parse(req.query);
    const pedidos = await listPedidos(filters, req.user);
    return res.json(pedidos);
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /pedidos/:id — detalhe completo do pedido (itens + peça, cliente, veículo).
 * Aplica verificação de acesso por papel (403 se fora do workflow do usuário).
 */
export const getPedidoById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const pedido = await getPedidoWithItens(id, req.user);
    return res.json(pedido);
  } catch (err) {
    return next(err);
  }
};
