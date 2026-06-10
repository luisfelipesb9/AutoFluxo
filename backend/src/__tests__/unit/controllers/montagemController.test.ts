import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import montagemRouter from "../../../routes/montagem";
import errorHandler from "../../../middleware/errorHandler";
import * as montagemService from "../../../services/montagemService";

jest.mock("../../../services/montagemService");

// App local: injeta req.user (montador por padrão) antes do router e monta o
// errorHandler. O router é montado em /pedidos (mesma base da Wave 3).
const buildApp = (
  user: { id: number; login: string; perfil: string } = {
    id: 3,
    login: "mont",
    perfil: "montador",
  }
) => {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.user = user;
    next();
  });
  app.use("/pedidos", montagemRouter);
  app.use(errorHandler);
  return app;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /pedidos/:id/iniciar-montagem", () => {
  it("retorna 200 com o pedido atualizado (montador)", async () => {
    const pedidoFake = {
      id: 99,
      status: "em_montagem",
      montador_id: 3,
      montagem_iniciada_em: new Date().toISOString(),
    };
    (montagemService.iniciarMontagem as jest.Mock).mockResolvedValue(pedidoFake);

    const res = await request(buildApp()).post("/pedidos/99/iniciar-montagem");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 99, status: "em_montagem", montador_id: 3 });
    // O service recebe o id da URL + o id do montador autenticado.
    expect(montagemService.iniciarMontagem).toHaveBeenCalledWith(99, 3);
  });

  it("bloqueia perfil não autorizado (vendedor) com 403", async () => {
    const app = buildApp({ id: 7, login: "vend", perfil: "vendedor" });

    const res = await request(app).post("/pedidos/99/iniciar-montagem");

    expect(res.status).toBe(403);
    expect(montagemService.iniciarMontagem).not.toHaveBeenCalled();
  });

  it("propaga 409 do service (transição inválida) via next(err)", async () => {
    (montagemService.iniciarMontagem as jest.Mock).mockRejectedValue(
      Object.assign(new Error("Transição inválida"), { statusCode: 409 })
    );

    const res = await request(buildApp()).post("/pedidos/99/iniciar-montagem");

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Transição inválida");
  });
});

describe("POST /pedidos/:id/concluir", () => {
  it("retorna 200 com o pedido concluído", async () => {
    (montagemService.concluirPedido as jest.Mock).mockResolvedValue({
      id: 99,
      status: "concluido",
    });

    const res = await request(buildApp()).post("/pedidos/99/concluir");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 99, status: "concluido" });
    expect(montagemService.concluirPedido).toHaveBeenCalledWith(99, 3);
  });

  it("propaga 409 do service quando o status atual é inválido", async () => {
    // A máquina de estados lança Error com statusCode:409 (mapeado pelo errorHandler).
    (montagemService.concluirPedido as jest.Mock).mockRejectedValue(
      Object.assign(new Error("Transição inválida"), { statusCode: 409 })
    );

    const res = await request(buildApp()).post("/pedidos/99/concluir");

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Transição inválida");
  });
});
