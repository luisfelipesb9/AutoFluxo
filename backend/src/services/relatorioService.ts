import { AppDataSource } from "../lib/database";
import { estoqueCriticoWhere } from "../lib/estoqueCritico";
import {
  VendasQuery,
  PecasMaisVendidasQuery,
  HistoricoClienteQuery,
  PedidosStatusQuery,
  PerformanceQuery,
} from "../schemas/relatorio";

type Row = Record<string, unknown>;

// Filtros de data são tratados como dia puro (YYYY-MM-DD). Passar um Date ao
// driver pg o serializa no fuso do host (ex.: -03), deslocando `::date` em UTC
// e quebrando o filtro "do dia". Como string, o Postgres usa a data literal.
const ymd = (d: Date): string => d.toISOString().slice(0, 10);

// Mapeia o agrupamento do contrato (PT) para a unidade do date_trunc (Postgres).
// Whitelist fixa — seguro interpolar na query.
const AGRUPAMENTO: Record<VendasQuery["agrupamento"], string> = {
  dia: "day",
  semana: "week",
  mes: "month",
};

// R1 — Vendas (receita realizada via pagamentos) agrupadas por período.
export const relatorioVendas = async (q: VendasQuery): Promise<Row[]> => {
  const unidade = AGRUPAMENTO[q.agrupamento];
  return AppDataSource.query(
    `SELECT date_trunc('${unidade}', criado_em) AS periodo,
            COUNT(*)::int AS qtd_pagamentos,
            COALESCE(SUM(valor), 0)::float8 AS receita
       FROM pagamentos
      WHERE criado_em >= $1::date AND criado_em < ($2::date + interval '1 day')
      GROUP BY periodo
      ORDER BY periodo`,
    [ymd(q.inicio), ymd(q.fim)]
  );
};

// R2 — Peças mais vendidas no período (exclui pedidos cancelados).
export const relatorioPecasMaisVendidas = async (
  q: PecasMaisVendidasQuery
): Promise<Row[]> => {
  // orderBy é enum validado (qtd | receita) — seguro interpolar.
  return AppDataSource.query(
    `SELECT p.id, p.codigo, p.nome,
            COALESCE(SUM(i.qtd), 0)::int AS qtd,
            COALESCE(SUM(i.subtotal), 0)::float8 AS receita
       FROM itens_pedido i
       JOIN pedidos pd ON pd.id = i.pedido_id
       JOIN pecas p ON p.id = i.peca_id
      WHERE pd.criado_em >= $1::date AND pd.criado_em < ($2::date + interval '1 day')
        AND pd.status <> 'cancelado'
      GROUP BY p.id, p.codigo, p.nome
      ORDER BY ${q.orderBy} DESC
      LIMIT $3`,
    [ymd(q.inicio), ymd(q.fim), q.limit]
  );
};

// R3 — Estoque crítico: peças ativas abaixo do mínimo. qtd_faltante = minimo -
// estoque. Mesma regra do GET /api/pecas/estoque-critico (lib/estoqueCritico);
// aqui é a versão admin: subset + qtd_faltante, ordenada por quem falta mais.
export const relatorioEstoqueCritico = async (): Promise<Row[]> => {
  return AppDataSource.query(
    `SELECT id, codigo, nome, estoque, minimo,
            (minimo - estoque) AS qtd_faltante
       FROM pecas
      WHERE ${estoqueCriticoWhere()}
      ORDER BY qtd_faltante DESC`
  );
};

// R4 — Histórico do cliente: resolve o(s) cliente(s) por telefone/placa e
// traz TODOS os pedidos deles.
export const relatorioHistoricoCliente = async (
  q: HistoricoClienteQuery
): Promise<Row[]> => {
  const telefone = q.celular ?? q.telefone ?? null;
  const placa = q.placa ?? null;
  return AppDataSource.query(
    `SELECT pd.id, pd.os, pd.status,
            pd.total::float8 AS total,
            pd.criado_em,
            c.nome AS cliente_nome, c.telefone,
            v.placa
       FROM pedidos pd
       JOIN clientes c ON c.id = pd.cliente_id
       LEFT JOIN veiculos v ON v.id = pd.veiculo_id
      WHERE pd.cliente_id IN (
              SELECT c2.id
                FROM clientes c2
                LEFT JOIN veiculos v2 ON v2.cliente_id = c2.id
               WHERE ($1::text IS NULL OR c2.telefone = $1)
                 AND ($2::text IS NULL OR v2.placa = $2)
            )
      ORDER BY pd.criado_em DESC`,
    [telefone, placa]
  );
};

// R5 — Pedidos por status numa data (por status atual dos pedidos criados na data).
export const relatorioPedidosStatus = async (
  q: PedidosStatusQuery
): Promise<Row[]> => {
  return AppDataSource.query(
    `SELECT status, COUNT(*)::int AS total
       FROM pedidos
      WHERE criado_em::date = $1::date
      GROUP BY status
      ORDER BY status`,
    [ymd(q.data)]
  );
};

// R6 — Performance dos operadores no período, agrupada por perfil. Deriva dos
// DADOS DE NEGÓCIO (não de logs_acao, que é frágil a expurgo e não cobre ações
// pré-auditoria): vendedor = pedidos vendidos (vendedor_id); montador =
// montagens concluídas (montador_id + concluido_em); estoque = movimentações
// de estoque (usuario_id). LEFT JOIN inclui operadores ativos com total 0 no
// período. `total` é a métrica de produtividade natural de cada perfil.
export const relatorioPerformance = async (
  q: PerformanceQuery
): Promise<Row[]> => {
  return AppDataSource.query(
    `SELECT perfil, usuario_id, nome, total
       FROM (
         SELECT u.perfil, u.id AS usuario_id, u.nome,
                COUNT(p.id)::int AS total
           FROM usuarios u
           LEFT JOIN pedidos p
                  ON p.vendedor_id = u.id
                 AND p.criado_em >= $1::date
                 AND p.criado_em < ($2::date + interval '1 day')
          WHERE u.perfil = 'vendedor' AND u.ativo = true
          GROUP BY u.id, u.perfil, u.nome

         UNION ALL

         SELECT u.perfil, u.id AS usuario_id, u.nome,
                COUNT(p.id)::int AS total
           FROM usuarios u
           LEFT JOIN pedidos p
                  ON p.montador_id = u.id
                 AND p.concluido_em >= $1::date
                 AND p.concluido_em < ($2::date + interval '1 day')
          WHERE u.perfil = 'montador' AND u.ativo = true
          GROUP BY u.id, u.perfil, u.nome

         UNION ALL

         SELECT u.perfil, u.id AS usuario_id, u.nome,
                COUNT(m.id)::int AS total
           FROM usuarios u
           LEFT JOIN movimentacao_estoque m
                  ON m.usuario_id = u.id
                 AND m.criado_em >= $1::date
                 AND m.criado_em < ($2::date + interval '1 day')
          WHERE u.perfil = 'estoque' AND u.ativo = true
          GROUP BY u.id, u.perfil, u.nome
       ) t
      ORDER BY perfil ASC, total DESC`,
    [ymd(q.inicio), ymd(q.fim)]
  );
};
