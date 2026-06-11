import { Request, Response, NextFunction } from "express";
import {
  listarClientes,
  buscarClientePorId,
  criarCliente,
  atualizarCliente,
  adicionarVeiculo,
} from "../services/clienteService";
import {
  createClienteSchema,
  updateClienteSchema,
  createVeiculoSchema,
} from "../schemas/cliente";

export const getClientes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const clientes = await listarClientes(q);
    res.json(clientes);
  } catch (err) {
    next(err);
  }
};

export const getClienteById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const cliente = await buscarClientePorId(id);
    res.json(cliente);
  } catch (err) {
    next(err);
  }
};

export const postCliente = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createClienteSchema.parse(req.body);
    const cliente = await criarCliente(data, req.user?.id);
    res.status(201).json(cliente);
  } catch (err) {
    next(err);
  }
};

export const putCliente = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const data = updateClienteSchema.parse(req.body);
    const cliente = await atualizarCliente(id, data, req.user?.id);
    res.json(cliente);
  } catch (err) {
    next(err);
  }
};

export const postVeiculo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const clienteId = Number(req.params.id);
    const data = createVeiculoSchema.parse(req.body);
    const veiculo = await adicionarVeiculo(clienteId, data, req.user?.id);
    res.status(201).json(veiculo);
  } catch (err) {
    next(err);
  }
};
