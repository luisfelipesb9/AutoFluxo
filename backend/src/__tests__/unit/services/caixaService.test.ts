import { pagarPedido, cancelarPedido } from "../../../services/caixaService";
import { AppDataSource } from "../../../lib/database";
import { Pedido } from "../../../entities/Pedido";
import { Peca } from "../../../entities/Peca";
import { Pagamento } from "../../../entities/Pagamento";
import { MovimentacaoEstoque } from "../../../entities/MovimentacaoEstoque";
import { PedidoStatus, FormaPagamento } from "../../../entities/enums";
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

const mockTransaction = AppDataSource.transaction as jest.Mock;

// EntityManager fake usado dentro da transação.
// - query: sequence da NF (SELECT nextval('pagamento_nf_seq')).
// - create: devolve o objeto recebido (permite inspecionar o que seria persistido).
// - save:   devolve o objeto (atribuindo id quando ausente).
// - update/increment: apenas registradas para asserção.
const managerCreateCalls: any[] = [];
const managerSaveCalls: any[] = [];
const manager = {
  query: jest.fn().mockResolvedValue([{ n: 5001 }]),
  create: jest.fn((entity: unknown, obj: any) => {
    managerCreateCalls.push({ entity, obj });
    return obj;
  }),
  save: jest.fn(async (arg: any) => {
    managerSaveCalls.push(arg);
    if (!Array.isArray(arg) && arg && arg.id === undefined) {
      return { ...arg, id: 777 };
    }
    return arg;
  }),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  increment: jest.fn().mockResolvedValue({ affected: 1 }),
};

const createdOf = (entity: unknown) =>
  managerCreateCalls.filter((c) => c.entity === entity).map((c) => c.obj);

