import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
} from "typeorm";
import { AppDataSource } from "../lib/database";
import { LogAcao } from "../entities/LogAcao";
import { ListLogsQuery } from "../schemas/adminLog";

export interface LogsPage {
  data: LogAcao[];
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Lista logs de auditoria com paginação e filtros opcionais por usuário e
 * período (`criado_em`). Ordena do mais recente para o mais antigo.
 */
export const listarLogs = async (
  filtros: ListLogsQuery
): Promise<LogsPage> => {
  const repo = AppDataSource.getRepository(LogAcao);

  const where: FindOptionsWhere<LogAcao> = {};
  if (filtros.usuario_id !== undefined) {
    where.usuario_id = filtros.usuario_id;
  }
  if (filtros.inicio && filtros.fim) {
    where.criado_em = Between(filtros.inicio, filtros.fim);
  } else if (filtros.inicio) {
    where.criado_em = MoreThanOrEqual(filtros.inicio);
  } else if (filtros.fim) {
    where.criado_em = LessThanOrEqual(filtros.fim);
  }

  const [data, total] = await repo.findAndCount({
    where,
    order: { criado_em: "DESC", id: "DESC" },
    skip: (filtros.page - 1) * filtros.pageSize,
    take: filtros.pageSize,
  });

  return { data, page: filtros.page, pageSize: filtros.pageSize, total };
};
