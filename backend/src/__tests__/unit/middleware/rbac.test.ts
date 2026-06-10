import { requireRole, requireAdmin } from "../../../middleware/rbac";
import { AppError } from "../../../lib/AppError";

describe("rbac", () => {
  const buildRes = () =>
    ({ status: jest.fn().mockReturnThis(), json: jest.fn() }) as any;

  describe("requireRole", () => {
    it("deve chamar next com AppError 401 quando não houver req.user", () => {
      const req = {} as any;
      const next = jest.fn();

      requireRole("admin")(req, buildRes(), next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe("Não autenticado");
    });

    it("deve chamar next com AppError 403 quando o perfil não estiver na lista", () => {
      const req = { user: { id: 1, login: "u", perfil: "vendedor" } } as any;
      const next = jest.fn();

      requireRole("admin", "caixa")(req, buildRes(), next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe("Acesso não permitido");
    });

    it("deve chamar next sem erro quando o perfil estiver na lista", () => {
      const req = { user: { id: 1, login: "u", perfil: "caixa" } } as any;
      const next = jest.fn();

      requireRole("admin", "caixa")(req, buildRes(), next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("requireAdmin", () => {
    it("deve chamar next sem erro quando o perfil for admin", () => {
      const req = { user: { id: 1, login: "u", perfil: "admin" } } as any;
      const next = jest.fn();

      requireAdmin(req, buildRes(), next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it("deve chamar next com AppError 403 quando o perfil não for admin", () => {
      const req = { user: { id: 1, login: "u", perfil: "estoque" } } as any;
      const next = jest.fn();

      requireAdmin(req, buildRes(), next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
    });
  });
});
