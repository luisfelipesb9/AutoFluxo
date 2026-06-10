import { criarPedido } from "../../../services/pedidoService";
import { AppDataSource } from "../../../lib/database";
import { Cliente } from "../../../entities/Cliente";
import { Veiculo } from "../../../entities/Veiculo";
import { Peca } from "../../../entities/Peca";
import { Pedido } from "../../../entities/Pedido";
import { ItemPedido } from "../../../entities/ItemPedido";
import { PedidoStatus } from "../../../entities/enums";
import { AppError } from "../../../lib/AppError";
import * as pedidoQuery from "../../../services/pedidoQuery";

// Mocka o database e o logService SEM referenciar mocks compartilhados na factory.
jest.mock("../../../lib/database", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));
jest.mock("../../../services/logService", () => ({
  registrarLog: jest.fn().mockResolvedValue(undefined),
}));

const mockGetRepository = AppDataSource.getRepository as jest.Mock;
const mockQuery = AppDataSource.query as jest.Mock;
const mockTransaction = AppDataSource.transaction as jest.Mock;

// Repositórios fake por entidade.
const clienteRepo = { findOne: jest.fn() };
const veiculoRepo = { findOne: jest.fn() };
const pecaRepo = { findOne: jest.fn() };

// Manager fake usado dentro da transação. `save` apenas devolve o que recebe
// (atribuindo um id ao pedido) — permite inspecionar o que seria persistido.
const savedEntities: any[] = [];
const manager = {
  create: jest.fn((_entity: unknown, obj: any) => obj),
  save: jest.fn(async (arg: any) => {
    savedEntities.push(arg);
    if (!Array.isArray(arg) && arg && arg.os !== undefined) {
      return { ...arg, id: 99 };
    }
    return arg;
  }),
};

const baseData = {
  cliente_id: 1,
  itens: [{ peca_id: 10, qtd: 2 }],
};

