import { Request, Response, NextFunction } from "express";
import { searchSchema } from "../schemas/search";
import { buscarPorLinguagemNatural } from "../services/searchService";

export const buscarNl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { query } = searchSchema.parse(req.body);
    const resultado = await buscarPorLinguagemNatural(query);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
};
