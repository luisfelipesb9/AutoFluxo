import { Request, Response, NextFunction } from "express";
import * as relatorioService from "../services/relatorioService";
import {
  vendasSchema,
  pecasMaisVendidasSchema,
  historicoClienteSchema,
  pedidosStatusSchema,
  performanceSchema,
} from "../schemas/relatorio";
import { sendReport } from "../lib/csv";
import { registrarLog } from "../services/logService";
import { sanitizeDetalhe } from "../lib/requestContext";

// Auditoria de acesso a relatório (usuário/IP vêm do contexto da requisição).
const auditarAcesso = (tipo: string, filtros: unknown): Promise<void> =>
  registrarLog({
    acao: `relatorio.${tipo}`,
    entidade: "relatorio",
    detalhe: sanitizeDetalhe(filtros),
  });

export const vendas = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const q = vendasSchema.parse(req.query);
    const rows = await relatorioService.relatorioVendas(q);
    await auditarAcesso("vendas", q);
    sendReport(req, res, "vendas", rows);
  } catch (err) {
    next(err);
  }
};

export const pecasMaisVendidas = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const q = pecasMaisVendidasSchema.parse(req.query);
    const rows = await relatorioService.relatorioPecasMaisVendidas(q);
    await auditarAcesso("pecas-mais-vendidas", q);
    sendReport(req, res, "pecas-mais-vendidas", rows);
  } catch (err) {
    next(err);
  }
};

export const estoqueCritico = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const rows = await relatorioService.relatorioEstoqueCritico();
    await auditarAcesso("estoque-critico", {});
    sendReport(req, res, "estoque-critico", rows);
  } catch (err) {
    next(err);
  }
};

export const historicoCliente = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const q = historicoClienteSchema.parse(req.query);
    const rows = await relatorioService.relatorioHistoricoCliente(q);
    await auditarAcesso("historico-cliente", q);
    sendReport(req, res, "historico-cliente", rows);
  } catch (err) {
    next(err);
  }
};

export const pedidosStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const q = pedidosStatusSchema.parse(req.query);
    const rows = await relatorioService.relatorioPedidosStatus(q);
    await auditarAcesso("pedidos-status", q);
    sendReport(req, res, "pedidos-status", rows);
  } catch (err) {
    next(err);
  }
};

export const performance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const q = performanceSchema.parse(req.query);
    const rows = await relatorioService.relatorioPerformance(q);
    await auditarAcesso("performance", q);
    sendReport(req, res, "performance", rows);
  } catch (err) {
    next(err);
  }
};
