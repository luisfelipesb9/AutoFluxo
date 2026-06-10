import * as db from "../../../lib/database";
import { User } from "../../../entities/User";
import { PerfilUsuario } from "../../../entities/enums";
import { AppError } from "../../../lib/AppError";
import * as userService from "../../../services/userService";
import {
  sanitizeUsuario,
  criarUsuario,
  resetarSenha,
  desativarUsuario,
  buscarUsuario,
  listarUsuarios,
  atualizarUsuario,
} from "../../../services/usuarioService";

// NÃO referenciar objetos externos dentro da factory do jest.mock (hoisting).
jest.mock("../../../lib/database");
// O logService grava em `logs_acao`; isolamos para não tocar no banco.
jest.mock("../../../services/logService", () => ({
  registrarLog: jest.fn().mockResolvedValue(undefined),
}));

const buildUser = (overrides: Partial<User> = {}): User => {
  const u = new User();
  u.id = 1;
  u.nome = "Test User";
  u.login = "testuser";
  u.senhaHash = "$2b$12$mocked_hash";
  u.perfil = PerfilUsuario.VENDEDOR;
  u.ativo = true;
  u.criadoEm = new Date("2026-01-01T00:00:00Z");
  u.atualizadoEm = new Date("2026-01-02T00:00:00Z");
  return Object.assign(u, overrides);
};

type MockRepo = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

let mockRepository: MockRepo;

beforeEach(() => {
  jest.clearAllMocks();

  mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    // `create` apenas mescla os campos numa "entidade" (como o TypeORM faz).
    create: jest.fn((data) => buildUser(data as Partial<User>)),
    save: jest.fn((entity) => Promise.resolve(entity)),
  };

  (db.AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
});

describe("sanitizeUsuario", () => {
  it("remove senhaHash e expõe campos em snake_case", () => {
    const result = sanitizeUsuario(
      buildUser({ senhaHash: "$2b$12$super_secret_hash" })
    );

    expect(result).not.toHaveProperty("senhaHash");
    expect(JSON.stringify(result)).not.toContain("super_secret_hash");
    expect(result).toEqual({
      id: 1,
      nome: "Test User",
      login: "testuser",
      perfil: PerfilUsuario.VENDEDOR,
      ativo: true,
      criado_em: new Date("2026-01-01T00:00:00Z"),
      atualizado_em: new Date("2026-01-02T00:00:00Z"),
    });
  });
});

describe("criarUsuario", () => {
  it("faz hash da senha (nunca armazena texto puro) e retorna sanitizado", async () => {
    mockRepository.findOne.mockResolvedValue(null); // login livre

    const result = await criarUsuario(
      {
        nome: "Nova Pessoa",
        login: "novapessoa",
        senha: "segredo123",
        perfil: PerfilUsuario.CAIXA,
      },
      99
    );

    // A entidade salva carrega um hash bcrypt real — não a senha em texto puro.
    const savedEntity = mockRepository.save.mock.calls[0][0] as User;
    expect(savedEntity.senhaHash).not.toBe("segredo123");
    expect(savedEntity.senhaHash.startsWith("$2b$")).toBe(true);
    await expect(
      userService.verifyPassword("segredo123", savedEntity.senhaHash)
    ).resolves.toBe(true);

    // Resposta sanitizada: sem senha/senhaHash.
    expect(result).not.toHaveProperty("senhaHash");
    expect(JSON.stringify(result)).not.toContain("segredo123");
    expect(result.login).toBe("novapessoa");
    expect(result.ativo).toBe(true);
  });

  it("lança AppError(409) quando login já existe (checa antes de salvar)", async () => {
    mockRepository.findOne.mockResolvedValue(buildUser({ login: "novapessoa" }));

    await expect(
      criarUsuario(
        {
          nome: "Nova Pessoa",
          login: "novapessoa",
          senha: "segredo123",
          perfil: PerfilUsuario.CAIXA,
        },
        99
      )
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockRepository.save).not.toHaveBeenCalled();
  });
});

