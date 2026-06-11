import { z } from "zod";

/**
 * Filtros de consulta de logs de auditoria (GET /admin/logs).
 * Datas e números chegam como string na query e são coeridos.
 */
export const listLogsSchema = z.object({
  usuario_id: z.coerce.number().int().positive().optional(),
  inicio: z.coerce.date().optional(),
  fim: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type ListLogsQuery = z.infer<typeof listLogsSchema>;
