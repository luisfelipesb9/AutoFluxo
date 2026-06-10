// Mock AppDataSource before importing the service to avoid TypeORM metadata errors.
// O repositório é um objeto compartilhado com jest.fn() para inspecionar chamadas.
jest.mock("../../../lib/database", () => {
  const repo = {
    save: jest.fn().mockResolvedValue({ token: "mock_token" }),
    findOne: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
  };
  return {
    AppDataSource: {
      isInitialized: true,
      getRepository: jest.fn(() => repo),
    },
  };
});

import { FindOperator } from "typeorm";
import { AppDataSource } from "../../../lib/database";
import * as refreshService from "../../../services/refreshTokenService";

// Acesso ao repositório compartilhado mockado.
const repo = (AppDataSource.getRepository as jest.Mock)();

describe("refreshTokenService basic API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("createRefreshToken é async e retorna token", async () => {
    const token = await refreshService.createRefreshToken(1);
    expect(typeof token).toBe("string");
  });

  it("isRefreshTokenValid é async", async () => {
    const valid = await refreshService.isRefreshTokenValid("mock_token");
    // Pode retornar null (não encontrado) ou objeto válido
    expect(valid === null || typeof valid === "object").toBeTruthy();
  });
});

describe("refreshTokenService.cleanupExpiredTokens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deleta tokens com expiresAt no passado usando LessThan (não igualdade exata)", async () => {
    const antes = Date.now();
    await refreshService.cleanupExpiredTokens();
    const depois = Date.now();

    expect(repo.delete).toHaveBeenCalledTimes(1);
    const criteria = (repo.delete as jest.Mock).mock.calls[0][0];

    // O critério deve usar o operador LessThan, e não um Date cru (bug original).
    expect(criteria.expiresAt).toBeInstanceOf(FindOperator);
    expect(criteria.expiresAt.type).toBe("lessThan");
    expect(criteria.expiresAt.value).toBeInstanceOf(Date);

    // O limite é "agora": entre o início e o fim da chamada.
    const limite = (criteria.expiresAt.value as Date).getTime();
    expect(limite).toBeGreaterThanOrEqual(antes);
    expect(limite).toBeLessThanOrEqual(depois);
  });

  it("não lança quando o delete falha (apenas loga)", async () => {
    (repo.delete as jest.Mock).mockRejectedValueOnce(new Error("db down"));
    await expect(refreshService.cleanupExpiredTokens()).resolves.toBeUndefined();
  });
});
