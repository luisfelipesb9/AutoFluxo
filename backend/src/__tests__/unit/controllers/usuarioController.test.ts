import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import usuariosRouter from "../../../routes/usuarios";
import errorHandler from "../../../middleware/errorHandler";
import { AppError } from "../../../lib/AppError";
import * as usuarioService from "../../../services/usuarioService";

jest.mock("../../../services/usuarioService");

// Perfil do usuário "logado" — mutável para exercitar o requireAdmin (403).
let currentPerfil = "admin";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as Request).user = { id: 1, login: "admin", perfil: currentPerfil };
    next();
  });
  app.use("/usuarios", usuariosRouter);
  app.use(errorHandler);
  return app;
};

const app = buildApp();

beforeEach(() => {
  jest.clearAllMocks();
  currentPerfil = "admin";
});

describe("POST /usuarios", () => {
  it("retorna 201 com usuário sanitizado (sem senha/senhaHash)", async () => {
    (usuarioService.criarUsuario as jest.Mock).mockResolvedValue({
      id: 10,
      nome: "Maria",
      login: "maria",
      perfil: "vendedor",
      ativo: true,
      criado_em: new Date("2026-01-01T00:00:00Z"),
      atualizado_em: new Date("2026-01-01T00:00:00Z"),
    });

    const res = await request(app).post("/usuarios").send({
      nome: "Maria",
      login: "maria",
      senha: "segredo123",
      perfil: "vendedor",
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 10, login: "maria" });
    // Garantia central: nenhuma forma de senha vaza no corpo da resposta.
    expect(res.body).not.toHaveProperty("senhaHash");
    expect(res.body).not.toHaveProperty("senha");
    expect(JSON.stringify(res.body)).not.toContain("segredo123");
  });

  it("retorna 409 quando login está duplicado", async () => {
    (usuarioService.criarUsuario as jest.Mock).mockRejectedValue(
      new AppError(409, "Login já cadastrado")
    );

    const res = await request(app).post("/usuarios").send({
      nome: "Maria",
      login: "maria",
      senha: "segredo123",
      perfil: "vendedor",
    });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: "Login já cadastrado" });
  });

  it("retorna 400 quando perfil é inválido (Zod)", async () => {
    const res = await request(app).post("/usuarios").send({
      nome: "Maria",
      login: "maria",
      senha: "segredo123",
      perfil: "rei",
    });

    expect(res.status).toBe(400);
    expect(usuarioService.criarUsuario).not.toHaveBeenCalled();
  });

  it("retorna 403 quando o usuário não é admin", async () => {
    currentPerfil = "vendedor";

    const res = await request(app).post("/usuarios").send({
      nome: "Maria",
      login: "maria",
      senha: "segredo123",
      perfil: "vendedor",
    });

    expect(res.status).toBe(403);
    expect(usuarioService.criarUsuario).not.toHaveBeenCalled();
  });
});

describe("GET /usuarios", () => {
  it("retorna 200 e a lista nunca contém senhaHash", async () => {
    (usuarioService.listarUsuarios as jest.Mock).mockResolvedValue([
      {
        id: 1,
        nome: "Admin",
        login: "admin",
        perfil: "admin",
        ativo: true,
        criado_em: new Date(),
        atualizado_em: new Date(),
      },
      {
        id: 2,
        nome: "Caixa",
        login: "caixa",
        perfil: "caixa",
        ativo: true,
        criado_em: new Date(),
        atualizado_em: new Date(),
      },
    ]);

    const res = await request(app).get("/usuarios");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(JSON.stringify(res.body)).not.toContain("senhaHash");
    res.body.forEach((u: Record<string, unknown>) => {
      expect(u).not.toHaveProperty("senhaHash");
      expect(u).not.toHaveProperty("senha");
    });
  });

  it("retorna 403 para perfil não-admin", async () => {
    currentPerfil = "caixa";

    const res = await request(app).get("/usuarios");

    expect(res.status).toBe(403);
    expect(usuarioService.listarUsuarios).not.toHaveBeenCalled();
  });
});

describe("GET /usuarios/:id", () => {
  it("retorna 404 quando o usuário não existe", async () => {
    (usuarioService.buscarUsuario as jest.Mock).mockRejectedValue(
      new AppError(404, "Usuário não encontrado")
    );

    const res = await request(app).get("/usuarios/999");

    expect(res.status).toBe(404);
  });
});

