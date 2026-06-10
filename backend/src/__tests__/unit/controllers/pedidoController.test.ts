import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import pedidosRouter from "../../../routes/pedidos";
import errorHandler from "../../../middleware/errorHandler";
import * as pedidoService from "../../../services/pedidoService";
import * as pedidoQuery from "../../../services/pedidoQuery";
import { AppError } from "../../../lib/AppError";

jest.mock("../../../services/pedidoService");
jest.mock("../../../services/pedidoQuery");

// App local: injeta req.user (vendedor) antes do router e monta o errorHandler.
const buildApp = (
  user: { id: number; login: string; perfil: string } = {
    id: 7,
    login: "vend",
    perfil: "vendedor",
  }
) => {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.user = user;
    next();
  });
  app.use("/pedidos", pedidosRouter);
  app.use(errorHandler);
  return app;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /pedidos", () => {
  const validBody = {
    cliente_id: 1,
    veiculo_id: 2,
    itens: [{ peca_id: 10, qtd: 2 }],
  };

  it("retorna 201 com o pedido (incluindo itens) para perfil vendedor", async () => {
    const pedidoFake = {
      id: 99,
      os: "OS-42",
      status: "aberto",
      vendedor_id: 7,
      total: 100,
      itens: [{ id: 1, peca_id: 10, qtd: 2, subtotal: 100 }],
      cliente: { id: 1, nome: "Cliente X" },
    };
    (pedidoService.criarPedido as jest.Mock).mockResolvedValue(pedidoFake);

    const res = await request(buildApp()).post("/pedidos").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 99, status: "aberto", vendedor_id: 7 });
    expect(res.body.itens).toHaveLength(1);
    // O service recebe o body validado + o id do usuário autenticado.
    expect(pedidoService.criarPedido).toHaveBeenCalledWith(
      expect.objectContaining({ cliente_id: 1, veiculo_id: 2 }),
      7
    );
  });

  it("permite perfil admin", async () => {
    (pedidoService.criarPedido as jest.Mock).mockResolvedValue({ id: 1 });

    const app = buildApp({ id: 3, login: "boss", perfil: "admin" });
    const res = await request(app).post("/pedidos").send(validBody);

    expect(res.status).toBe(201);
    expect(pedidoService.criarPedido).toHaveBeenCalledWith(
      expect.any(Object),
      3
    );
  });

  it("bloqueia perfil não autorizado (caixa) com 403", async () => {
    const app = buildApp({ id: 5, login: "cx", perfil: "caixa" });
    const res = await request(app).post("/pedidos").send(validBody);

    expect(res.status).toBe(403);
    expect(pedidoService.criarPedido).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o body é inválido (itens vazio)", async () => {
    const res = await request(buildApp())
      .post("/pedidos")
      .send({ cliente_id: 1, itens: [] });

    expect(res.status).toBe(400);
    expect(pedidoService.criarPedido).not.toHaveBeenCalled();
  });

  it("propaga AppError do service (peça inativa → 400)", async () => {
    (pedidoService.criarPedido as jest.Mock).mockRejectedValue(
      new AppError(400, "Peça 10 inexistente ou inativa")
    );

    const res = await request(buildApp()).post("/pedidos").send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Peça 10 inexistente ou inativa");
  });
});

describe("GET /pedidos", () => {
  it("repassa os filtros (status, vendedor_id, data) para listPedidos", async () => {
    (pedidoQuery.listPedidos as jest.Mock).mockResolvedValue([{ id: 1 }]);

    const res = await request(buildApp()).get(
      "/pedidos?status=aberto&vendedor_id=7&data=2026-06-10"
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1 }]);
    expect(pedidoQuery.listPedidos).toHaveBeenCalledWith({
      status: "aberto",
      vendedor_id: 7,
      data: "2026-06-10",
    });
  });

  it("lista sem filtros quando a query é vazia", async () => {
    (pedidoQuery.listPedidos as jest.Mock).mockResolvedValue([]);

    const res = await request(buildApp()).get("/pedidos");

    expect(res.status).toBe(200);
    expect(pedidoQuery.listPedidos).toHaveBeenCalledWith({});
  });

  it("retorna 400 quando data está em formato inválido", async () => {
    const res = await request(buildApp()).get("/pedidos?data=10-06-2026");

    expect(res.status).toBe(400);
    expect(pedidoQuery.listPedidos).not.toHaveBeenCalled();
  });
});

describe("GET /pedidos/:id", () => {
  it("retorna 200 com o detalhe do pedido", async () => {
    (pedidoQuery.getPedidoWithItens as jest.Mock).mockResolvedValue({
      id: 99,
      itens: [],
    });

    const res = await request(buildApp()).get("/pedidos/99");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 99 });
    expect(pedidoQuery.getPedidoWithItens).toHaveBeenCalledWith(99);
  });

  it("retorna 404 quando o pedido não existe", async () => {
    (pedidoQuery.getPedidoWithItens as jest.Mock).mockRejectedValue(
      new AppError(404, "Pedido 99 não encontrado")
    );

    const res = await request(buildApp()).get("/pedidos/99");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Pedido 99 não encontrado");
  });
});
