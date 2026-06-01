import { authMiddleware } from "../../../middleware/authMiddleware";
import * as authService from "../../../services/authService";

jest.mock("../../../services/authService");
jest.mock("../../../lib/logger", () => ({ warn: jest.fn(), debug: jest.fn(), error: jest.fn() }));

describe("authMiddleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve retornar 401 quando não houver Authorization header", () => {
    const req = { headers: {}, path: "/test" } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token não fornecido" });
    expect(next).not.toHaveBeenCalled();
  });

  it("deve retornar 401 quando o token for inválido", () => {
    (authService.verifyAccessToken as jest.Mock).mockImplementation(() => {
      throw new Error("invalid");
    });

    const req = { headers: { authorization: "Bearer bad.token" }, path: "/test" } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token inválido ou expirado" });
    expect(next).not.toHaveBeenCalled();
  });

  it("deve chamar next e definir req.user quando o token for válido", () => {
    (authService.verifyAccessToken as jest.Mock).mockReturnValue({ id: 1, login: "u", perfil: "ADMIN" });

    const req: any = { headers: { authorization: "Bearer good.token" }, path: "/test" };
    const res = {} as any;
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 1, login: "u", perfil: "ADMIN" });
  });
});
