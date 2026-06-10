import {
  iniciarSeparacao,
  separarItem,
  enviarMontagem,
} from "../../../services/estoqueService";
import { AppDataSource } from "../../../lib/database";
import { Pedido } from "../../../entities/Pedido";
import { ItemPedido } from "../../../entities/ItemPedido";
import { PedidoStatus, TipoMovimentacao } from "../../../entities/enums";
import * as pedidoQuery from "../../../services/pedidoQuery";

// Mocka database e logService SEM referenciar mocks compartilhados na factory.
jest.mock("../../../lib/database", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    transaction: jest.fn(),
  },
}));
jest.mock("../../../services/logService", () => ({
  registrarLog: jest.fn().mockResolvedValue(undefined),
}));

const mockGetRepository = AppDataSource.getRepository as jest.Mock;
const mockTransaction = AppDataSource.transaction as jest.Mock;

// Repositórios fake (fora da transação).
const pedidoRepo = { save: jest.fn(async (p: any) => p) };
const itemRepo = { findOne: jest.fn() };

// --- Estado do "banco" simulado dentro da transação ---
let pecaMock: any;
let fakeEm: any;
// Captura o que foi persistido via em.save (para asserir que nunca grava
// estoque negativo).
let emSaved: any[];

beforeEach(() => {
  jest.clearAllMocks();
  emSaved = [];

  // pedido base em em_separacao (estado válido para separar).
  jest
    .spyOn(pedidoQuery, "getPedidoOrThrow")
    .mockResolvedValue({ id: 1, status: PedidoStatus.EM_SEPARACAO } as Pedido);
  jest
    .spyOn(pedidoQuery, "getPedidoWithItens")
    .mockResolvedValue({ id: 1, status: PedidoStatus.EM_SEPARACAO } as Pedido);

  mockGetRepository.mockImplementation((entity: unknown) => {
    if (entity === Pedido) return pedidoRepo;
    if (entity === ItemPedido) return itemRepo;
    return { findOne: jest.fn(), save: jest.fn() };
  });

  // Item pertence ao pedido por padrão.
  itemRepo.findOne.mockResolvedValue({ id: 50, pedido_id: 1, peca_id: 10 });

  // Peça com estoque suficiente por padrão.
  pecaMock = { id: 10, estoque: 5, minimo: 2 };

  // fakeEm: getRepository(Peca).createQueryBuilder()... devolve pecaMock.
  fakeEm = {
    getRepository: () => ({
      createQueryBuilder: () => ({
        setLock: () => ({
          where: () => ({ getOne: async () => pecaMock }),
        }),
      }),
    }),
    create: (_E: unknown, o: any) => o,
    save: jest.fn(async (x: any) => {
      emSaved.push(x);
      return x;
    }),
  };

  mockTransaction.mockImplementation(async (cb: any) => cb(fakeEm));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("separarItem", () => {
  it("baixa estoque, cria MovimentacaoEstoque SAIDA e grava qtd_confirmada (happy path)", async () => {
    const result = await separarItem(1, 50, 3, 9);

    // 5 - 3 = 2 restante; minimo 2 → não dispara alerta (2 < 2 é falso).
    expect(result).toEqual({ estoque_restante: 2, alerta: false });
    expect(pecaMock.estoque).toBe(2);

    // Peça salva com novo estoque (não negativo).
    expect(emSaved).toContainEqual(
      expect.objectContaining({ id: 10, estoque: 2 })
    );

    // Movimentação de SAIDA registrada com os dados corretos.
    const mov = emSaved.find((e) => e && e.tipo !== undefined);
    expect(mov).toMatchObject({
      peca_id: 10,
      tipo: TipoMovimentacao.SAIDA,
      qtd: 3,
      pedido_id: 1,
      item_id: 50,
      usuario_id: 9,
    });

    // item.qtd_confirmada atualizado.
    const itemSaved = emSaved.find((e) => e && e.qtd_confirmada !== undefined);
    expect(itemSaved).toMatchObject({ id: 50, qtd_confirmada: 3 });
  });

  it("CRÍTICO: lança 400 quando a baixa deixaria o estoque negativo e NÃO persiste valor negativo", async () => {
    pecaMock = { id: 10, estoque: 1, minimo: 2 };

    await expect(separarItem(1, 50, 5, 9)).rejects.toMatchObject({
      statusCode: 400,
      message: "Estoque insuficiente",
    });

    // Estoque permanece intacto (não foi para -4).
    expect(pecaMock.estoque).toBe(1);

    // Nada negativo foi gravado; nenhuma movimentação criada.
    for (const e of emSaved) {
      if (e && typeof e.estoque === "number") {
        expect(e.estoque).toBeGreaterThanOrEqual(0);
      }
    }
    const movimentou = emSaved.some((e) => e && e.tipo !== undefined);
    expect(movimentou).toBe(false);
  });

  it("lança 400 (não negativo) também quando estoque é exatamente excedido por 1", async () => {
    pecaMock = { id: 10, estoque: 2, minimo: 0 };

    await expect(separarItem(1, 50, 3, 9)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(pecaMock.estoque).toBe(2);
  });

  it("alerta=true quando o estoque final fica abaixo do minimo", async () => {
    pecaMock = { id: 10, estoque: 10, minimo: 8 };

    const result = await separarItem(1, 50, 5, 9);

    // 10 - 5 = 5 < 8 → alerta.
    expect(result).toEqual({ estoque_restante: 5, alerta: true });
  });

  it("permite baixar até zerar o estoque (saldo 0 é válido, não negativo)", async () => {
    pecaMock = { id: 10, estoque: 4, minimo: 0 };

    const result = await separarItem(1, 50, 4, 9);

    expect(result.estoque_restante).toBe(0);
    expect(pecaMock.estoque).toBe(0);
  });

  it("lança 404 quando o item não pertence ao pedido", async () => {
    itemRepo.findOne.mockResolvedValue(null);

    await expect(separarItem(1, 999, 1, 9)).rejects.toMatchObject({
      statusCode: 404,
    });
    // Nunca entra na transação se o item não existe.
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("lança 409 quando o pedido não está em em_separacao", async () => {
    (pedidoQuery.getPedidoOrThrow as jest.Mock).mockResolvedValue({
      id: 1,
      status: PedidoStatus.PAGO,
    } as Pedido);

    await expect(separarItem(1, 50, 1, 9)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("lança 404 quando a peça não existe (sob o lock)", async () => {
    pecaMock = null;

    await expect(separarItem(1, 50, 1, 9)).rejects.toMatchObject({
      statusCode: 404,
      message: "Peça não encontrada",
    });
  });
});

describe("iniciarSeparacao", () => {
  it("pago → em_separacao: atualiza status e salva o pedido", async () => {
    const pedido = { id: 1, status: PedidoStatus.PAGO } as Pedido;
    (pedidoQuery.getPedidoOrThrow as jest.Mock).mockResolvedValue(pedido);

    await iniciarSeparacao(1, 9);

    expect(pedido.status).toBe(PedidoStatus.EM_SEPARACAO);
    expect(pedidoRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: PedidoStatus.EM_SEPARACAO })
    );
  });

  it("devolvido_caixa → em_separacao também é permitido", async () => {
    const pedido = { id: 1, status: PedidoStatus.DEVOLVIDO_CAIXA } as Pedido;
    (pedidoQuery.getPedidoOrThrow as jest.Mock).mockResolvedValue(pedido);

    await iniciarSeparacao(1, 9);

    expect(pedido.status).toBe(PedidoStatus.EM_SEPARACAO);
  });

  it("lança 409 quando o pedido NÃO está pago/devolvido_caixa (ex.: aberto)", async () => {
    (pedidoQuery.getPedidoOrThrow as jest.Mock).mockResolvedValue({
      id: 1,
      status: PedidoStatus.ABERTO,
    } as Pedido);

    await expect(iniciarSeparacao(1, 9)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(pedidoRepo.save).not.toHaveBeenCalled();
  });
});

describe("enviarMontagem", () => {
  it("lança 400 quando ALGUM item não foi separado (qtd_confirmada null/undefined)", async () => {
    (pedidoQuery.getPedidoWithItens as jest.Mock).mockResolvedValue({
      id: 1,
      status: PedidoStatus.EM_SEPARACAO,
      itens: [
        { id: 1, qtd_confirmada: 3 },
        { id: 2, qtd_confirmada: null },
      ],
    } as unknown as Pedido);

    await expect(enviarMontagem(1, 9)).rejects.toMatchObject({
      statusCode: 400,
      message: "Há itens não separados",
    });
    expect(pedidoRepo.save).not.toHaveBeenCalled();
  });

  it("com todos os itens separados → em_separacao vira liberado", async () => {
    const pedido = {
      id: 1,
      status: PedidoStatus.EM_SEPARACAO,
      itens: [
        { id: 1, qtd_confirmada: 3 },
        { id: 2, qtd_confirmada: 1 },
      ],
    } as unknown as Pedido;
    (pedidoQuery.getPedidoWithItens as jest.Mock).mockResolvedValue(pedido);

    await enviarMontagem(1, 9);

    expect(pedido.status).toBe(PedidoStatus.LIBERADO);
    expect(pedidoRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: PedidoStatus.LIBERADO })
    );
  });
});
