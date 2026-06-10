import { AppDataSource } from "../lib/database";
import { Pedido } from "../entities/Pedido";
import { AppError } from "../lib/AppError";

/**
 * Read-helpers de Pedido — consumidos pelos controllers de listagem/detalhe
 * e por agentes Wave-2 (pagamento, separação, montagem, etc.).
 *
 * Mantêm uma única fonte de verdade para "como carregar um pedido com seus
 * relacionamentos". Não fazem escrita nem regra de negócio: apenas leitura.
 */

/** Relacionamentos padrão de um pedido completo (itens + peça, cliente, veículo). */
const FULL_RELATIONS = {
  itens: { peca: true },
  cliente: true,
  veiculo: true,
} as const;

export interface ListPedidosFilters {
  /** status exato (ex.: "aberto", "pago"). */
  status?: string;
  /** vendedor responsável (exato). */
  vendedor_id?: number;
  /** dia de criação no formato YYYY-MM-DD (filtra criado_em dentro do dia). */
  data?: string;
}

/**
 * Carrega um pedido pelo id (sem relacionamentos). Lança AppError 404 se não existir.
 * Use quando só precisar do registro base (ex.: transições de status).
 */
export const getPedidoOrThrow = async (id: number): Promise<Pedido> => {
  const repo = AppDataSource.getRepository(Pedido);
  const pedido = await repo.findOne({ where: { id } });
  if (!pedido) {
    throw new AppError(404, `Pedido ${id} não encontrado`);
  }
  return pedido;
};

/**
 * Carrega um pedido completo (itens + peça, cliente, veículo).
 * Lança AppError 404 se não existir. Esta é a leitura canônica de detalhe.
 */
export const getPedidoWithItens = async (id: number): Promise<Pedido> => {
  const repo = AppDataSource.getRepository(Pedido);
  const pedido = await repo.findOne({
    where: { id },
    relations: FULL_RELATIONS,
  });
  if (!pedido) {
    throw new AppError(404, `Pedido ${id} não encontrado`);
  }
  return pedido;
};

/**
 * Lista pedidos completos aplicando filtros opcionais (status, vendedor_id, data).
 * `data` (YYYY-MM-DD) filtra `criado_em` dentro daquele dia [00:00, próximo dia).
 * Ordena por criado_em desc (mais recentes primeiro).
 */
export const listPedidos = async (
  filters: ListPedidosFilters = {}
): Promise<Pedido[]> => {
  const repo = AppDataSource.getRepository(Pedido);
  const qb = repo
    .createQueryBuilder("pedido")
    .leftJoinAndSelect("pedido.itens", "itens")
    .leftJoinAndSelect("itens.peca", "peca")
    .leftJoinAndSelect("pedido.cliente", "cliente")
    .leftJoinAndSelect("pedido.veiculo", "veiculo")
    .orderBy("pedido.criado_em", "DESC");

  if (filters.status) {
    qb.andWhere("pedido.status = :status", { status: filters.status });
  }

  if (filters.vendedor_id !== undefined) {
    qb.andWhere("pedido.vendedor_id = :vendedorId", {
      vendedorId: filters.vendedor_id,
    });
  }

  if (filters.data) {
    const inicio = new Date(`${filters.data}T00:00:00.000Z`);
    const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
    qb.andWhere("pedido.criado_em >= :inicio AND pedido.criado_em < :fim", {
      inicio,
      fim,
    });
  }

  return qb.getMany();
};
