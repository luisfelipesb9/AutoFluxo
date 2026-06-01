// Mock AppDataSource before importing the service to avoid TypeORM metadata errors
jest.mock("../../../lib/database", () => ({
  AppDataSource: {
    isInitialized: true,
    getRepository: () => ({
      save: jest.fn().mockResolvedValue({ token: "mock_token" }),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

import * as refreshService from "../../../services/refreshTokenService";

describe("refreshTokenService basic API", () => {
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
