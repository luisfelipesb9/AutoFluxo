import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import clientesRouter from "../../../routes/clientes";
import errorHandler from "../../../middleware/errorHandler";
import * as clienteService from "../../../services/clienteService";
import { AppError } from "../../../lib/AppError";

jest.mock("../../../services/clienteService");

/**
 * Monta um app local com um req.user injetado (simula o authMiddleware que em
 * produção roda antes do router) + o errorHandler central no fim.
 */
const buildApp = (user?: { id: number; login: string; perfil: string }) => {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (user) req.user = user;
    next();
  });
  app.use("/api/clientes", clientesRouter);
  app.use(errorHandler);
  return app;
};

const admin = { id: 1, login: "admin", perfil: "admin" };
const naoAdmin = { id: 2, login: "vendedor", perfil: "vendedor" };

describe("clienteController routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/clientes?q=<placa> retorna o cliente DONO", () => {
    it("retorna 200 com o cliente dono da placa (com seus veículos)", async () => {
      const owner = {
        id: 7,
        nome: "Maria",
        telefone: "11999990000",
        ativo: true,
        veiculos: [{ id: 1, cliente_id: 7, placa: "ABC1D23" }],
      };
      (clienteService.listarClientes as jest.Mock).mockResolvedValue([owner]);

      const res = await request(buildApp(admin)).get(
        "/api/clientes?q=ABC1D23"
      );

      expect(res.status).toBe(200);
      expect(clienteService.listarClientes).toHaveBeenCalledWith("ABC1D23");
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(7);
      expect(res.body[0].veiculos[0].placa).toBe("ABC1D23");
    });

    it("retorna 403 para usuário não-admin", async () => {
      const res = await request(buildApp(naoAdmin)).get("/api/clientes");

      expect(res.status).toBe(403);
      expect(clienteService.listarClientes).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/clientes/:id/veiculos", () => {
    it("retorna 201 com o veículo criado", async () => {
      const veiculo = {
        id: 99,
        cliente_id: 7,
        placa: "NEW1A23",
        modelo: "Civic",
        ano: 2020,
      };
      (clienteService.adicionarVeiculo as jest.Mock).mockResolvedValue(veiculo);

      const res = await request(buildApp(admin))
        .post("/api/clientes/7/veiculos")
        .send({ placa: "NEW1A23", modelo: "Civic", ano: 2020 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 99, placa: "NEW1A23" });
      expect(clienteService.adicionarVeiculo).toHaveBeenCalledWith(
        7,
        { placa: "NEW1A23", modelo: "Civic", ano: 2020 },
        1
      );
    });

    it("retorna 404 quando o cliente não existe (AppError do service)", async () => {
      (clienteService.adicionarVeiculo as jest.Mock).mockRejectedValue(
        new AppError(404, "Cliente não encontrado")
      );

      const res = await request(buildApp(admin))
        .post("/api/clientes/404/veiculos")
        .send({ placa: "NEW1A23" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Cliente não encontrado");
    });

    it("retorna 403 para usuário não-admin", async () => {
      const res = await request(buildApp(naoAdmin))
        .post("/api/clientes/7/veiculos")
        .send({ placa: "NEW1A23" });

      expect(res.status).toBe(403);
      expect(clienteService.adicionarVeiculo).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/clientes", () => {
    it("retorna 201 ao criar cliente", async () => {
      const cliente = {
        id: 10,
        nome: "Novo",
        telefone: "11988887777",
        ativo: true,
      };
      (clienteService.criarCliente as jest.Mock).mockResolvedValue(cliente);

      const res = await request(buildApp(admin))
        .post("/api/clientes")
        .send({ nome: "Novo", telefone: "11988887777" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 10, nome: "Novo" });
    });

    it("retorna 400 quando o corpo é inválido (ZodError)", async () => {
      const res = await request(buildApp(admin))
        .post("/api/clientes")
        .send({ nome: "N", telefone: "123" });

      expect(res.status).toBe(400);
      expect(clienteService.criarCliente).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/clientes/:id", () => {
    it("retorna 200 com o cliente e seus veículos", async () => {
      const cliente = {
        id: 7,
        nome: "Maria",
        telefone: "11999990000",
        ativo: true,
        veiculos: [{ id: 1, placa: "ABC1D23" }],
      };
      (clienteService.buscarClientePorId as jest.Mock).mockResolvedValue(
        cliente
      );

      const res = await request(buildApp(admin)).get("/api/clientes/7");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 7, nome: "Maria" });
      expect(clienteService.buscarClientePorId).toHaveBeenCalledWith(7);
    });

    it("retorna 404 quando o cliente não existe", async () => {
      (clienteService.buscarClientePorId as jest.Mock).mockRejectedValue(
        new AppError(404, "Cliente não encontrado")
      );

      const res = await request(buildApp(admin)).get("/api/clientes/999");

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/clientes/:id", () => {
    it("retorna 200 com o cliente atualizado e repassa req.user.id", async () => {
      const atualizado = {
        id: 7,
        nome: "Maria Silva",
        telefone: "11999990000",
        ativo: true,
      };
      (clienteService.atualizarCliente as jest.Mock).mockResolvedValue(
        atualizado
      );

      const res = await request(buildApp(admin))
        .put("/api/clientes/7")
        .send({ nome: "Maria Silva" });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 7, nome: "Maria Silva" });
      expect(clienteService.atualizarCliente).toHaveBeenCalledWith(
        7,
        { nome: "Maria Silva" },
        1
      );
    });

    it("retorna 404 quando o cliente não existe", async () => {
      (clienteService.atualizarCliente as jest.Mock).mockRejectedValue(
        new AppError(404, "Cliente não encontrado")
      );

      const res = await request(buildApp(admin))
        .put("/api/clientes/999")
        .send({ nome: "Outro" });

      expect(res.status).toBe(404);
    });

    it("retorna 400 quando o corpo é inválido (Zod)", async () => {
      const res = await request(buildApp(admin))
        .put("/api/clientes/7")
        .send({ telefone: "123" });

      expect(res.status).toBe(400);
      expect(clienteService.atualizarCliente).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/clientes (lista) propaga erro do service", () => {
    it("retorna 500 quando o service lança erro não-AppError", async () => {
      (clienteService.listarClientes as jest.Mock).mockRejectedValue(
        new Error("db down")
      );

      const res = await request(buildApp(admin)).get("/api/clientes");

      expect(res.status).toBe(500);
    });
  });
});
