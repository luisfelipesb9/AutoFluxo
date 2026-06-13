import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import adminRouter from "../../../routes/admin";
import errorHandler from "../../../middleware/errorHandler";
import * as logQueryService from "../../../services/logQueryService";

jest.mock("../../../services/logQueryService");

let currentPerfil = "admin";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: 1, login: "admin", perfil: currentPerfil };
    next();
  });
  app.use("/z_admin", adminRouter);
  app.use(errorHandler);
  return app;
};

const app = buildApp();

beforeEach(() => {
  jest.clearAllMocks();
  currentPerfil = "admin";
});

describe("GET /z_admin/logs", () => {
  it("retorna 200 paginado e repassa os filtros coeridos", async () => {
    (logQueryService.listarLogs as jest.Mock).mockResolvedValue({
      data: [],
      page: 1,
      pageSize: 50,
      total: 0,
    });

    const res = await request(app).get("/z_admin/logs?usuario_id=3");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, pageSize: 50, total: 0 });
    expect(logQueryService.listarLogs).toHaveBeenCalledWith(
      expect.objectContaining({ usuario_id: 3, page: 1, pageSize: 50 })
    );
  });

  it("retorna 403 para usuário não-admin", async () => {
    currentPerfil = "estoque";

    const res = await request(app).get("/z_admin/logs");

    expect(res.status).toBe(403);
    expect(logQueryService.listarLogs).not.toHaveBeenCalled();
  });
});