beforeEach(() => {
  jest.clearAllMocks();
  savedEntities.length = 0;

  mockGetRepository.mockImplementation((entity: unknown) => {
    if (entity === Cliente) return clienteRepo;
    if (entity === Veiculo) return veiculoRepo;
    if (entity === Peca) return pecaRepo;
    return { findOne: jest.fn() };
  });

  // Sequence da OS.
  mockQuery.mockResolvedValue([{ n: 42 }]);

  // transaction(cb) executa o callback com o manager fake.
  mockTransaction.mockImplementation(async (cb: any) => cb(manager));

  // Defaults felizes.
  clienteRepo.findOne.mockResolvedValue({ id: 1, nome: "Cliente X" });
  pecaRepo.findOne.mockResolvedValue({
    id: 10,
    nome: "Peça 10",
    preco: 50,
    estoque: 5,
    ativo: true,
  });

  // getPedidoWithItens é a leitura final — devolve o pedido "carregado".
  jest
    .spyOn(pedidoQuery, "getPedidoWithItens")
    .mockResolvedValue({ id: 99, os: "OS-42" } as Pedido);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("criarPedido", () => {
  it("cria pedido com status ABERTO e vendedor_id vindo do argumento", async () => {
    await criarPedido(baseData as any, 7);

    // O objeto criado para a entidade Pedido (passado a manager.create(Pedido, obj)).
    const pedidoCreate = manager.create.mock.calls.find(
      (c) => c[0] === Pedido
    );
    expect(pedidoCreate).toBeDefined();
    const pedidoObj = pedidoCreate![1];
    expect(pedidoObj.status).toBe(PedidoStatus.ABERTO);
    expect(pedidoObj.status).toBe("aberto");
    expect(pedidoObj.vendedor_id).toBe(7);
    expect(pedidoObj.cliente_id).toBe(1);
  });

  it("gera a OS a partir da sequence pedido_os_seq", async () => {
    await criarPedido(baseData as any, 7);

    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT nextval('pedido_os_seq') AS n"
    );
    const pedidoObj = manager.create.mock.calls.find((c) => c[0] === Pedido)![1];
    expect(pedidoObj.os).toBe("OS-42");
  });

  it("calcula total e subtotais corretamente (snapshot de preço)", async () => {
    pecaRepo.findOne.mockResolvedValueOnce({
      id: 10,
      preco: 50,
      estoque: 5,
      ativo: true,
    });

    await criarPedido({ cliente_id: 1, itens: [{ peca_id: 10, qtd: 3 }] } as any, 7);

    // total no pedido = 3 * 50 = 150.
    const pedidoObj = manager.create.mock.calls.find((c) => c[0] === Pedido)![1];
    expect(pedidoObj.total).toBe(150);

    // item: subtotal = 150, preco_unitario = 50.
    const itemObj = manager.create.mock.calls.find((c) => c[0] === ItemPedido)![1];
    expect(itemObj.preco_unitario).toBe(50);
    expect(itemObj.subtotal).toBe(150);
    expect(itemObj.qtd).toBe(3);
  });

  it("soma o total de múltiplos itens", async () => {
    pecaRepo.findOne
      .mockResolvedValueOnce({ id: 10, preco: 50, estoque: 5, ativo: true })
      .mockResolvedValueOnce({ id: 20, preco: 30, estoque: 5, ativo: true });

    await criarPedido(
      {
        cliente_id: 1,
        itens: [
          { peca_id: 10, qtd: 2 }, // 100
          { peca_id: 20, qtd: 1 }, // 30
        ],
      } as any,
      7
    );

    const pedidoObj = manager.create.mock.calls.find((c) => c[0] === Pedido)![1];
    expect(pedidoObj.total).toBe(130);
  });

  it("lança AppError 400 quando a peça não existe", async () => {
    pecaRepo.findOne.mockResolvedValueOnce(null);

    await expect(criarPedido(baseData as any, 7)).rejects.toMatchObject({
      statusCode: 400,
      message: "Peça 10 inexistente ou inativa",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("lança AppError 400 quando a peça está inativa", async () => {
    pecaRepo.findOne.mockResolvedValue({
      id: 10,
      preco: 50,
      estoque: 5,
      ativo: false,
    });

    const promise = criarPedido(baseData as any, 7);
    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      statusCode: 400,
      message: "Peça 10 inexistente ou inativa",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("lança AppError 404 quando o cliente não existe", async () => {
    clienteRepo.findOne.mockResolvedValue(null);

    await expect(criarPedido(baseData as any, 7)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("NÃO decrementa estoque: não salva Peça nem cria MovimentacaoEstoque", async () => {
    await criarPedido(baseData as any, 7);

    // Nenhuma entidade salva pode ser uma Peça (ou conjunto reduzindo estoque),
    // nem haver movimentação de estoque. Só persistimos Pedido + ItemPedido.
    const createdEntities = manager.create.mock.calls.map((c) => c[0]);
    expect(createdEntities).toEqual(
      expect.arrayContaining([Pedido, ItemPedido])
    );
    expect(createdEntities).not.toContain(Peca);

    // O repositório de Peça nunca tem `save` chamado (é só findOne neste fluxo).
    expect((pecaRepo as any).save).toBeUndefined();

    // Nada salvo carrega a marca de estoque/peça.
    for (const saved of savedEntities) {
      const arr = Array.isArray(saved) ? saved : [saved];
      for (const e of arr) {
        expect(e).not.toHaveProperty("estoque");
        expect(e).not.toHaveProperty("tipo"); // MovimentacaoEstoque tem `tipo`
      }
    }
  });

  it("retorna o pedido completo via getPedidoWithItens", async () => {
    const result = await criarPedido(baseData as any, 7);
    expect(pedidoQuery.getPedidoWithItens).toHaveBeenCalledWith(99);
    expect(result).toMatchObject({ id: 99, os: "OS-42" });
  });
});
