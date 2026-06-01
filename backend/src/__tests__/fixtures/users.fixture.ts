import { User } from "../../entities/User";

export const createMockUser = (overrides?: Partial<User>): User => {
  const user = new User();
  user.id = 1;
  user.nome = "Test User";
  user.login = "testuser";
  user.senhaHash = "$2b$12$mocked_hash";
  user.perfil = "USER";
  user.ativo = true;
  user.criadoEm = new Date();
  user.atualizadoEm = new Date();

  return { ...user, ...overrides };
};

export const adminUser = createMockUser({
  id: 2,
  nome: "Admin User",
  login: "admin",
  perfil: "ADMIN",
});

export const standardUser = createMockUser({
  id: 3,
  nome: "Standard User",
  login: "user",
  perfil: "USER",
});

export const inactiveUser = createMockUser({
  id: 4,
  nome: "Inactive User",
  login: "inactive",
  ativo: false,
});
