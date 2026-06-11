import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import estoqueRouter from "../../../routes/estoque";
import errorHandler from "../../../middleware/errorHandler";
import * as estoqueService from "../../../services/estoqueService";
import { AppError } from "../../../lib/AppError";

jest.mock("../../../services/estoqueService");

// App local: injeta req.user (estoque por padrão) antes do router, monta sob
// /pedidos (paths relativos do router) e adiciona o errorHandler.
const buildApp = (
  user: { id: number; login: string; perfil: string } = {
    id: 9,
    login: "est",
    perfil: "estoque",
  }
) => {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.user = user;
    next();
  });
  app.use("/pedidos", estoqueRouter);
  app.use(errorHandler);
  return app;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PUT /pedidos/:id/itens/:item_id/separar", () => {
  it("retorna 200 com { estoque_restante, alerta } no happy path", async () => {
    (estoqueService.separarItem as jest.Mock).mockResolvedValue({
      estoque_restante: 2,
      alerta: false,
    });

    const res = await request(buildApp())
      .put("/pedidos/1/itens/50/separar")
      .send({ qtd_confirmada: 3 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estoque_restante: 2, alerta: false });
    // Service recebe (id, itemId, qtd_confirmada, usuarioId).
    expect(estoqueService.separarItem).toHaveBeenCalledWith(1, 50, 3, 9);
  });

  it("CRÍTICO: propaga 400 quando a baixa deixaria o estoque negativo", async () => {
    (estoqueService.separarItem as jest.Mock).mockRejectedValue(
      new AppError(400, "Estoque insuficiente")
    );

    const res = await request(buildApp())
      .put("/pedidos/1/itens/50/separar")
      .send({ qtd_confirmada: 999 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Estoque insuficiente");
  });

  it("retorna 400 quando qtd_confirmada é inválida (zero) — nunca chama o service", async () => {
    const res = await request(buildApp())
      .put("/pedidos/1/itens/50/separar")
      .send({ qtd_confirmada: 0 });

    expect(res.status).toBe(400);
    expect(estoqueService.separarItem).not.toHaveBeenCalled();
  });

  it("bloqueia perfil não-estoque (vendedor) com 403", async () => {
    const app = buildApp({ id: 7, login: "vend", perfil: "vendedor" });

    const res = await request(app)
      .put("/pedidos/1/itens/50/separar")
      .send({ qtd_confirmada: 3 });

    expect(res.status).toBe(403);
    expect(estoqueService.separarItem).not.toHaveBeenCalled();
  });
});

describe("POST /pedidos/:id/iniciar-separacao", () => {
  it("retorna 200 com o pedido para perfil estoque", async () => {
    (estoqueService.iniciarSeparacao as jest.Mock).mockResolvedValue({
      id: 1,
      status: "em_separacao",
    });

    const res = await request(buildApp()).post("/pedidos/1/iniciar-separacao");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, status: "em_separacao" });
    expect(estoqueService.iniciarSeparacao).toHaveBeenCalledWith(1, 9);
  });

  it("permite perfil admin", async () => {
    (estoqueService.iniciarSeparacao as jest.Mock).mockResolvedValue({ id: 1 });

    const app = buildApp({ id: 3, login: "boss", perfil: "admin" });
    const res = await request(app).post("/pedidos/1/iniciar-separacao");

    expect(res.status).toBe(200);
    expect(estoqueService.iniciarSeparacao).toHaveBeenCalledWith(1, 3);
  });

  it("propaga 409 do service (transição inválida)", async () => {
    (estoqueService.iniciarSeparacao as jest.Mock).mockRejectedValue(
      Object.assign(new Error("Transição inválida"), { statusCode: 409 })
    );

    const res = await request(buildApp()).post("/pedidos/1/iniciar-separacao");

    expect(res.status).toBe(409);
  });
});

describe("POST /pedidos/:id/enviar-montagem", () => {
  it("retorna 400 quando há item não separado", async () => {
    (estoqueService.enviarMontagem as jest.Mock).mockRejectedValue(
      new AppError(400, "Há itens não separados")
    );

    const res = await request(buildApp()).post("/pedidos/1/enviar-montagem");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Há itens não separados");
  });

  it("retorna 200 com o pedido liberado no sucesso", async () => {
    (estoqueService.enviarMontagem as jest.Mock).mockResolvedValue({
      id: 1,
      status: "liberado",
    });

    const res = await request(buildApp()).post("/pedidos/1/enviar-montagem");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "liberado" });
    expect(estoqueService.enviarMontagem).toHaveBeenCalledWith(1, 9);
  });
});

describe("POST /pedidos/:id/devolver-caixa", () => {
  it("retorna 200 e repassa o motivo ao service", async () => {
    (estoqueService.devolverCaixa as jest.Mock).mockResolvedValue({
      id: 1,
      status: "devolvido_caixa",
    });

    const res = await request(buildApp())
      .post("/pedidos/1/devolver-caixa")
      .send({ motivo: "peça avariada" });

    expect(res.status).toBe(200);
    expect(estoqueService.devolverCaixa).toHaveBeenCalledWith(
      1,
      "peça avariada",
      9
    );
  });

  it("retorna 400 quando o motivo é muito curto (< 3 chars)", async () => {
    const res = await request(buildApp())
      .post("/pedidos/1/devolver-caixa")
      .send({ motivo: "ab" });

    expect(res.status).toBe(400);
    expect(estoqueService.devolverCaixa).not.toHaveBeenCalled();
  });
});
