import { registrarLog } from "../../../services/logService";
import { AppDataSource } from "../../../lib/database";
import logger from "../../../lib/logger";
import { requestContext } from "../../../lib/requestContext";

// jest.mock é hoistado: a factory só pode referenciar variáveis com prefixo `mock`.
jest.mock("../../../lib/database", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock("../../../lib/logger", () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

describe("logService.registrarLog", () => {
  const saveMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    saveMock.mockReset().mockResolvedValue(undefined);
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({ save: saveMock });
  });

  it("deve salvar o log com os campos corretos", async () => {
    await registrarLog({
      usuario_id: 7,
      acao: "pedido.pagar",
      entidade: "pedido",
      entidade_id: 42,
      detalhe: "pago via pix",
    });

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario_id: 7,
        acao: "pedido.pagar",
        entidade: "pedido",
        entidade_id: 42,
        detalhe: "pago via pix",
      })
    );
  });

  it("deve converter null para undefined nos campos opcionais", async () => {
    await registrarLog({
      usuario_id: null,
      acao: "pedido.criar",
      entidade: "pedido",
      entidade_id: null,
      detalhe: null,
    });

    expect(saveMock).toHaveBeenCalledTimes(1);
    const saved = saveMock.mock.calls[0][0];
    expect(saved.usuario_id).toBeUndefined();
    expect(saved.entidade_id).toBeUndefined();
    expect(saved.detalhe).toBeUndefined();
    expect(saved.acao).toBe("pedido.criar");
  });

  it("não deve lançar quando save rejeitar e deve logar o erro", async () => {
    saveMock.mockRejectedValueOnce(new Error("db down"));

    await expect(
      registrarLog({ acao: "x.y", entidade: "x" })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: "db down", acao: "x.y", entidade: "x" }),
      expect.any(String)
    );
  });
});

describe("logService.registrarLog com requestContext", () => {
  const saveMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    saveMock.mockReset().mockResolvedValue(undefined);
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({ save: saveMock });
  });

  it("anexa ip e usuario_id do contexto quando não informados", async () => {
    await requestContext.run({ usuarioId: 9, ip: "203.0.113.7" }, async () => {
      await registrarLog({ acao: "x.y", entidade: "x" });
    });

    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ usuario_id: 9, ip: "203.0.113.7", acao: "x.y" })
    );
  });

  it("parâmetros explícitos têm precedência sobre o contexto", async () => {
    await requestContext.run({ usuarioId: 9, ip: "203.0.113.7" }, async () => {
      await registrarLog({
        acao: "x.y",
        entidade: "x",
        usuario_id: 1,
        ip: "10.0.0.1",
      });
    });

    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ usuario_id: 1, ip: "10.0.0.1" })
    );
  });
});
