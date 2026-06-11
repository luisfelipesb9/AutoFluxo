import { AppDataSource } from "../lib/database";
import { Peca } from "../entities/Peca";
import { Pedido } from "../entities/Pedido";
import { ItemPedido } from "../entities/ItemPedido";
import { MovimentacaoEstoque } from "../entities/MovimentacaoEstoque";
import { PedidoStatus, TipoMovimentacao } from "../entities/enums";
import { AppError } from "../lib/AppError";
import { assertTransition } from "../lib/state-machine";
import { registrarLog } from "./logService";
import { AuditAction, AuditEntity } from "../lib/auditActions";
import { getPedidoOrThrow, getPedidoWithItens } from "./pedidoQuery";

/**
 * Serviço de ESTOQUE / SEPARAÇÃO (operações mais críticas do sistema).
 *
 * REGRA DE OURO: o estoque de uma peça NUNCA pode ficar negativo. A baixa de
 * estoque (separar item) é feita dentro de uma transação que bloqueia a linha
 * da peça (lock pessimista) e revalida o saldo SOB O LOCK antes de gravar —
 * eliminando a corrida entre dois separadores que tentam baixar a mesma peça.
 *
 * Transições de status delegadas a `assertTransition` (state-machine), que
 * lança 409 quando a transição é ilegal. Auditoria via `registrarLog` (nunca
 * quebra o fluxo principal).
 */

/**
 * Inicia a separação de um pedido: pago → em_separacao (ou
 * devolvido_caixa → em_separacao). 409 se o pedido estiver em outro status.
 */
export const iniciarSeparacao = async (
  id: number,
  usuarioId: number
): Promise<Pedido> => {
  const pedido = await getPedidoOrThrow(id);

  const novoStatus = assertTransition(
    pedido.status as PedidoStatus,
    "iniciar-separacao"
  );

  pedido.status = novoStatus;
  await AppDataSource.getRepository(Pedido).save(pedido);

  await registrarLog({
    usuario_id: usuarioId,
    acao: AuditAction.PEDIDO_INICIAR_SEPARACAO,
    entidade: AuditEntity.PEDIDO,
    entidade_id: pedido.id,
  });

  return getPedidoWithItens(pedido.id);
};

/**
 * Separa (baixa) um item do pedido confirmando `qtd_confirmada` unidades.
 *
 * Fluxo:
 *  1. Pedido deve existir e estar em `em_separacao` (assertTransition "separar"
 *     → 409 caso contrário).
 *  2. O item deve pertencer ao pedido (404 caso contrário).
 *  3. TRANSAÇÃO CRÍTICA: bloqueia a linha da peça (pessimistic_write), relê o
 *     saldo SOB O LOCK e recusa (400) se a baixa deixaria o estoque negativo.
 *     Só então grava: estoque -= qtd_confirmada, MovimentacaoEstoque(SAIDA) e
 *     item.qtd_confirmada.
 *
 * @returns { estoque_restante, alerta } — `alerta=true` quando o saldo final
 *          fica abaixo do `minimo` da peça.
 */
export const separarItem = async (
  id: number,
  itemId: number,
  qtd_confirmada: number,
  usuarioId: number
): Promise<{ estoque_restante: number; alerta: boolean }> => {
  const pedido = await getPedidoOrThrow(id);

  // Só é possível separar com o pedido em "em_separacao" (lança 409 senão).
  assertTransition(pedido.status as PedidoStatus, "separar");

  // O item precisa existir E pertencer a este pedido.
  const item = await AppDataSource.getRepository(ItemPedido).findOne({
    where: { id: itemId, pedido_id: id },
  });
  if (!item) {
    throw new AppError(404, `Item ${itemId} não encontrado neste pedido`);
  }

  // TRANSAÇÃO CRÍTICA — lock na PEÇA (o contador compartilhado) + recheck.
  return AppDataSource.transaction(async (em) => {
    const peca = await em
      .getRepository(Peca)
      .createQueryBuilder("p")
      .setLock("pessimistic_write")
      .where("p.id = :id", { id: item.peca_id })
      .getOne();
    if (!peca) {
      throw new AppError(404, "Peça não encontrada");
    }

    const atual = Number(peca.estoque); // estoque é INT
    // Revalidação sob o lock: jamais permitir saldo negativo.
    if (atual - qtd_confirmada < 0) {
      throw new AppError(400, "Estoque insuficiente");
    }

    peca.estoque = atual - qtd_confirmada;
    await em.save(peca);

    await em.save(
      em.create(MovimentacaoEstoque, {
        peca_id: peca.id,
        tipo: TipoMovimentacao.SAIDA,
        qtd: qtd_confirmada,
        pedido_id: id,
        item_id: item.id,
        usuario_id: usuarioId,
      })
    );

    item.qtd_confirmada = qtd_confirmada;
    await em.save(item);

    await registrarLog({
      usuario_id: usuarioId,
      acao: AuditAction.PEDIDO_SEPARAR_ITEM,
      entidade: AuditEntity.PEDIDO,
      entidade_id: id,
      detalhe: `item ${item.id} peça ${peca.id} qtd ${qtd_confirmada}`,
    });

    return {
      estoque_restante: peca.estoque,
      alerta: peca.estoque < Number(peca.minimo),
    };
  });
};

/**
 * Envia o pedido para a montagem: em_separacao → liberado.
 *
 * Bloqueia (400) se QUALQUER item ainda não foi separado
 * (`qtd_confirmada` null/undefined). Só então aplica a transição (409 se o
 * status não for em_separacao).
 */
export const enviarMontagem = async (
  id: number,
  usuarioId: number
): Promise<Pedido> => {
  const pedido = await getPedidoWithItens(id);

  const algumNaoSeparado = pedido.itens.some(
    (item) => item.qtd_confirmada === null || item.qtd_confirmada === undefined
  );
  if (algumNaoSeparado) {
    throw new AppError(400, "Há itens não separados");
  }

  const novoStatus = assertTransition(
    pedido.status as PedidoStatus,
    "enviar-montagem"
  );

  pedido.status = novoStatus;
  await AppDataSource.getRepository(Pedido).save(pedido);

  await registrarLog({
    usuario_id: usuarioId,
    acao: AuditAction.PEDIDO_ENVIAR_MONTAGEM,
    entidade: AuditEntity.PEDIDO,
    entidade_id: pedido.id,
  });

  return getPedidoWithItens(pedido.id);
};

/**
 * Devolve o pedido ao caixa: em_separacao/liberado → devolvido_caixa,
 * registrando `motivo_devolucao`. 409 se a transição for ilegal.
 */
export const devolverCaixa = async (
  id: number,
  motivo: string,
  usuarioId: number
): Promise<Pedido> => {
  const pedido = await getPedidoOrThrow(id);

  const novoStatus = assertTransition(
    pedido.status as PedidoStatus,
    "devolver-caixa"
  );

  pedido.status = novoStatus;
  pedido.motivo_devolucao = motivo;
  await AppDataSource.getRepository(Pedido).save(pedido);

  await registrarLog({
    usuario_id: usuarioId,
    acao: AuditAction.PEDIDO_DEVOLVER_CAIXA,
    entidade: AuditEntity.PEDIDO,
    entidade_id: pedido.id,
    detalhe: motivo,
  });

  return getPedidoWithItens(pedido.id);
};
