import { iniciarMontagem, concluirPedido } from "../../../services/montagemService";
import { AppDataSource } from "../../../lib/database";
import { Pedido } from "../../../entities/Pedido";
import { PedidoStatus } from "../../../entities/enums";
import * as pedidoQuery from "../../../services/pedidoQuery";
import * as logService from "../../../services/logService";

// Mocka o database e o logService SEM referenciar mocks compartilhados na factory.
jest.mock("../../../lib/database", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));
jest.mock("../../../services/logService", () => ({
  registrarLog: jest.fn().mockResolvedValue(undefined),
}));

const mockGetRepository = AppDataSource.getRepository as jest.Mock;

// Repositório fake de Pedido. `save` devolve o próprio pedido (já mutado).
const pedidoRepo = {
  save: jest.fn(async (p: any) => p),
};

const MONTADOR_ID = 3;

const makePedido = (overrides: Partial<Pedido> = {}): Pedido =>
  ({
    id: 99,
    os: "OS-42",
    status: PedidoStatus.LIBERADO,
    ...overrides,
  } as Pedido);

beforeEach(() => {
  jest.clearAllMocks();
  mockGetRepository.mockReturnValue(pedidoRepo);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("iniciarMontagem", () => {
  it("transiciona liberado → em_montagem e grava montagem_iniciada_em + montador_id", async () => {
    const pedido = makePedido({ status: PedidoStatus.LIBERADO });
    jest.spyOn(pedidoQuery, "getPedidoOrThrow").mockResolvedValue(pedido);

    const result = await iniciarMontagem(99, MONTADOR_ID);

    expect(result.status).toBe(PedidoStatus.EM_MONTAGEM);
    expect(result.status).toBe("em_montagem");
    expect(result.montador_id).toBe(MONTADOR_ID);
    expect(result.montagem_iniciada_em).toBeInstanceOf(Date);

    // Carregou o pedido pelo id e persistiu via repo.save.
    expect(pedidoQuery.getPedidoOrThrow).toHaveBeenCalledWith(99);
    expect(pedidoRepo.save).toHaveBeenCalledWith(pedido);

    // Auditoria com a ação correta.
    expect(logService.registrarLog).toHaveBeenCalledWith({
      usuario_id: MONTADOR_ID,
      acao: "pedido.iniciar-montagem",
      entidade: "pedido",
      entidade_id: 99,
    });
  });

  it("lança 409 quando o status não é liberado", async () => {
    const pedido = makePedido({ status: PedidoStatus.PAGO });
    jest.spyOn(pedidoQuery, "getPedidoOrThrow").mockResolvedValue(pedido);

    await expect(iniciarMontagem(99, MONTADOR_ID)).rejects.toMatchObject({
      statusCode: 409,
    });

    // Não persiste nem audita em transição inválida.
    expect(pedidoRepo.save).not.toHaveBeenCalled();
    expect(logService.registrarLog).not.toHaveBeenCalled();
  });
});

describe("concluirPedido", () => {
  it("transiciona em_montagem → concluido e grava concluido_em", async () => {
    const pedido = makePedido({ status: PedidoStatus.EM_MONTAGEM });
    jest.spyOn(pedidoQuery, "getPedidoOrThrow").mockResolvedValue(pedido);

    const result = await concluirPedido(99, MONTADOR_ID);

    expect(result.status).toBe(PedidoStatus.CONCLUIDO);
    expect(result.status).toBe("concluido");
    expect(result.concluido_em).toBeInstanceOf(Date);

    expect(pedidoQuery.getPedidoOrThrow).toHaveBeenCalledWith(99);
    expect(pedidoRepo.save).toHaveBeenCalledWith(pedido);

    expect(logService.registrarLog).toHaveBeenCalledWith({
      usuario_id: MONTADOR_ID,
      acao: "pedido.concluir",
      entidade: "pedido",
      entidade_id: 99,
    });
  });

  it("lança 409 quando o status não é em_montagem", async () => {
    const pedido = makePedido({ status: PedidoStatus.LIBERADO });
    jest.spyOn(pedidoQuery, "getPedidoOrThrow").mockResolvedValue(pedido);

    await expect(concluirPedido(99, MONTADOR_ID)).rejects.toMatchObject({
      statusCode: 409,
    });

    expect(pedidoRepo.save).not.toHaveBeenCalled();
    expect(logService.registrarLog).not.toHaveBeenCalled();
  });
});
