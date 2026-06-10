import * as clienteService from "../../../services/clienteService";
import * as db from "../../../lib/database";
import { AppError } from "../../../lib/AppError";
import * as logService from "../../../services/logService";

jest.mock("../../../lib/database");
jest.mock("../../../services/logService");

describe("clienteService", () => {
  let clienteRepo: any;
  let veiculoRepo: any;
  let logRepo: any;
  let queryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };

    clienteRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto: any) => dto),
      save: jest.fn(),
    };

    veiculoRepo = {
      create: jest.fn((dto: any) => dto),
      save: jest.fn(),
    };

    logRepo = { save: jest.fn() };

    // logService usa getRepository(LogAcao) internamente; aqui logService está
    // mockado, mas mantemos um fallback de repositório para qualquer chamada.
    (db.AppDataSource.getRepository as jest.Mock).mockImplementation(
      (entity: any) => {
        const name = entity?.name ?? entity;
        if (name === "Cliente") return clienteRepo;
        if (name === "Veiculo") return veiculoRepo;
        return logRepo;
      }
    );

    (logService.registrarLog as jest.Mock).mockResolvedValue(undefined);
  });

  describe("listarClientes (busca por placa retorna o DONO)", () => {
    it("ao buscar por placa, junta veiculos e retorna o cliente dono com TODOS os veículos", async () => {
      // Passo 1: o queryBuilder casa o cliente id=7 (dono da placa).
      queryBuilder.getRawMany.mockResolvedValue([{ id: 7 }]);

      const owner = {
        id: 7,
        nome: "Maria",
        telefone: "11999990000",
        ativo: true,
        veiculos: [
          { id: 1, cliente_id: 7, placa: "ABC1D23" },
          { id: 2, cliente_id: 7, placa: "XYZ9K88" },
        ],
      };
      // Passo 2: carrega o cliente casado com a relação veiculos completa.
      clienteRepo.find.mockResolvedValue([owner]);

      const result = await clienteService.listarClientes("ABC1D23");

      // A query deve ter feito join em veiculos filtrando também por placa.
      expect(clienteRepo.createQueryBuilder).toHaveBeenCalledWith("c");
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith("c.veiculos", "v");
      expect(queryBuilder.where).toHaveBeenCalledWith(
        "c.nome ILIKE :q OR c.telefone ILIKE :q OR v.placa ILIKE :q",
        { q: "%ABC1D23%" }
      );

      // Retorna o cliente DONO carregado com a relação veiculos.
      expect(clienteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [{ id: 7 }],
          relations: { veiculos: true },
        })
      );
      expect(result).toEqual([owner]);
      expect(result[0].id).toBe(7);
      expect(result[0].veiculos).toHaveLength(2);
    });

    it("retorna [] quando nenhum cliente casa com a placa", async () => {
      queryBuilder.getRawMany.mockResolvedValue([]);

      const result = await clienteService.listarClientes("NOPE000");

      expect(result).toEqual([]);
      expect(clienteRepo.find).not.toHaveBeenCalled();
    });

    it("sem q, lista todos os clientes com veículos", async () => {
      const lista = [{ id: 1, nome: "A", veiculos: [] }];
      clienteRepo.find.mockResolvedValue(lista);

      const result = await clienteService.listarClientes();

      expect(clienteRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(clienteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ relations: { veiculos: true } })
      );
      expect(result).toEqual(lista);
    });
  });

  describe("buscarClientePorId", () => {
    it("retorna o cliente com veículos", async () => {
      const cliente = { id: 3, nome: "João", veiculos: [] };
      clienteRepo.findOne.mockResolvedValue(cliente);

      const result = await clienteService.buscarClientePorId(3);

      expect(clienteRepo.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
        relations: { veiculos: true },
      });
      expect(result).toEqual(cliente);
    });

    it("lança AppError 404 quando não existe", async () => {
      clienteRepo.findOne.mockResolvedValue(null);

      await expect(clienteService.buscarClientePorId(999)).rejects.toThrow(
        AppError
      );
      await expect(
        clienteService.buscarClientePorId(999)
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("criarCliente", () => {
    it("cria com ativo=true, salva e registra log", async () => {
      const salvo = {
        id: 10,
        nome: "Novo",
        telefone: "11988887777",
        ativo: true,
      };
      clienteRepo.save.mockResolvedValue(salvo);

      const result = await clienteService.criarCliente(
        { nome: "Novo", telefone: "11988887777" },
        1
      );

      expect(clienteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: "Novo",
          telefone: "11988887777",
          ativo: true,
        })
      );
      expect(clienteRepo.save).toHaveBeenCalled();
      expect(logService.registrarLog).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "cliente.criar", entidade_id: 10 })
      );
      expect(result).toEqual(salvo);
    });
  });

  describe("atualizarCliente", () => {
    it("lança AppError 404 quando o cliente não existe", async () => {
      clienteRepo.findOne.mockResolvedValue(null);

      await expect(
        clienteService.atualizarCliente(404, { nome: "X" }, 1)
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(clienteRepo.save).not.toHaveBeenCalled();
    });

    it("atualiza campos informados e registra log", async () => {
      const existente = {
        id: 5,
        nome: "Antigo",
        telefone: "111",
        ativo: true,
      };
      clienteRepo.findOne.mockResolvedValue(existente);
      clienteRepo.save.mockImplementation(async (c: any) => c);

      const result = await clienteService.atualizarCliente(
        5,
        { nome: "Atualizado", ativo: false },
        1
      );

      expect(result.nome).toBe("Atualizado");
      expect(result.ativo).toBe(false);
      expect(result.telefone).toBe("111");
      expect(logService.registrarLog).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "cliente.atualizar", entidade_id: 5 })
      );
    });
  });

  describe("adicionarVeiculo (append a um cliente com muitos veículos)", () => {
    it("anexa um novo veículo ao cliente e registra log", async () => {
      clienteRepo.findOne.mockResolvedValue({ id: 7, nome: "Maria" });
      const salvo = {
        id: 99,
        cliente_id: 7,
        placa: "NEW1A23",
        modelo: "Civic",
        ano: 2020,
      };
      veiculoRepo.save.mockResolvedValue(salvo);

      const result = await clienteService.adicionarVeiculo(
        7,
        { placa: "NEW1A23", modelo: "Civic", ano: 2020 },
        1
      );

      expect(clienteRepo.findOne).toHaveBeenCalledWith({ where: { id: 7 } });
      expect(veiculoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ cliente_id: 7, placa: "NEW1A23" })
      );
      expect(veiculoRepo.save).toHaveBeenCalled();
      expect(logService.registrarLog).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "veiculo.criar", entidade_id: 99 })
      );
      expect(result).toEqual(salvo);
    });

    it("lança AppError 404 quando o cliente não existe", async () => {
      clienteRepo.findOne.mockResolvedValue(null);

      await expect(
        clienteService.adicionarVeiculo(404, { placa: "ABC1D23" }, 1)
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(veiculoRepo.save).not.toHaveBeenCalled();
    });
  });
});
