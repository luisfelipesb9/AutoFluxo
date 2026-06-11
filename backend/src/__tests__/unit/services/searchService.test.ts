import { buscarPorLinguagemNatural } from "../../../services/searchService";
import { getReadOnlyDataSource } from "../../../lib/readonlyDatabase";
import { AppError } from "../../../lib/AppError";

jest.mock("../../../lib/readonlyDatabase", () => ({
  getReadOnlyDataSource: jest.fn(),
}));
jest.mock("../../../services/logService", () => ({
  registrarLog: jest.fn().mockResolvedValue(undefined),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const openAiOk = (sql: string) => ({
  ok: true,
  json: async () => ({ choices: [{ message: { content: sql } }] }),
});

describe("searchService.buscarPorLinguagemNatural", () => {
  let mockTransaction: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = "sk-test";
    // Simula a transação da DataSource read-only resolvendo a query do SQL.
    mockTransaction = jest.fn().mockImplementation(
      async (cb: (m: { query: jest.Mock }) => unknown) =>
        cb({ query: jest.fn().mockResolvedValue([{ n: 1 }]) })
    );
    (getReadOnlyDataSource as jest.Mock).mockResolvedValue({
      transaction: mockTransaction,
    });
  });

  it("lança 503 quando OPENAI_API_KEY está ausente", async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(buscarPorLinguagemNatural("x")).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("lança 503 (fail-closed) quando a infra read-only está indisponível", async () => {
    (getReadOnlyDataSource as jest.Mock).mockRejectedValue(
      new AppError(503, "Busca por IA indisponível no momento.")
    );
    mockFetch.mockResolvedValue(openAiOk("SELECT 1"));

    await expect(buscarPorLinguagemNatural("x")).rejects.toMatchObject({
      statusCode: 503,
    });
    // Falha antes de gastar a chamada à OpenAI.
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("executa o SELECT gerado, injeta LIMIT 100 e retorna {sql, rows}", async () => {
    mockFetch.mockResolvedValue(openAiOk("SELECT * FROM pecas"));

    const res = await buscarPorLinguagemNatural("liste as peças");

    expect(res.sql).toBe("SELECT * FROM pecas LIMIT 100");
    expect(res.rows).toEqual([{ n: 1 }]);
  });

  it("remove cercas markdown antes de validar/executar", async () => {
    mockFetch.mockResolvedValue(openAiOk("```sql\nSELECT 1\n```"));

    const res = await buscarPorLinguagemNatural("um");

    expect(res.sql).toBe("SELECT 1 LIMIT 100");
  });

  it("lança 400 quando o SQL gerado é um comando proibido (DELETE)", async () => {
    mockFetch.mockResolvedValue(openAiOk("DELETE FROM pedidos"));

    await expect(buscarPorLinguagemNatural("apaga tudo")).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("lança 503 quando a OpenAI responde com erro HTTP", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    await expect(buscarPorLinguagemNatural("x")).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it("lança 503 quando a chamada à OpenAI falha (timeout/rede)", async () => {
    mockFetch.mockRejectedValue(new Error("The operation was aborted"));

    await expect(buscarPorLinguagemNatural("x")).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it("lança 400 quando a execução do SQL falha no banco", async () => {
    mockFetch.mockResolvedValue(openAiOk("SELECT * FROM inexistente"));
    mockTransaction.mockRejectedValue(new Error("relation does not exist"));

    await expect(buscarPorLinguagemNatural("x")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("traduz estouro de statement_timeout em 400 com mensagem de tempo limite", async () => {
    mockFetch.mockResolvedValue(openAiOk("SELECT * FROM pedidos"));
    mockTransaction.mockRejectedValue(
      new Error("canceling statement due to statement timeout")
    );

    await expect(buscarPorLinguagemNatural("x")).rejects.toMatchObject({
      statusCode: 400,
      message: "A consulta gerada excedeu o tempo limite.",
    });
  });
});