beforeEach(() => {
  jest.clearAllMocks();
  managerCreateCalls.length = 0;
  managerSaveCalls.length = 0;

  // transaction(cb) executa o callback com o manager fake.
  mockTransaction.mockImplementation(async (cb: any) => cb(manager));

  // Defaults do manager (re-aplicados após clearAllMocks).
  manager.query.mockResolvedValue([{ n: 5001 }]);
  manager.create.mockImplementation((entity: unknown, obj: any) => {
    managerCreateCalls.push({ entity, obj });
    return obj;
  });
  manager.save.mockImplementation(async (arg: any) => {
    managerSaveCalls.push(arg);
    if (!Array.isArray(arg) && arg && arg.id === undefined) {
      return { ...arg, id: 777 };
    }
    return arg;
  });
  manager.update.mockResolvedValue({ affected: 1 });
  manager.increment.mockResolvedValue({ affected: 1 });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("pagarPedido", () => {
  beforeEach(() => {
    // Pedido base no status "aberto".
    jest
      .spyOn(pedidoQuery, "getPedidoOrThrow")
      .mockResolvedValue({ id: 1, status: PedidoStatus.ABERTO } as Pedido);
    // Leitura final após o commit (pedido já "pago").
    jest.spyOn(pedidoQuery, "getPedidoWithItens").mockResolvedValue({
      id: 1,
      status: PedidoStatus.PAGO,
      itens: [],
    } as unknown as Pedido);
  });

  const data = { forma_pagamento: FormaPagamento.PIX, valor: 250.5 };

  it("promove o pedido de aberto → pago e gera a NF a partir da sequence", async () => {
    const result = await pagarPedido(1, data as any, 5);

    // NF via sequence pagamento_nf_seq dentro da transação.
    expect(manager.query).toHaveBeenCalledWith(
      "SELECT nextval('pagamento_nf_seq') AS n"
    );

    // Pagamento criado com a NF da sequence + dados do caixa.
    const [pagamentoObj] = createdOf(Pagamento);
    expect(pagamentoObj).toMatchObject({
      pedido_id: 1,
      numero_nf: 5001,
      forma_pagamento: FormaPagamento.PIX,
      valor: 250.5,
      caixa_id: 5,
    });

    // Pedido atualizado para "pago" com pago_em/forma/caixa.
    expect(manager.update).toHaveBeenCalledWith(
      Pedido,
      1,
      expect.objectContaining({
        status: PedidoStatus.PAGO,
        forma_pagamento: FormaPagamento.PIX,
        caixa_id: 5,
      })
    );
    const updateArg = manager.update.mock.calls.find((c) => c[0] === Pedido)![2];
    expect(updateArg.pago_em).toBeInstanceOf(Date);

    // Retorno traz o pedido (pago) e o pagamento com numero_nf.
    expect(result.pedido).toMatchObject({ id: 1, status: PedidoStatus.PAGO });
    expect(result.pagamento.numero_nf).toBe(5001);
  });

  it("usa o numero_nf vindo da sequence (não hardcoded)", async () => {
    manager.query.mockResolvedValueOnce([{ n: 90210 }]);

    const result = await pagarPedido(1, data as any, 5);

    expect(result.pagamento.numero_nf).toBe(90210);
    const [pagamentoObj] = createdOf(Pagamento);
    expect(pagamentoObj.numero_nf).toBe(90210);
  });

  it("lança 409 quando o pedido já está pago (transição inválida) e NÃO abre transação", async () => {
    (pedidoQuery.getPedidoOrThrow as jest.Mock).mockResolvedValue({
      id: 1,
      status: PedidoStatus.PAGO,
    } as Pedido);

    await expect(pagarPedido(1, data as any, 5)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("cancelarPedido", () => {
  it("persiste motivo + cancelado_em e marca status cancelado", async () => {
    jest.spyOn(pedidoQuery, "getPedidoWithItens").mockResolvedValue({
      id: 2,
      status: PedidoStatus.ABERTO,
      itens: [],
    } as unknown as Pedido);

    await cancelarPedido(2, "cliente desistiu", 5);

    expect(manager.update).toHaveBeenCalledWith(
      Pedido,
      2,
      expect.objectContaining({
        status: PedidoStatus.CANCELADO,
        motivo_cancelamento: "cliente desistiu",
      })
    );
    const updateArg = manager.update.mock.calls.find((c) => c[0] === Pedido)![2];
    expect(updateArg.cancelado_em).toBeInstanceOf(Date);
  });

  it("NÃO movimenta estoque quando nenhum item foi separado (qtd_confirmada 0/undefined)", async () => {
    jest.spyOn(pedidoQuery, "getPedidoWithItens").mockResolvedValue({
      id: 2,
      status: PedidoStatus.PAGO,
      itens: [
        { id: 10, peca_id: 100, qtd: 3, qtd_confirmada: 0 },
        { id: 11, peca_id: 200, qtd: 1 }, // qtd_confirmada undefined
      ],
    } as unknown as Pedido);

    await cancelarPedido(2, "engano no pedido", 5);

    expect(manager.increment).not.toHaveBeenCalled();
    expect(createdOf(MovimentacaoEstoque)).toHaveLength(0);
    // Mesmo assim o pedido é cancelado.
    expect(manager.update).toHaveBeenCalledWith(
      Pedido,
      2,
      expect.objectContaining({ status: PedidoStatus.CANCELADO })
    );
  });

  it("ESTORNO: re-incrementa estoque e cria MovimentacaoEstoque entrada por item separado", async () => {
    jest.spyOn(pedidoQuery, "getPedidoWithItens").mockResolvedValue({
      id: 2,
      status: PedidoStatus.EM_SEPARACAO,
      itens: [
        { id: 10, peca_id: 100, qtd: 4, qtd_confirmada: 4 },
        { id: 11, peca_id: 200, qtd: 2, qtd_confirmada: 1 },
        { id: 12, peca_id: 300, qtd: 5, qtd_confirmada: 0 }, // não separado → ignorado
      ],
    } as unknown as Pedido);

    await cancelarPedido(2, "estorno necessario", 9);

    // Estoque re-incrementado apenas para os itens com qtd_confirmada > 0.
    expect(manager.increment).toHaveBeenCalledTimes(2);
    expect(manager.increment).toHaveBeenCalledWith(
      Peca,
      { id: 100 },
      "estoque",
      4
    );
    expect(manager.increment).toHaveBeenCalledWith(
      Peca,
      { id: 200 },
      "estoque",
      1
    );

    // Uma MovimentacaoEstoque "entrada" por item separado.
    const movimentacoes = createdOf(MovimentacaoEstoque);
    expect(movimentacoes).toHaveLength(2);
    expect(movimentacoes[0]).toMatchObject({
      peca_id: 100,
      tipo: "entrada",
      qtd: 4,
      pedido_id: 2,
      item_id: 10,
      usuario_id: 9,
      observacao: "estorno por cancelamento",
    });
    expect(movimentacoes[1]).toMatchObject({
      peca_id: 200,
      tipo: "entrada",
      qtd: 1,
      item_id: 11,
    });

    // E o pedido é cancelado ao final.
    expect(manager.update).toHaveBeenCalledWith(
      Pedido,
      2,
      expect.objectContaining({
        status: PedidoStatus.CANCELADO,
        motivo_cancelamento: "estorno necessario",
      })
    );
  });

  it("lança 409 ao cancelar um pedido concluido e NÃO abre transação", async () => {
    jest.spyOn(pedidoQuery, "getPedidoWithItens").mockResolvedValue({
      id: 2,
      status: PedidoStatus.CONCLUIDO,
      itens: [],
    } as unknown as Pedido);

    await expect(
      cancelarPedido(2, "tarde demais", 5)
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
