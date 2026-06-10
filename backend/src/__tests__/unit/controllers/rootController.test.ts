import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { getRoot } from "../../../controllers/rootController";
import { getWelcomeMessage } from "../../../services/exampleService";

/**
 * getRoot ecoa a mensagem de boas-vindas (do exampleService, NÃO mockado aqui)
 * e o usuário autenticado (ou null). Cobre os dois lados do `req.user ?? null`.
 */
const buildApp = (user?: { id: number; login: string; perfil: string }) => {
  const app = express();
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (user) req.user = user;
    next();
  });
  app.get("/", getRoot);
  return app;
};

describe("GET / (rootController)", () => {
  it("retorna a mensagem de boas-vindas e ecoa o usuário autenticado", async () => {
    const user = { id: 1, login: "admin", perfil: "admin" };
    const res = await request(buildApp(user)).get("/");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(getWelcomeMessage());
    expect(res.body.message).toBe("Welcome to AutoFluxo API");
    expect(res.body.user).toEqual(user);
  });

  it("retorna user: null quando não há usuário autenticado", async () => {
    const res = await request(buildApp()).get("/");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Welcome to AutoFluxo API");
    expect(res.body.user).toBeNull();
  });
});

describe("getWelcomeMessage (exampleService)", () => {
  it("retorna a string esperada", () => {
    expect(getWelcomeMessage()).toBe("Welcome to AutoFluxo API");
  });
});
