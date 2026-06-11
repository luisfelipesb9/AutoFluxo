import { AppDataSource } from "../lib/database";
import { Cliente } from "../entities/Cliente";
import { Veiculo } from "../entities/Veiculo";
import { Peca } from "../entities/Peca";
import { Pedido } from "../entities/Pedido";
import { ItemPedido } from "../entities/ItemPedido";
import { PedidoStatus } from "../entities/enums";
import { AppError } from "../lib/AppError";
import { registrarLog } from "./logService";
import { AuditAction, AuditEntity } from "../lib/auditActions";
import { getPedidoWithItens } from "./pedidoQuery";
import type { CreatePedidoRequest } from "../schemas/pedido";

/**
 * Cria um pedido no status "aberto".
 *
 * Regras:
 * - Cliente deve existir (404 caso contrário).
 * - Se veiculo_id for informado, deve existir e pertencer ao cliente (400).
 * - Cada item referencia uma peça existente e ativa (400 caso contrário).
 * - Faz snapshot de preco_unitario (= peca.preco) e calcula subtotal/total.
 * - NÃO movimenta estoque na criação (decremento só ocorre em etapas posteriores).
 * - vendedor_id = vendedorId (criador autenticado), status = ABERTO.
 * - `os` gerado via sequence `pedido_os_seq` → "OS-<n>".
 *
 * @param data       payload já validado pelo Zod (cliente_id, veiculo_id?, itens[]).
 * @param vendedorId id do usuário autenticado que cria o pedido.
 * @returns o pedido completo (itens + peça, cliente, veículo).
 */
export const criarPedido = async (
  data: CreatePedidoRequest,
  vendedorId: number
): Promise<Pedido> => {
  // 1. Cliente precisa existir.
  const clienteRepo = AppDataSource.getRepository(Cliente);
  const cliente = await clienteRepo.findOne({ where: { id: data.cliente_id } });
  if (!cliente) {
    throw new AppError(404, `Cliente ${data.cliente_id} não encontrado`);
  }

  // 2. Veículo (opcional) precisa pertencer ao cliente.
  if (data.veiculo_id !== undefined) {
    const veiculoRepo = AppDataSource.getRepository(Veiculo);
    const veiculo = await veiculoRepo.findOne({
      where: { id: data.veiculo_id },
    });
    if (!veiculo) {
      throw new AppError(404, `Veículo ${data.veiculo_id} não encontrado`);
    }
    if (veiculo.cliente_id !== data.cliente_id) {
      throw new AppError(
        400,
        "Veículo não pertence ao cliente informado"
      );
    }
  }

  // 3. Resolve as peças e monta os itens com snapshot de preço.
  //    (Sem decremento de estoque — apenas leitura para validar/precificar.)
  const pecaRepo = AppDataSource.getRepository(Peca);
  const itensData: Array<{
    peca_id: number;
    qtd: number;
    preco_unitario: number;
    subtotal: number;
  }> = [];
  let total = 0;

  for (const item of data.itens) {
    const peca = await pecaRepo.findOne({ where: { id: item.peca_id } });
    if (!peca || peca.ativo === false) {
      throw new AppError(
        400,
        `Peça ${item.peca_id} inexistente ou inativa`
      );
    }

    const precoUnitario = peca.preco;
    const subtotal = item.qtd * precoUnitario;
    total += subtotal;

    itensData.push({
      peca_id: item.peca_id,
      qtd: item.qtd,
      preco_unitario: precoUnitario,
      subtotal,
    });
  }

  // 4. Gera a OS a partir da sequence do Postgres.
  const rows = await AppDataSource.query(
    "SELECT nextval('pedido_os_seq') AS n"
  );
  const os = `OS-${rows[0].n}`;

  // 5. Persiste pedido + itens atomicamente.
  const pedidoId = await AppDataSource.transaction(async (manager) => {
    const pedido = manager.create(Pedido, {
      os,
      cliente_id: data.cliente_id,
      veiculo_id: data.veiculo_id,
      vendedor_id: vendedorId,
      status: PedidoStatus.ABERTO,
      total,
    });
    const pedidoSalvo = await manager.save(pedido);

    const itens = itensData.map((it) =>
      manager.create(ItemPedido, {
        pedido_id: pedidoSalvo.id,
        peca_id: it.peca_id,
        qtd: it.qtd,
        preco_unitario: it.preco_unitario,
        subtotal: it.subtotal,
      })
    );
    await manager.save(itens);

    return pedidoSalvo.id;
  });

  // 6. Auditoria (nunca quebra o fluxo).
  await registrarLog({
    usuario_id: vendedorId,
    acao: AuditAction.PEDIDO_CRIAR,
    entidade: AuditEntity.PEDIDO,
    entidade_id: pedidoId,
  });

  // 7. Retorna o pedido completo.
  return getPedidoWithItens(pedidoId);
};
