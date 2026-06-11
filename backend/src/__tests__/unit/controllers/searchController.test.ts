import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import searchRouter from "../../../routes/search";
import errorHandler from "../../../middleware/errorHandler";
import { AppError } from "../../../lib/AppError";
import * as searchService from "../../../services/searchService";

jest.mock("../../../services/searchService");

let currentPerfil = "admin";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: 1, login: "admin", perfil: currentPerfil };
    next();
  });
  app.use("/search", searchRouter);
  app.use(errorHandler);
  return app;
};

const app = buildApp();

beforeEach(() => {
  jest.clearAllMocks();
  currentPerfil = "admin";
});

describe("POST /search/nl", () => {
  it("retorna 200 com sql e rows", async () => {
    (searchService.buscarPorLinguagemNatural as jest.Mock).mockResolvedValue({
      sql: "SELECT * FROM pecas LIMIT 100",
      rows: [{ id: 1 }],
    });

    const res = await request(app)
      .post("/search/nl")
      .send({ query: "liste as peças" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      sql: expect.any(String),
      rows: expect.any(Array),
    });
  });

  it("retorna 503 quando o serviço de IA está indisponível", async () => {
    (searchService.buscarPorLinguagemNatural as jest.Mock).mockRejectedValue(
      new AppError(503, "Busca por IA indisponível no momento.")
    );

    const res = await request(app).post("/search/nl").send({ query: "x" });

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });

  it("retorna 400 quando a query é vazia (Zod)", async () => {
    const res = await request(app).post("/search/nl").send({ query: "" });

    expect(res.status).toBe(400);
    expect(searchService.buscarPorLinguagemNatural).not.toHaveBeenCalled();
  });

  it("retorna 403 quando o usuário não é admin", async () => {
    currentPerfil = "vendedor";

    const res = await request(app).post("/search/nl").send({ query: "x" });

    expect(res.status).toBe(403);
    expect(searchService.buscarPorLinguagemNatural).not.toHaveBeenCalled();
  });
});
