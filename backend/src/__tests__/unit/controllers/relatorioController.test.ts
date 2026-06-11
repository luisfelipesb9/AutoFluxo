import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import relatoriosRouter from "../../../routes/relatorios";
import errorHandler from "../../../middleware/errorHandler";
import * as relatorioService from "../../../services/relatorioService";

jest.mock("../../../services/relatorioService");
// Auditoria de acesso não deve tocar o banco no teste de controller.
jest.mock("../../../services/logService", () => ({
  registrarLog: jest.fn().mockResolvedValue(undefined),
}));

let currentPerfil = "admin";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: 1, login: "admin", perfil: currentPerfil };
    next();
  });
  app.use("/relatorios", relatoriosRouter);
  app.use(errorHandler);
  return app;
};

const app = buildApp();

beforeEach(() => {
  jest.clearAllMocks();
  currentPerfil = "admin";
});

describe("GET /relatorios/estoque-critico", () => {
  it("retorna 200 (JSON) com qtd_faltante", async () => {
    (relatorioService.relatorioEstoqueCritico as jest.Mock).mockResolvedValue([
      { id: 1, codigo: "P1", nome: "Filtro", estoque: 2, minimo: 5, qtd_faltante: 3 },
    ]);

    const res = await request(app).get("/relatorios/estoque-critico");

    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty("qtd_faltante", 3);
  });

  it("exporta CSV com Accept: text/csv e nome de arquivo correto", async () => {
    (relatorioService.relatorioEstoqueCritico as jest.Mock).mockResolvedValue([
      { id: 1, codigo: "P1", qtd_faltante: 3 },
    ]);

    const res = await request(app)
      .get("/relatorios/estoque-critico")
      .set("Accept", "text/csv");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain(
      "relatorio_estoque-critico_"
    );
    expect(res.text).toContain("qtd_faltante");
  });

  it("retorna 403 para usuário não-admin", async () => {
    currentPerfil = "caixa";

    const res = await request(app).get("/relatorios/estoque-critico");

    expect(res.status).toBe(403);
    expect(relatorioService.relatorioEstoqueCritico).not.toHaveBeenCalled();
  });
});

describe("GET /relatorios/vendas", () => {
  it("retorna 400 quando o período está ausente (Zod)", async () => {
    const res = await request(app).get("/relatorios/vendas");

    expect(res.status).toBe(400);
    expect(relatorioService.relatorioVendas).not.toHaveBeenCalled();
  });

  it("retorna 200 com período informado", async () => {
    (relatorioService.relatorioVendas as jest.Mock).mockResolvedValue([
      { periodo: "2026-01-01T00:00:00.000Z", qtd_pagamentos: 2, receita: 100 },
    ]);

    const res = await request(app).get(
      "/relatorios/vendas?inicio=2026-01-01&fim=2026-01-31&agrupamento=mes"
    );

    expect(res.status).toBe(200);
    expect(relatorioService.relatorioVendas).toHaveBeenCalled();
  });
});

describe("GET /relatorios/pecas-mais-vendidas", () => {
  it("retorna 400 quando o período está ausente (Zod)", async () => {
    const res = await request(app).get("/relatorios/pecas-mais-vendidas");

    expect(res.status).toBe(400);
    expect(relatorioService.relatorioPecasMaisVendidas).not.toHaveBeenCalled();
  });
});

describe("GET /relatorios/historico-cliente", () => {
  it("retorna 400 quando nem placa nem celular são informados", async () => {
    const res = await request(app).get("/relatorios/historico-cliente");

    expect(res.status).toBe(400);
    expect(relatorioService.relatorioHistoricoCliente).not.toHaveBeenCalled();
  });

  it("retorna 200 quando filtra por celular", async () => {
    (relatorioService.relatorioHistoricoCliente as jest.Mock).mockResolvedValue(
      []
    );

    const res = await request(app).get(
      "/relatorios/historico-cliente?celular=11999998888"
    );

    expect(res.status).toBe(200);
    expect(relatorioService.relatorioHistoricoCliente).toHaveBeenCalled();
  });
});
