import { Request, Response, NextFunction } from "express";
import {
  listarPecas,
  listarEstoqueCritico,
  buscarPecaPorId,
  criarPeca,
  atualizarPeca,
} from "../services/pecaService";
import { createPecaSchema, updatePecaSchema } from "../schemas/peca";

export const listar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const pecas = await listarPecas(q);
    res.json(pecas);
  } catch (err) {
    next(err);
  }
};

export const estoqueCritico = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pecas = await listarEstoqueCritico();
    res.json(pecas);
  } catch (err) {
    next(err);
  }
};

export const buscarPorId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const peca = await buscarPecaPorId(id);
    res.json(peca);
  } catch (err) {
    next(err);
  }
};

export const criar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createPecaSchema.parse(req.body);
    const peca = await criarPeca(data, req.user?.id);
    res.status(201).json(peca);
  } catch (err) {
    next(err);
  }
};

export const atualizar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const data = updatePecaSchema.parse(req.body);
    const peca = await atualizarPeca(id, data, req.user?.id);
    res.json(peca);
  } catch (err) {
    next(err);
  }
};
