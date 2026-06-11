import * as svc from "../../../services/relatorioService";
import { AppDataSource } from "../../../lib/database";

jest.mock("../../../lib/database", () => ({
  AppDataSource: { query: jest.fn() },
}));

const queryMock = AppDataSource.query as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  queryMock.mockResolvedValue([]);
});

describe("relatorioService", () => {
  it("vendas: mapeia agrupamento mes→month e consulta pagamentos", async () => {
    await svc.relatorioVendas({
      inicio: new Date("2026-01-01"),
      fim: new Date("2026-02-01"),
      agrupamento: "mes",
    } as never);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("date_trunc('month'");
    expect(sql).toContain("FROM pagamentos");
    expect(params).toHaveLength(2);
  });

  it("vendas: mapeia dia→day e semana→week", async () => {
    await svc.relatorioVendas({
      inicio: new Date(),
      fim: new Date(),
      agrupamento: "dia",
    } as never);
    expect(queryMock.mock.calls[0][0]).toContain("date_trunc('day'");

    await svc.relatorioVendas({
      inicio: new Date(),
      fim: new Date(),
      agrupamento: "semana",
    } as never);
    expect(queryMock.mock.calls[1][0]).toContain("date_trunc('week'");
  });

  it("pecasMaisVendidas: ordena por receita e repassa o limit", async () => {
    await svc.relatorioPecasMaisVendidas({
      inicio: new Date(),
      fim: new Date(),
      limit: 5,
      orderBy: "receita",
    } as never);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("ORDER BY receita DESC");
    expect(sql).toContain("status <> 'cancelado'");
    expect(params).toContain(5);
  });

  it("estoqueCritico: calcula qtd_faltante e filtra estoque < minimo", async () => {
    await svc.relatorioEstoqueCritico();

    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain("(minimo - estoque)");
    expect(sql).toContain("estoque < minimo");
  });

  it("historicoCliente: usa celular como telefone e repassa placa", async () => {
    await svc.relatorioHistoricoCliente({
      celular: "11999998888",
      placa: "ABC1234",
    } as never);

    expect(queryMock.mock.calls[0][1]).toEqual(["11999998888", "ABC1234"]);
  });

  it("historicoCliente: telefone null quando só a placa é informada", async () => {
    await svc.relatorioHistoricoCliente({ placa: "ABC1234" } as never);

    expect(queryMock.mock.calls[0][1]).toEqual([null, "ABC1234"]);
  });

  it("pedidosStatus: agrupa por status numa data", async () => {
    await svc.relatorioPedidosStatus({ data: new Date("2026-01-10") } as never);

    expect(queryMock.mock.calls[0][0]).toContain("GROUP BY status");
  });

  it("performance: filtra perfis operacionais a partir de logs_acao", async () => {
    await svc.relatorioPerformance({
      inicio: new Date(),
      fim: new Date(),
    } as never);

    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain("FROM logs_acao");
    expect(sql).toContain("perfil IN ('vendedor', 'estoque', 'montador')");
  });

  it("passa datas de período como string YYYY-MM-DD (evita shift de fuso)", async () => {
    await svc.relatorioVendas({
      inicio: new Date("2026-06-11T00:00:00Z"),
      fim: new Date("2026-06-11T00:00:00Z"),
      agrupamento: "dia",
    } as never);

    const params = queryMock.mock.calls[0][1];
    expect(params[0]).toBe("2026-06-11");
    expect(params[1]).toBe("2026-06-11");
  });

  it("pedidosStatus passa a data como string YYYY-MM-DD", async () => {
    await svc.relatorioPedidosStatus({
      data: new Date("2026-06-11T00:00:00Z"),
    } as never);

    expect(queryMock.mock.calls[0][1]).toEqual(["2026-06-11"]);
  });
});