describe("resetarSenha", () => {
  it("re-hasheia a senha e persiste novo hash bcrypt", async () => {
    const usuario = buildUser({ senhaHash: "$2b$12$hash_antigo" });
    mockRepository.findOne.mockResolvedValue(usuario);

    await resetarSenha(1, "novaSenha456", 99);

    const savedEntity = mockRepository.save.mock.calls[0][0] as User;
    expect(savedEntity.senhaHash).not.toBe("$2b$12$hash_antigo");
    expect(savedEntity.senhaHash).not.toBe("novaSenha456");
    expect(savedEntity.senhaHash.startsWith("$2b$")).toBe(true);
    await expect(
      userService.verifyPassword("novaSenha456", savedEntity.senhaHash)
    ).resolves.toBe(true);
  });

  it("lança AppError(404) quando usuário não existe", async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(resetarSenha(123, "qualquer123", 99)).rejects.toBeInstanceOf(
      AppError
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });
});

describe("desativarUsuario (soft delete)", () => {
  it("define ativo=false sem remover o registro", async () => {
    const usuario = buildUser({ ativo: true });
    mockRepository.findOne.mockResolvedValue(usuario);

    await desativarUsuario(1, 99);

    const savedEntity = mockRepository.save.mock.calls[0][0] as User;
    expect(savedEntity.ativo).toBe(false);
    // Soft delete: nunca chama remove/delete.
    expect((mockRepository as unknown as { remove?: jest.Mock }).remove).toBeUndefined();
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it("lança AppError(404) quando usuário não existe", async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(desativarUsuario(123, 99)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("buscarUsuario", () => {
  it("retorna o usuário sanitizado quando encontrado", async () => {
    mockRepository.findOne.mockResolvedValue(
      buildUser({ id: 5, login: "achado", senhaHash: "$2b$12$x" })
    );

    const result = await buscarUsuario(5);

    expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(result).not.toHaveProperty("senhaHash");
    expect(result).toMatchObject({ id: 5, login: "achado" });
  });

  it("lança AppError(404) quando não encontrado", async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(buscarUsuario(404)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("listarUsuarios", () => {
  it("ordena por id ASC e retorna todos sanitizados (sem senhaHash)", async () => {
    mockRepository.find.mockResolvedValue([
      buildUser({ id: 1, login: "a", senhaHash: "$2b$12$secret1" }),
      buildUser({ id: 2, login: "b", senhaHash: "$2b$12$secret2" }),
    ]);

    const result = await listarUsuarios();

    expect(mockRepository.find).toHaveBeenCalledWith({ order: { id: "ASC" } });
    expect(result).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain("secret");
    result.forEach((u) => expect(u).not.toHaveProperty("senhaHash"));
  });
});

describe("atualizarUsuario", () => {
  it("aplica os campos informados (nome/perfil/ativo) e retorna sanitizado", async () => {
    const usuario = buildUser({
      id: 7,
      nome: "Antigo",
      perfil: PerfilUsuario.VENDEDOR,
      ativo: true,
    });
    mockRepository.findOne.mockResolvedValue(usuario);

    const result = await atualizarUsuario(
      7,
      { nome: "Novo", perfil: PerfilUsuario.CAIXA, ativo: false },
      99
    );

    const saved = mockRepository.save.mock.calls[0][0] as User;
    expect(saved.nome).toBe("Novo");
    expect(saved.perfil).toBe(PerfilUsuario.CAIXA);
    expect(saved.ativo).toBe(false);
    expect(result).not.toHaveProperty("senhaHash");
    expect(result).toMatchObject({ id: 7, nome: "Novo", ativo: false });
  });

  it("não altera campos ausentes do payload (partial update)", async () => {
    const usuario = buildUser({
      id: 7,
      nome: "Mantido",
      perfil: PerfilUsuario.ESTOQUE,
      ativo: true,
    });
    mockRepository.findOne.mockResolvedValue(usuario);

    await atualizarUsuario(7, { ativo: false }, 99);

    const saved = mockRepository.save.mock.calls[0][0] as User;
    // nome e perfil permanecem; só ativo mudou.
    expect(saved.nome).toBe("Mantido");
    expect(saved.perfil).toBe(PerfilUsuario.ESTOQUE);
    expect(saved.ativo).toBe(false);
  });

  it("lança AppError(404) quando usuário não existe", async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(
      atualizarUsuario(404, { nome: "X" }, 99)
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(mockRepository.save).not.toHaveBeenCalled();
  });
});
