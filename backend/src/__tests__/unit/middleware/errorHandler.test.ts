import errorHandler from "../../../middleware/errorHandler";

jest.mock("../../../lib/logger", () => ({ error: jest.fn() }));

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
});
