import { Request, Response, NextFunction } from "express";
import { listLogsSchema } from "../schemas/adminLog";
import { listarLogs } from "../services/logQueryService";

export const listLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filtros = listLogsSchema.parse(req.query);
    const resultado = await listarLogs(filtros);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
};
