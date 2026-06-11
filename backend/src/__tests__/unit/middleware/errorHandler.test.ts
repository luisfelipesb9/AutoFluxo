import { z } from "zod";
import errorHandler from "../../../middleware/errorHandler";
import { AppError } from "../../../lib/AppError";

jest.mock("../../../lib/logger", () => ({ error: jest.fn(), warn: jest.fn() }));

describe("errorHandler", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("deve retornar 500 sem detalhes quando não for development", () => {
    process.env.NODE_ENV = "production";

    const err = new Error("boom");
    const req = { path: "/p", method: "GET" } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro interno do servidor" });
  });

  it("deve incluir detalhes quando NODE_ENV=development", () => {
    process.env.NODE_ENV = "development";

    const err = new Error("boom dev");
    const req = { path: "/p", method: "GET" } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro interno do servidor", details: "boom dev" });
  });

  it("deve formatar AppError com seu statusCode e code", () => {
    const err = new AppError(404, "Pedido não encontrado", "PEDIDO_NAO_ENCONTRADO");
    const req = { path: "/p", method: "GET" } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Pedido não encontrado",
      code: "PEDIDO_NAO_ENCONTRADO",
    });
  });

  it("deve formatar AppError sem code quando não informado", () => {
    const err = new AppError(403, "Acesso não permitido");
    const req = { path: "/p", method: "GET" } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Acesso não permitido" });
  });

  it("deve retornar 400 com detalhes para ZodError", () => {
    const schema = z.object({ nome: z.string(), idade: z.number() });
    const result = schema.safeParse({ idade: "x" });
    expect(result.success).toBe(false);
    const err = (result as { success: false; error: z.ZodError }).error;

    const req = { path: "/p", method: "POST" } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.error).toBe("Dados inválidos");
    expect(Array.isArray(payload.detalhes)).toBe(true);
    expect(payload.detalhes.length).toBeGreaterThan(0);
    expect(payload.detalhes[0]).toEqual(
      expect.objectContaining({
        campo: expect.any(String),
        mensagem: expect.any(String),
      })
    );
    // campo deve refletir o path do issue (ex.: "nome" ou "idade")
    const campos = payload.detalhes.map((d: { campo: string }) => d.campo);
    expect(campos).toEqual(expect.arrayContaining(["nome"]));
  });

  it("deve respeitar statusCode numérico em erro genérico (máquina de estados)", () => {
    const err = Object.assign(new Error("Transição inválida"), { statusCode: 409 });
    const req = { path: "/p", method: "POST" } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: "Transição inválida" });
  });
});
