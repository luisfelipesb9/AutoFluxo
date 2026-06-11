import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import pecasRouter from "../../../routes/pecas";
import errorHandler from "../../../middleware/errorHandler";
import * as pecaService from "../../../services/pecaService";
import { AppError } from "../../../lib/AppError";

jest.mock("../../../services/pecaService");

/**
 * Monta um app local que injeta `req.user` (simulando o authMiddleware global
 * aplicado na Wave 3) e finaliza com o errorHandler central.
 */
const buildApp = (user: {
  id: number;
  login: string;
  perfil: string;
}) => {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.user = user;
    next();
  });
  app.use("/api/pecas", pecasRouter);
  app.use(errorHandler);
  return app;
};

const adminApp = buildApp({ id: 1, login: "admin", perfil: "admin" });
const naoAdminApp = buildApp({ id: 2, login: "caixa", perfil: "caixa" });

describe("Peca routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/pecas", () => {
    it("deve retornar 409 quando código está duplicado", async () => {
      (pecaService.criarPeca as jest.Mock).mockRejectedValue(
        new AppError(409, "Já existe uma peça com este código")
      );

      const res = await request(adminApp)
        .post("/api/pecas")
        .send({ codigo: "DUP-1", nome: "Filtro", preco: 10 });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty("error");
    });

    it("deve retornar 201 ao criar peça válida", async () => {
      (pecaService.criarPeca as jest.Mock).mockResolvedValue({
        id: 1,
        codigo: "NOVA-1",
        nome: "Vela",
        estoque: 0,
        minimo: 0,
        preco: 25,
        ativo: true,
      });

      const res = await request(adminApp)
        .post("/api/pecas")
        .send({ codigo: "NOVA-1", nome: "Vela", preco: 25 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 1, codigo: "NOVA-1" });
    });

    it("deve retornar 400 quando o corpo é inválido (Zod)", async () => {
      const res = await request(adminApp)
        .post("/api/pecas")
        .send({ codigo: "", nome: "x" });

      expect(res.status).toBe(400);
      expect(pecaService.criarPeca).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/pecas/estoque-critico", () => {
    it("deve retornar 200 com a lista de peças críticas", async () => {
      const criticas = [{ id: 1, codigo: "A", estoque: 0, minimo: 5 }];
      (pecaService.listarEstoqueCritico as jest.Mock).mockResolvedValue(
        criticas
      );

      const res = await request(adminApp).get("/api/pecas/estoque-critico");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(criticas);
      // Garante que a rota não caiu no handler de "/:id".
      expect(pecaService.buscarPecaPorId).not.toHaveBeenCalled();
      expect(pecaService.listarEstoqueCritico).toHaveBeenCalled();
    });
  });

  describe("GET /api/pecas (listar)", () => {
    it("deve retornar 200 e delegar sem q quando não há query", async () => {
      const todas = [{ id: 1, codigo: "A" }, { id: 2, codigo: "B" }];
      (pecaService.listarPecas as jest.Mock).mockResolvedValue(todas);

      const res = await request(adminApp).get("/api/pecas");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(todas);
      expect(pecaService.listarPecas).toHaveBeenCalledWith(undefined);
    });

    it("deve repassar o filtro q quando informado via ?q=", async () => {
      const matched = [{ id: 1, codigo: "FLT-1", nome: "Filtro" }];
      (pecaService.listarPecas as jest.Mock).mockResolvedValue(matched);

      const res = await request(adminApp).get("/api/pecas?q=filtro");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(matched);
      expect(pecaService.listarPecas).toHaveBeenCalledWith("filtro");
    });

    it("deve propagar erro do service para o errorHandler (500)", async () => {
      (pecaService.listarPecas as jest.Mock).mockRejectedValue(
        new Error("db down")
      );

      const res = await request(adminApp).get("/api/pecas");

      expect(res.status).toBe(500);
    });
  });

  describe("GET /api/pecas/:id (buscarPorId)", () => {
    it("deve retornar 200 com a peça encontrada", async () => {
      const peca = { id: 5, codigo: "X", nome: "Vela", preco: 10 };
      (pecaService.buscarPecaPorId as jest.Mock).mockResolvedValue(peca);

      const res = await request(adminApp).get("/api/pecas/5");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 5, codigo: "X" });
      expect(pecaService.buscarPecaPorId).toHaveBeenCalledWith(5);
    });

    it("deve retornar 404 quando a peça não existe (AppError do service)", async () => {
      (pecaService.buscarPecaPorId as jest.Mock).mockRejectedValue(
        new AppError(404, "Peça não encontrada")
      );

      const res = await request(adminApp).get("/api/pecas/999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Peça não encontrada");
    });
  });

  describe("PUT /api/pecas/:id (atualizar)", () => {
    it("deve retornar 200 com a peça atualizada e repassar req.user.id", async () => {
      const atualizada = { id: 3, codigo: "UPD", nome: "Atualizada", preco: 30 };
      (pecaService.atualizarPeca as jest.Mock).mockResolvedValue(atualizada);

      const res = await request(adminApp)
        .put("/api/pecas/3")
        .send({ nome: "Atualizada", preco: 30 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 3, nome: "Atualizada" });
      expect(pecaService.atualizarPeca).toHaveBeenCalledWith(
        3,
        { nome: "Atualizada", preco: 30 },
        1
      );
    });

    it("deve retornar 404 quando a peça não existe", async () => {
      (pecaService.atualizarPeca as jest.Mock).mockRejectedValue(
        new AppError(404, "Peça não encontrada")
      );

      const res = await request(adminApp)
        .put("/api/pecas/999")
        .send({ nome: "Nome Válido" });

      expect(res.status).toBe(404);
    });

    it("deve retornar 400 quando o corpo é inválido (Zod)", async () => {
      const res = await request(adminApp)
        .put("/api/pecas/3")
        .send({ preco: -5 });

      expect(res.status).toBe(400);
      expect(pecaService.atualizarPeca).not.toHaveBeenCalled();
    });
  });

  describe("RBAC", () => {
    it("deve retornar 403 para usuário não-admin", async () => {
      const res = await request(naoAdminApp)
        .post("/api/pecas")
        .send({ codigo: "NOVA-1", nome: "Vela", preco: 25 });

      expect(res.status).toBe(403);
      expect(pecaService.criarPeca).not.toHaveBeenCalled();
    });
  });
});
