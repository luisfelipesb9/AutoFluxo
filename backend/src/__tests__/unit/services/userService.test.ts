import * as userService from "../../../services/userService";
import { createMockUser } from "../../fixtures/users.fixture";
import * as db from "../../../lib/database";

// Mock do database
jest.mock("../../../lib/database");

describe("userService.findUserByLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve retornar usuário quando encontrado", async () => {
    const mockUser = createMockUser({ login: "testuser" });
    const mockRepository = {
      findOne: jest.fn().mockResolvedValue(mockUser),
    };

    (db.AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

    const result = await userService.findUserByLogin("testuser");

    expect(result).toEqual(mockUser);
    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: { login: "testuser" },
    });
  });

  it("deve retornar null quando usuário não existe", async () => {
    const mockRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    (db.AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

    const result = await userService.findUserByLogin("nonexistent");

    expect(result).toBeNull();
  });

  it("deve ser case-sensitive na busca", async () => {
    const mockRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    (db.AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

    await userService.findUserByLogin("TestUser");

    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: { login: "TestUser" },
    });
  });
});

describe("userService.verifyPassword", () => {
  it("deve retornar true para senha correta", async () => {
    const plainPassword = "senha123";
    const bcryptHash = await userService.hashPassword(plainPassword);

    const result = await userService.verifyPassword(plainPassword, bcryptHash);

    expect(result).toBe(true);
  });

  it("deve retornar false para senha incorreta", async () => {
    const plainPassword = "senhaErrada";
    const bcryptHash =
      "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lm";

    const result = await userService.verifyPassword(plainPassword, bcryptHash);

    expect(result).toBe(false);
  });

  it("deve lidar com hash inválido sem lançar erro", async () => {
    const result = await userService.verifyPassword("password", "invalid_hash");

    expect(result).toBe(false);
  });
});

describe("userService.hashPassword", () => {
  it("deve gerar um hash bcrypt válido", async () => {
    const password = "mySuperSecretPassword";
    const hash = await userService.hashPassword(password);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(50); // bcrypt hash é longo
    expect(hash.startsWith("$2b$")).toBe(true); // bcrypt format
  });

  it("deve gerar hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const password = "mySuperSecretPassword";
    const hash1 = await userService.hashPassword(password);
    const hash2 = await userService.hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });

  it("hash gerado deve ser verificável com verifyPassword", async () => {
    const password = "testPassword123";
    const hash = await userService.hashPassword(password);

    const isValid = await userService.verifyPassword(password, hash);

    expect(isValid).toBe(true);
  });

  it("deve ser case-sensitive na senha", async () => {
    const password = "TestPassword";
    const hash = await userService.hashPassword(password);

    const resultLowercase = await userService.verifyPassword(
      "testpassword",
      hash
    );
    expect(resultLowercase).toBe(false);

    const resultCorrect = await userService.verifyPassword(password, hash);
    expect(resultCorrect).toBe(true);
  });

  it("deve lidar com senhas vazias", async () => {
    const hash = await userService.hashPassword("");

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
  });

  it("deve lidar com senhas muito longas", async () => {
    const longPassword = "a".repeat(1000);
    const hash = await userService.hashPassword(longPassword);

    expect(hash).toBeDefined();
    const isValid = await userService.verifyPassword(longPassword, hash);
    expect(isValid).toBe(true);
  });
});

describe("userService.getUserById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve retornar usuário por ID", async () => {
    const mockUser = createMockUser({ id: 5 });
    const mockRepository = {
      findOne: jest.fn().mockResolvedValue(mockUser),
    };

    (db.AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

    const result = await userService.getUserById(5);

    expect(result).toEqual(mockUser);
    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: { id: 5 },
    });
  });

  it("deve retornar null quando usuário não existe", async () => {
    const mockRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    (db.AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

    const result = await userService.getUserById(999);

    expect(result).toBeNull();
  });
});
