import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import caixaRouter from "../../../routes/caixa";
import errorHandler from "../../../middleware/errorHandler";
import * as caixaService from "../../../services/caixaService";

jest.mock("../../../services/caixaService");

// App local: injeta req.user (caixa por padrão) antes do router e monta o errorHandler.
const buildApp = (
  user: { id: number; login: string; perfil: string } = {
    id: 5,
    login: "cx",
    perfil: "caixa",
  }
) => {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.user = user;
    next();
  });
  app.use("/pedidos", caixaRouter);
  app.use(errorHandler);
  return app;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /pedidos/:id/pagar", () => {
  const validBody = { forma_pagamento: "pix", valor: 150.0 };

  it("retorna 200 com o pedido atualizado (pago) e o pagamento (numero_nf)", async () => {
    (caixaService.pagarPedido as jest.Mock).mockResolvedValue({
      pedido: { id: 1, status: "pago", forma_pagamento: "pix", itens: [] },
      pagamento: { id: 50, numero_nf: 5001, valor: 150, forma_pagamento: "pix" },
    });

    const res = await request(buildApp()).post("/pedidos/1/pagar").send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.pedido).toMatchObject({ id: 1, status: "pago" });
    expect(res.body.pagamento).toMatchObject({ numero_nf: 5001 });
    // Service recebe (id, body validado, caixaId).
    expect(caixaService.pagarPedido).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ forma_pagamento: "pix", valor: 150 }),
      5
    );
  });

  it("permite perfil admin", async () => {
    (caixaService.pagarPedido as jest.Mock).mockResolvedValue({
      pedido: { id: 1 },
      pagamento: { numero_nf: 1 },
    });

    const app = buildApp({ id: 3, login: "boss", perfil: "admin" });
    const res = await request(app).post("/pedidos/1/pagar").send(validBody);

    expect(res.status).toBe(200);
    expect(caixaService.pagarPedido).toHaveBeenCalledWith(1, expect.any(Object), 3);
  });

  it("propaga 409 quando o pedido já está pago (transição inválida)", async () => {
    (caixaService.pagarPedido as jest.Mock).mockRejectedValue(
      Object.assign(
        new Error("Transição inválida: não é possível 'pagar' a partir de 'pago'"),
        { statusCode: 409 }
      )
    );

    const res = await request(buildApp()).post("/pedidos/1/pagar").send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/inválida/i);
  });

  it("bloqueia perfil não-caixa (vendedor) com 403", async () => {
    const app = buildApp({ id: 8, login: "vend", perfil: "vendedor" });
    const res = await request(app).post("/pedidos/1/pagar").send(validBody);

    expect(res.status).toBe(403);
    expect(caixaService.pagarPedido).not.toHaveBeenCalled();
  });

  it("retorna 400 quando forma_pagamento é inválida", async () => {
    const res = await request(buildApp())
      .post("/pedidos/1/pagar")
      .send({ forma_pagamento: "boleto", valor: 10 });

    expect(res.status).toBe(400);
    expect(caixaService.pagarPedido).not.toHaveBeenCalled();
  });

  it("retorna 400 quando valor não é positivo", async () => {
    const res = await request(buildApp())
      .post("/pedidos/1/pagar")
      .send({ forma_pagamento: "pix", valor: 0 });

    expect(res.status).toBe(400);
    expect(caixaService.pagarPedido).not.toHaveBeenCalled();
  });
});

describe("POST /pedidos/:id/cancelar", () => {
  it("retorna 200 com o pedido cancelado (motivo persistido)", async () => {
    (caixaService.cancelarPedido as jest.Mock).mockResolvedValue({
      id: 2,
      status: "cancelado",
      motivo_cancelamento: "cliente desistiu",
      itens: [],
    });

    const res = await request(buildApp())
      .post("/pedidos/2/cancelar")
      .send({ motivo: "cliente desistiu" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 2,
      status: "cancelado",
      motivo_cancelamento: "cliente desistiu",
    });
    expect(caixaService.cancelarPedido).toHaveBeenCalledWith(
      2,
      "cliente desistiu",
      5
    );
  });

  it("propaga 409 ao cancelar um pedido concluido", async () => {
    (caixaService.cancelarPedido as jest.Mock).mockRejectedValue(
      Object.assign(new Error("Transição inválida"), { statusCode: 409 })
    );

    const res = await request(buildApp())
      .post("/pedidos/2/cancelar")
      .send({ motivo: "tarde demais" });

    expect(res.status).toBe(409);
  });

  it("bloqueia perfil não-caixa (montador) com 403", async () => {
    const app = buildApp({ id: 9, login: "mont", perfil: "montador" });
    const res = await request(app)
      .post("/pedidos/2/cancelar")
      .send({ motivo: "qualquer" });

    expect(res.status).toBe(403);
    expect(caixaService.cancelarPedido).not.toHaveBeenCalled();
  });

  it("retorna 400 quando motivo é muito curto (< 3 chars)", async () => {
    const res = await request(buildApp())
      .post("/pedidos/2/cancelar")
      .send({ motivo: "x" });

    expect(res.status).toBe(400);
    expect(caixaService.cancelarPedido).not.toHaveBeenCalled();
  });
});