describe("DELETE /usuarios/:id", () => {
  it("retorna 204 ao desativar (soft delete)", async () => {
    (usuarioService.desativarUsuario as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app).delete("/usuarios/5");

    expect(res.status).toBe(204);
    expect(usuarioService.desativarUsuario).toHaveBeenCalledWith(5, 1);
  });
});

describe("PUT /usuarios/:id/reset-senha", () => {
  it("retorna 204 e nunca devolve a senha no corpo", async () => {
    (usuarioService.resetarSenha as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .put("/usuarios/5/reset-senha")
      .send({ senha: "novaSenha456" });

    expect(res.status).toBe(204);
    expect(JSON.stringify(res.body)).not.toContain("novaSenha456");
  });

  it("retorna 400 quando a senha é curta demais (Zod)", async () => {
    const res = await request(app)
      .put("/usuarios/5/reset-senha")
      .send({ senha: "123" });

    expect(res.status).toBe(400);
    expect(usuarioService.resetarSenha).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o usuário não existe", async () => {
    (usuarioService.resetarSenha as jest.Mock).mockRejectedValue(
      new AppError(404, "Usuário não encontrado")
    );

    const res = await request(app)
      .put("/usuarios/999/reset-senha")
      .send({ senha: "novaSenha456" });

    expect(res.status).toBe(404);
  });
});

describe("PUT /usuarios/:id (update)", () => {
  it("retorna 200 com o usuário atualizado e repassa o autor (req.user.id)", async () => {
    (usuarioService.atualizarUsuario as jest.Mock).mockResolvedValue({
      id: 5,
      nome: "Novo Nome",
      login: "maria",
      perfil: "vendedor",
      ativo: false,
      criado_em: new Date("2026-01-01T00:00:00Z"),
      atualizado_em: new Date("2026-02-01T00:00:00Z"),
    });

    const res = await request(app)
      .put("/usuarios/5")
      .send({ nome: "Novo Nome", ativo: false });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 5, nome: "Novo Nome", ativo: false });
    expect(res.body).not.toHaveProperty("senhaHash");
    expect(usuarioService.atualizarUsuario).toHaveBeenCalledWith(
      5,
      { nome: "Novo Nome", ativo: false },
      1
    );
  });

  it("retorna 400 quando o perfil é inválido (Zod)", async () => {
    const res = await request(app)
      .put("/usuarios/5")
      .send({ perfil: "rei" });

    expect(res.status).toBe(400);
    expect(usuarioService.atualizarUsuario).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o usuário não existe", async () => {
    (usuarioService.atualizarUsuario as jest.Mock).mockRejectedValue(
      new AppError(404, "Usuário não encontrado")
    );

    const res = await request(app)
      .put("/usuarios/999")
      .send({ nome: "Nome Válido" });

    expect(res.status).toBe(404);
  });
});

describe("GET /usuarios/:id (sucesso)", () => {
  it("retorna 200 com o usuário sanitizado", async () => {
    (usuarioService.buscarUsuario as jest.Mock).mockResolvedValue({
      id: 3,
      nome: "Carlos",
      login: "carlos",
      perfil: "caixa",
      ativo: true,
      criado_em: new Date(),
      atualizado_em: new Date(),
    });

    const res = await request(app).get("/usuarios/3");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 3, login: "carlos" });
    expect(res.body).not.toHaveProperty("senhaHash");
  });
});

describe("error propagation (catch -> errorHandler)", () => {
  it("GET /usuarios devolve 500 quando o service lança erro não-AppError", async () => {
    (usuarioService.listarUsuarios as jest.Mock).mockRejectedValue(
      new Error("db down")
    );

    const res = await request(app).get("/usuarios");

    expect(res.status).toBe(500);
  });

  it("DELETE /usuarios/:id devolve 404 quando o usuário não existe", async () => {
    (usuarioService.desativarUsuario as jest.Mock).mockRejectedValue(
      new AppError(404, "Usuário não encontrado")
    );

    const res = await request(app).delete("/usuarios/999");

    expect(res.status).toBe(404);
  });
});
