import jwt from "jsonwebtoken";

// Mock refreshTokenService before importing authService to avoid DB calls
jest.mock("../../../services/refreshTokenService", () => ({
  createRefreshToken: jest.fn().mockResolvedValue("mock_refresh_token"),
  isRefreshTokenValid: jest.fn().mockResolvedValue({ userId: 1 }),
  revokeRefreshToken: jest.fn().mockResolvedValue(true),
}));

import * as authService from "../../../services/authService";
import { createMockUser } from "../../fixtures/users.fixture";

describe("authService.generateAccessToken", () => {
  const mockUser = createMockUser();

  it("deve gerar um token válido com estrutura correta", () => {
    const token = authService.generateAccessToken(mockUser);

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // JWT tem 3 partes
  });

  it("deve incluir payload com id, login e perfil", () => {
    const token = authService.generateAccessToken(mockUser);
    const decoded = jwt.decode(token) as any;

    expect(decoded.id).toBe(mockUser.id);
    expect(decoded.login).toBe(mockUser.login);
    expect(decoded.perfil).toBe(mockUser.perfil);
  });

  it("deve expirar em 8 horas", () => {
    const token = authService.generateAccessToken(mockUser);
    const decoded = jwt.decode(token) as any;

    const expirationTime = decoded.exp - decoded.iat;

    // 8 horas em segundos = 28800
    expect(expirationTime).toBe(8 * 60 * 60);
  });

  it("deve usar algoritmo HS256", () => {
    const token = authService.generateAccessToken(mockUser);
    const decoded = jwt.decode(token, { complete: true }) as any;

    expect(decoded.header.alg).toBe("HS256");
  });

  it("deve gerar tokens válidos em chamadas sucessivas", () => {
    const token1 = authService.generateAccessToken(mockUser);
    const token2 = authService.generateAccessToken(mockUser);

    expect(typeof token1).toBe("string");
    expect(typeof token2).toBe("string");
    const d1 = jwt.decode(token1) as any;
    const d2 = jwt.decode(token2) as any;
    expect(d1.id).toBe(d2.id);
    expect(d1.login).toBe(d2.login);
  });
});

describe("authService.verifyAccessToken", () => {
  const mockUser = createMockUser();
  let validToken: string;

  beforeEach(() => {
    validToken = authService.generateAccessToken(mockUser);
  });

  it("deve verificar um token válido e retornar o payload", () => {
    const payload = authService.verifyAccessToken(validToken);

    expect(payload.id).toBe(mockUser.id);
    expect(payload.login).toBe(mockUser.login);
    expect(payload.perfil).toBe(mockUser.perfil);
  });

  it("deve lançar erro para token inválido", () => {
    const invalidToken = "invalid.token.here";

    expect(() => {
      authService.verifyAccessToken(invalidToken);
    }).toThrow();
  });

  it("deve lançar erro para token com signature inválida", () => {
    const parts = validToken.split(".");
    const tampered = parts[0] + "." + parts[1] + ".invalid_signature";

    expect(() => {
      authService.verifyAccessToken(tampered);
    }).toThrow();
  });

  it("deve lançar erro para token expirado", () => {
    // Criar um token que já expirou
    const payload = {
      id: mockUser.id,
      login: mockUser.login,
      perfil: mockUser.perfil,
    };

    const expiredToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "0s", // Já expirado
      algorithm: "HS256",
    });

    // Aguardar um pouco para garantir que expirou
    expect(() => {
      authService.verifyAccessToken(expiredToken);
    }).toThrow();
  });

  it("deve validar corretamente os claims do payload", () => {
    const payload = authService.verifyAccessToken(validToken);

    expect(payload).toHaveProperty("id");
    expect(payload).toHaveProperty("login");
    expect(payload).toHaveProperty("perfil");
    expect(payload).toHaveProperty("iat");
    expect(payload).toHaveProperty("exp");

    expect(typeof payload.id).toBe("number");
    expect(typeof payload.login).toBe("string");
    expect(typeof payload.iat).toBe("number");
    expect(typeof payload.exp).toBe("number");
  });
});

describe("authService.issueRefreshToken", () => {
  const mockUserId = 1;

  it("deve ser uma função assíncrona", () => {
    const result = authService.issueRefreshToken(mockUserId);
    expect(result).toBeInstanceOf(Promise);
  });
});

describe("authService.validateRefreshToken", () => {
  it("deve ser uma função assíncrona", () => {
    const result = authService.validateRefreshToken("mock_token");
    expect(result).toBeInstanceOf(Promise);
  });
});

describe("authService.invalidateRefreshToken", () => {
  it("deve ser uma função assíncrona", () => {
    const result = authService.invalidateRefreshToken("mock_token");
    expect(result).toBeInstanceOf(Promise);
  });
});
