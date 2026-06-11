import * as pecaService from "../../../services/pecaService";
import * as db from "../../../lib/database";
import { AppError } from "../../../lib/AppError";

jest.mock("../../../lib/database");
// Evita persistir log de auditoria durante os testes.
jest.mock("../../../services/logService", () => ({
  registrarLog: jest.fn().mockResolvedValue(undefined),
}));

const getRepositoryMock = db.AppDataSource.getRepository as jest.Mock;

/**
 * Cria um queryBuilder encadeável cujo getMany/getOne resolve `result`.
 * Cada método chainável retorna o próprio builder; `where`/`orderBy` são
 * espionáveis para asserções de SQL.
 */
const createQueryBuilderMock = (result: unknown) => {
  const qb: Record<string, jest.Mock> = {};
  qb.where = jest.fn(() => qb);
  qb.andWhere = jest.fn(() => qb);
  qb.orderBy = jest.fn(() => qb);
  qb.getMany = jest.fn().mockResolvedValue(result);
  qb.getOne = jest.fn().mockResolvedValue(result);
  return qb;
};

describe("pecaService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("criarPeca", () => {
    it("deve lançar AppError 409 quando código já existe", async () => {
      const existente = { id: 7, codigo: "ABC-1", nome: "Filtro" };
      const qb = createQueryBuilderMock(existente);
      const repo = {
        createQueryBuilder: jest.fn(() => qb),
        create: jest.fn(),
        save: jest.fn(),
      };
      getRepositoryMock.mockReturnValue(repo);

      await expect(
        pecaService.criarPeca({ codigo: "abc-1", nome: "Outro", preco: 10 })
      ).rejects.toMatchObject({ statusCode: 409 });

      // pré-check usa ILIKE (case-insensitive)
      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining("ILIKE"),
        expect.objectContaining({ codigo: "abc-1" })
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("deve criar peça com defaults (estoque=0, minimo=0, ativo=true) quando código é único", async () => {
      const qb = createQueryBuilderMock(null);
      const created = {
        codigo: "NOVA-1",
        nome: "Vela",
        estoque: 0,
        minimo: 0,
        preco: 25,
        ativo: true,
      };
      const repo = {
        createQueryBuilder: jest.fn(() => qb),
        create: jest.fn((x) => x),
        save: jest.fn().mockResolvedValue({ id: 1, ...created }),
      };
      getRepositoryMock.mockReturnValue(repo);

      const result = await pecaService.criarPeca({
        codigo: "NOVA-1",
        nome: "Vela",
        preco: 25,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          codigo: "NOVA-1",
          estoque: 0,
          minimo: 0,
          ativo: true,
        })
      );
      expect(result).toMatchObject({ id: 1, codigo: "NOVA-1" });
    });
  });

  describe("listarEstoqueCritico", () => {
    it("deve retornar peças onde estoque <= minimo", async () => {
      const criticas = [
        { id: 1, codigo: "A", estoque: 2, minimo: 5 },
        { id: 2, codigo: "B", estoque: 0, minimo: 0 },
      ];
      const qb = createQueryBuilderMock(criticas);
      const repo = { createQueryBuilder: jest.fn(() => qb) };
      getRepositoryMock.mockReturnValue(repo);

      const result = await pecaService.listarEstoqueCritico();

      expect(qb.where).toHaveBeenCalledWith("peca.estoque <= peca.minimo");
      expect(result).toEqual(criticas);
    });
  });

  describe("listarPecas", () => {
    it("deve montar filtro ILIKE com %q% quando q é informado", async () => {
      const matched = [{ id: 1, codigo: "FLT-1", nome: "Filtro de óleo" }];
      const qb = createQueryBuilderMock(matched);
      const repo = {
        createQueryBuilder: jest.fn(() => qb),
        find: jest.fn(),
      };
      getRepositoryMock.mockReturnValue(repo);

      const result = await pecaService.listarPecas("filtro");

      expect(repo.find).not.toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining("ILIKE"),
        { q: "%filtro%" }
      );
      expect(result).toEqual(matched);
    });

    it("deve usar find() sem queryBuilder quando q está ausente", async () => {
      const todas = [{ id: 1 }, { id: 2 }];
      const repo = {
        createQueryBuilder: jest.fn(),
        find: jest.fn().mockResolvedValue(todas),
      };
      getRepositoryMock.mockReturnValue(repo);

      const result = await pecaService.listarPecas();

      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
      expect(result).toEqual(todas);
    });
  });

  describe("buscarPecaPorId", () => {
    it("deve retornar a peça quando existe", async () => {
      const peca = { id: 5, codigo: "X", nome: "Vela" };
      const repo = { findOne: jest.fn().mockResolvedValue(peca) };
      getRepositoryMock.mockReturnValue(repo);

      const result = await pecaService.buscarPecaPorId(5);

      expect(result).toBe(peca);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it("deve lançar AppError 404 quando peça não existe", async () => {
      const repo = { findOne: jest.fn().mockResolvedValue(null) };
      getRepositoryMock.mockReturnValue(repo);

      await expect(pecaService.buscarPecaPorId(999)).rejects.toBeInstanceOf(
        AppError
      );
      await expect(pecaService.buscarPecaPorId(999)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("atualizarPeca", () => {
    it("deve lançar 404 quando a peça não existe", async () => {
      const repo = {
        findOne: jest.fn().mockResolvedValue(null),
        createQueryBuilder: jest.fn(),
        save: jest.fn(),
      };
      getRepositoryMock.mockReturnValue(repo);

      await expect(
        pecaService.atualizarPeca(999, { nome: "X" })
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("deve lançar 409 quando novo código colide com outra peça", async () => {
      const atual = { id: 1, codigo: "OLD", nome: "Antiga" };
      const colisao = { id: 2, codigo: "NEW", nome: "Outra" };
      const qb = createQueryBuilderMock(colisao);
      const repo = {
        findOne: jest.fn().mockResolvedValue(atual),
        createQueryBuilder: jest.fn(() => qb),
        save: jest.fn(),
      };
      getRepositoryMock.mockReturnValue(repo);

      await expect(
        pecaService.atualizarPeca(1, { codigo: "NEW" })
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("deve atualizar todos os campos (incl. novo código livre) e salvar", async () => {
      const atual = {
        id: 1,
        codigo: "OLD",
        nome: "Antiga",
        estoque: 1,
        minimo: 0,
        preco: 5,
        ativo: true,
      };
      // pré-check de colisão de código retorna null (código livre)
      const qb = createQueryBuilderMock(null);
      const repo = {
        findOne: jest.fn().mockResolvedValue(atual),
        createQueryBuilder: jest.fn(() => qb),
        save: jest.fn((p) => Promise.resolve(p)),
      };
      getRepositoryMock.mockReturnValue(repo);

      const result = await pecaService.atualizarPeca(
        1,
        {
          codigo: "NEW",
          nome: "Nova",
          estoque: 9,
          minimo: 2,
          preco: 30,
          ativo: false,
        },
        77
      );

      const saved = repo.save.mock.calls[0][0];
      expect(saved).toMatchObject({
        id: 1,
        codigo: "NEW",
        nome: "Nova",
        estoque: 9,
        minimo: 2,
        preco: 30,
        ativo: false,
      });
      expect(result).toMatchObject({ codigo: "NEW", nome: "Nova" });
    });

    it("não consulta colisão quando o código não muda (mesmo valor)", async () => {
      const atual = {
        id: 1,
        codigo: "SAME",
        nome: "Antiga",
        estoque: 1,
        minimo: 0,
        preco: 5,
        ativo: true,
      };
      const repo = {
        findOne: jest.fn().mockResolvedValue(atual),
        createQueryBuilder: jest.fn(),
        save: jest.fn((p) => Promise.resolve(p)),
      };
      getRepositoryMock.mockReturnValue(repo);

      await pecaService.atualizarPeca(1, { codigo: "SAME", nome: "Renomeada" });

      // código idêntico → não dispara o pré-check de unicidade.
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
      const saved = repo.save.mock.calls[0][0];
      expect(saved.nome).toBe("Renomeada");
      expect(saved.codigo).toBe("SAME");
    });
  });
});
