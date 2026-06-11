import * as pedidoQuery from "../../../services/pedidoQuery";
import * as db from "../../../lib/database";
import { AppError } from "../../../lib/AppError";

jest.mock("../../../lib/database");

const getRepositoryMock = db.AppDataSource.getRepository as jest.Mock;

/**
 * Cria um queryBuilder encadeável. Todos os métodos de construção retornam o
 * próprio builder (para permitir o encadeamento usado em listPedidos) e
 * `andWhere` é espionável para assertar o SQL/parametros gerados por filtro.
 */
const createQueryBuilderMock = (result: unknown) => {
  const qb: Record<string, jest.Mock> = {};
  qb.leftJoinAndSelect = jest.fn(() => qb);
  qb.orderBy = jest.fn(() => qb);
  qb.andWhere = jest.fn(() => qb);
  qb.getMany = jest.fn().mockResolvedValue(result);
  return qb;
};

describe("pedidoQuery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPedidoOrThrow", () => {
    it("retorna o pedido (sem relations) quando existe", async () => {
      const pedido = { id: 1, status: "aberto" };
      const repo = { findOne: jest.fn().mockResolvedValue(pedido) };
      getRepositoryMock.mockReturnValue(repo);

      const result = await pedidoQuery.getPedidoOrThrow(1);

      expect(result).toBe(pedido);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("lança AppError 404 quando não existe", async () => {
      const repo = { findOne: jest.fn().mockResolvedValue(null) };
      getRepositoryMock.mockReturnValue(repo);

      await expect(pedidoQuery.getPedidoOrThrow(99)).rejects.toBeInstanceOf(
        AppError
      );
      await expect(pedidoQuery.getPedidoOrThrow(99)).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringContaining("99"),
      });
    });
  });

  describe("getPedidoWithItens", () => {
    it("carrega o pedido completo com as relations padrão", async () => {
      const pedido = { id: 2, itens: [], cliente: null, veiculo: null };
      const repo = { findOne: jest.fn().mockResolvedValue(pedido) };
      getRepositoryMock.mockReturnValue(repo);

      const result = await pedidoQuery.getPedidoWithItens(2);

      expect(result).toBe(pedido);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
        relations: { itens: { peca: true }, cliente: true, veiculo: true },
      });
    });

    it("lança AppError 404 quando não existe", async () => {
      const repo = { findOne: jest.fn().mockResolvedValue(null) };
      getRepositoryMock.mockReturnValue(repo);

      await expect(pedidoQuery.getPedidoWithItens(404)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("listPedidos", () => {
    it("sem filtros: ordena por criado_em DESC e não aplica andWhere", async () => {
      const lista = [{ id: 1 }, { id: 2 }];
      const qb = createQueryBuilderMock(lista);
      const repo = { createQueryBuilder: jest.fn(() => qb) };
      getRepositoryMock.mockReturnValue(repo);

      const result = await pedidoQuery.listPedidos();

      expect(result).toEqual(lista);
      expect(qb.orderBy).toHaveBeenCalledWith("pedido.criado_em", "DESC");
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.getMany).toHaveBeenCalled();
    });

    it("filtro status: aplica andWhere com o status", async () => {
      const qb = createQueryBuilderMock([]);
      const repo = { createQueryBuilder: jest.fn(() => qb) };
      getRepositoryMock.mockReturnValue(repo);

      await pedidoQuery.listPedidos({ status: "pago" });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith("pedido.status = :status", {
        status: "pago",
      });
    });

    it("filtro vendedor_id: aplica andWhere (inclusive vendedor_id = 0)", async () => {
      const qb = createQueryBuilderMock([]);
      const repo = { createQueryBuilder: jest.fn(() => qb) };
      getRepositoryMock.mockReturnValue(repo);

      await pedidoQuery.listPedidos({ vendedor_id: 0 });

      // 0 !== undefined, portanto o filtro DEVE ser aplicado.
      expect(qb.andWhere).toHaveBeenCalledWith(
        "pedido.vendedor_id = :vendedorId",
        { vendedorId: 0 }
      );
    });

    it("filtro data: aplica intervalo [início, próximo dia) sobre criado_em", async () => {
      const qb = createQueryBuilderMock([]);
      const repo = { createQueryBuilder: jest.fn(() => qb) };
      getRepositoryMock.mockReturnValue(repo);

      await pedidoQuery.listPedidos({ data: "2026-06-10" });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      const [sql, params] = qb.andWhere.mock.calls[0];
      expect(sql).toBe(
        "pedido.criado_em >= :inicio AND pedido.criado_em < :fim"
      );
      expect(params.inicio).toEqual(new Date("2026-06-10T00:00:00.000Z"));
      expect(params.fim).toEqual(new Date("2026-06-11T00:00:00.000Z"));
    });

    it("filtros combinados: aplica os três andWhere", async () => {
      const qb = createQueryBuilderMock([]);
      const repo = { createQueryBuilder: jest.fn(() => qb) };
      getRepositoryMock.mockReturnValue(repo);

      await pedidoQuery.listPedidos({
        status: "aberto",
        vendedor_id: 3,
        data: "2026-01-15",
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(3);
    });
  });
});
