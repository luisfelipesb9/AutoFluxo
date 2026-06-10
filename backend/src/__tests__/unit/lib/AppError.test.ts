import { AppError } from "../../../lib/AppError";

describe("AppError", () => {
  it("construtor seta statusCode, message, name e (opcional) code", () => {
    const err = new AppError(418, "Sou um bule", "TEAPOT");
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe("Sou um bule");
    expect(err.name).toBe("AppError");
    expect(err.code).toBe("TEAPOT");
  });

  it("code é undefined quando não informado", () => {
    const err = new AppError(500, "Boom");
    expect(err.code).toBeUndefined();
  });

  describe("helpers estáticos", () => {
    it("badRequest retorna AppError 400", () => {
      const err = AppError.badRequest("Entrada inválida", "BAD");
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe("Entrada inválida");
      expect(err.code).toBe("BAD");
    });

    it("notFound retorna AppError 404", () => {
      const err = AppError.notFound("Não achei");
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe("Não achei");
      expect(err.code).toBeUndefined();
    });

    it("conflict retorna AppError 409", () => {
      const err = AppError.conflict("Conflito", "DUP");
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe("Conflito");
      expect(err.code).toBe("DUP");
    });
  });
});
