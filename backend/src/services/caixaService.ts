import { AppDataSource } from "../lib/database";
import { Pedido } from "../entities/Pedido";
import { Peca } from "../entities/Peca";
import { Pagamento } from "../entities/Pagamento";
import { MovimentacaoEstoque } from "../entities/MovimentacaoEstoque";
import { PedidoStatus, TipoMovimentacao } from "../entities/enums";
import { assertTransition } from "../lib/state-machine";
import { registrarLog } from "./logService";
import { AuditAction, AuditEntity } from "../lib/auditActions";
import {
  getPedidoOrThrow,
  getPedidoWithItens,
} from "./pedidoQuery";
import type { PagarRequest } from "../schemas/caixa";

/**
 * Operações de CAIXA sobre um pedido (Ticket 3 — Wave 2).
 *
 * Não edita pedidoService.ts: carrega pedidos via read-helpers de pedidoQuery
 * (`getPedidoOrThrow` / `getPedidoWithItens`) e delega a validação de transição
 * de status à máquina de estados (`assertTransition`, que lança 409 quando ilegal).
 */

/**
 * Registra o pagamento de um pedido e o promove para o status "pago".
 *
 * Regras:
 * - Carrega o pedido (404 se não existir).
 * - `assertTransition(status, "pagar")` exige status "aberto" — caso contrário
 *   lança erro 409 (ex.: pedido já pago).
 * - Em transação atômica:
 *     1. gera `numero_nf` via sequence `pagamento_nf_seq`;
 *     2. insere Pagamento { pedido_id, numero_nf, forma_pagamento, valor, caixa_id };
 *     3. atualiza o pedido → status "pago", pago_em, forma_pagamento, caixa_id.
 * - Auditoria via registrarLog (nunca quebra o fluxo).
 *
 * @param id      id do pedido.
 * @param data    payload já validado (forma_pagamento, valor).
 * @param caixaId id do caixa autenticado (req.user.id).
 * @returns { pedido (completo, recarregado), pagamento (com numero_nf) }.
 */
export const pagarPedido = async (
  id: number,
  data: PagarRequest,
  caixaId: number
): Promise<{ pedido: Pedido; pagamento: Pagamento }> => {
  // 1. Carrega o pedido e valida a transição (lança 409 se não estiver "aberto").
  const pedido = await getPedidoOrThrow(id);
  assertTransition(pedido.status as PedidoStatus, "pagar");

  // 2. Pagamento + atualização do pedido de forma atômica.
  const pagamento = await AppDataSource.transaction(async (manager) => {
    // 2a. Número da NF a partir da sequence do Postgres.
    const rows = await manager.query(
      "SELECT nextval('pagamento_nf_seq') AS n"
    );
    const numeroNf = Number(rows[0].n);

    // 2b. Persiste o Pagamento (pedido_id / numero_nf são únicos).
    const novoPagamento = manager.create(Pagamento, {
      pedido_id: id,
      numero_nf: numeroNf,
      forma_pagamento: data.forma_pagamento,
      valor: data.valor,
      caixa_id: caixaId,
    });
    const pagamentoSalvo = await manager.save(novoPagamento);

    // 2c. Promove o pedido para "pago".
    await manager.update(Pedido, id, {
      status: PedidoStatus.PAGO,
      pago_em: new Date(),
      forma_pagamento: data.forma_pagamento,
      caixa_id: caixaId,
    });

    return pagamentoSalvo;
  });

  // 3. Auditoria.
  await registrarLog({
    usuario_id: caixaId,
    acao: AuditAction.PEDIDO_PAGAR,
    entidade: AuditEntity.PEDIDO,
    entidade_id: id,
    detalhe: data.forma_pagamento,
  });

  // 4. Recarrega o pedido completo (já no status "pago") e o devolve junto com a NF.
  const pedidoAtualizado = await getPedidoWithItens(id);
  return { pedido: pedidoAtualizado, pagamento };
};

/**
 * Cancela um pedido, com estorno de estoque quando já houve separação.
 *
 * Regras:
 * - Carrega o pedido com itens (404 se não existir).
 * - `assertTransition(status, "cancelar")` (via canCancel) lança 409 quando o
 *   pedido está "concluido" (ou já "cancelado").
 * - ESTORNO: se algum item foi separado (qtd_confirmada > 0), em transação
 *   re-incrementa `peca.estoque` em qtd_confirmada e registra uma
 *   MovimentacaoEstoque do tipo "entrada" (observacao "estorno por cancelamento").
 * - Atualiza o pedido → status "cancelado", motivo_cancelamento, cancelado_em.
 * - Auditoria via registrarLog.
 *
 * @param id        id do pedido.
 * @param motivo    justificativa do cancelamento (já validada, min 3 chars).
 * @param usuarioId id do usuário autenticado (req.user.id).
 * @returns o pedido completo atualizado (status "cancelado").
 */
export const cancelarPedido = async (
  id: number,
  motivo: string,
  usuarioId: number
): Promise<Pedido> => {
  // 1. Carrega o pedido com itens e valida a transição (lança 409 se "concluido").
  const pedido = await getPedidoWithItens(id);
  assertTransition(pedido.status as PedidoStatus, "cancelar");

  // 2. Itens efetivamente separados (qtd_confirmada > 0) precisam de estorno.
  const itensSeparados = (pedido.itens ?? []).filter(
    (item) => (item.qtd_confirmada ?? 0) > 0
  );

  // 3. Estorno (se houver) + atualização do pedido, atomicamente.
  await AppDataSource.transaction(async (manager) => {
    for (const item of itensSeparados) {
      const qtd = item.qtd_confirmada ?? 0;

      // 3a. Devolve a quantidade confirmada ao estoque da peça.
      await manager.increment(Peca, { id: item.peca_id }, "estoque", qtd);

      // 3b. Registra a movimentação de entrada (rastreabilidade do estorno).
      const movimentacao = manager.create(MovimentacaoEstoque, {
        peca_id: item.peca_id,
        tipo: TipoMovimentacao.ENTRADA,
        qtd,
        pedido_id: id,
        item_id: item.id,
        usuario_id: usuarioId,
        observacao: "estorno por cancelamento",
      });
      await manager.save(movimentacao);
    }

    // 3c. Marca o pedido como cancelado.
    await manager.update(Pedido, id, {
      status: PedidoStatus.CANCELADO,
      motivo_cancelamento: motivo,
      cancelado_em: new Date(),
    });
  });

  // 4. Auditoria.
  await registrarLog({
    usuario_id: usuarioId,
    acao: AuditAction.PEDIDO_CANCELAR,
    entidade: AuditEntity.PEDIDO,
    entidade_id: id,
    detalhe: motivo,
  });

  // 5. Recarrega o pedido completo já no status "cancelado".
  return getPedidoWithItens(id);
};
