import { z } from "zod";

const periodo = {
  inicio: z.coerce.date(),
  fim: z.coerce.date(),
};

// R1 — Vendas por período, agrupado por dia/semana/mês.
export const vendasSchema = z.object({
  ...periodo,
  agrupamento: z.enum(["dia", "semana", "mes"]).default("dia"),
});

// R2 — Peças mais vendidas no período.
export const pecasMaisVendidasSchema = z.object({
  ...periodo,
  limit: z.coerce.number().int().min(1).max(100).default(10),
  orderBy: z.enum(["qtd", "receita"]).default("qtd"),
});

// R4 — Histórico do cliente por placa e/ou celular (ao menos um).
export const historicoClienteSchema = z
  .object({
    placa: z.string().trim().min(1).optional(),
    celular: z.string().trim().min(1).optional(),
    telefone: z.string().trim().min(1).optional(),
  })
  .refine((d) => Boolean(d.placa || d.celular || d.telefone), {
    message: "Informe ao menos placa ou celular",
  });

// R5 — Pedidos por status numa data.
export const pedidosStatusSchema = z.object({
  data: z.coerce.date(),
});

// R6 — Performance dos operadores no período.
export const performanceSchema = z.object(periodo);

export type VendasQuery = z.infer<typeof vendasSchema>;
export type PecasMaisVendidasQuery = z.infer<typeof pecasMaisVendidasSchema>;
export type HistoricoClienteQuery = z.infer<typeof historicoClienteSchema>;
export type PedidosStatusQuery = z.infer<typeof pedidosStatusSchema>;
export type PerformanceQuery = z.infer<typeof performanceSchema>;
