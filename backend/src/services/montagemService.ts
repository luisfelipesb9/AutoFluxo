import { AppDataSource } from "../lib/database";
import { Pedido } from "../entities/Pedido";
import { PedidoStatus } from "../entities/enums";
import { assertTransition } from "../lib/state-machine";
import { getPedidoOrThrow } from "./pedidoQuery";
import { registrarLog } from "./logService";
import { AuditAction, AuditEntity } from "../lib/auditActions";

/**
 * Operações de MONTAGEM no ciclo de vida do Pedido (Ticket 5).
 *
 * Transições (validadas pela máquina de estados — `assertTransition` lança 409
 * quando o status atual não permite a ação):
 *   - iniciar-montagem:  liberado    -> em_montagem
 *   - concluir:          em_montagem -> concluido
 *
 * Acesso restrito a montador/admin (aplicado nas rotas via requireRole).
 * Não editam pedidoService.ts — leitura canônica via getPedidoOrThrow.
 */

/**
 * Inicia a montagem de um pedido.
 *
 * Regras:
 * - Carrega o pedido (404 se não existir).
 * - `assertTransition(status, "iniciar-montagem")` → 409 se não estiver `liberado`.
 * - Atualiza status para `em_montagem`, registra `montagem_iniciada_em` e o
 *   `montador_id` (usuário autenticado). Persiste.
 * - Auditoria: `pedido.iniciar-montagem` (nunca quebra o fluxo).
 *
 * @param id         id do pedido.
 * @param montadorId id do montador autenticado (req.user.id).
 * @returns o pedido atualizado.
 */
export const iniciarMontagem = async (
  id: number,
  montadorId: number
): Promise<Pedido> => {
  const pedido = await getPedidoOrThrow(id);

  const novoStatus = assertTransition(
    pedido.status as PedidoStatus,
    "iniciar-montagem"
  );

  pedido.status = novoStatus;
  pedido.montagem_iniciada_em = new Date();
  pedido.montador_id = montadorId;

  const repo = AppDataSource.getRepository(Pedido);
  const atualizado = await repo.save(pedido);

  await registrarLog({
    usuario_id: montadorId,
    acao: AuditAction.PEDIDO_INICIAR_MONTAGEM,
    entidade: AuditEntity.PEDIDO,
    entidade_id: id,
  });

  return atualizado;
};

/**
 * Conclui a montagem de um pedido.
 *
 * Regras:
 * - Carrega o pedido (404 se não existir).
 * - `assertTransition(status, "concluir")` → 409 se não estiver `em_montagem`.
 * - Atualiza status para `concluido` e registra `concluido_em`. Persiste.
 * - Auditoria: `pedido.concluir` (nunca quebra o fluxo).
 *
 * @param id         id do pedido.
 * @param montadorId id do montador autenticado (req.user.id).
 * @returns o pedido atualizado.
 */
export const concluirPedido = async (
  id: number,
  montadorId: number
): Promise<Pedido> => {
  const pedido = await getPedidoOrThrow(id);

  const novoStatus = assertTransition(
    pedido.status as PedidoStatus,
    "concluir"
  );

  pedido.status = novoStatus;
  pedido.concluido_em = new Date();

  const repo = AppDataSource.getRepository(Pedido);
  const atualizado = await repo.save(pedido);

  await registrarLog({
    usuario_id: montadorId,
    acao: AuditAction.PEDIDO_CONCLUIR,
    entidade: AuditEntity.PEDIDO,
    entidade_id: id,
  });

  return atualizado;
};
