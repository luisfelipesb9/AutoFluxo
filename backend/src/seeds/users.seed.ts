import { AppDataSource } from "../lib/database";
import { User } from "../entities/User";
import { hashPassword } from "../services/userService";
import { PerfilUsuario } from "../entities/enums";
import logger from "../lib/logger";

/**
 * Usuários de exemplo — um por perfil (minúsculo, conforme RBAC).
 * Senha padrão: "<login>123" (ex.: admin123).
 */
const USERS: Array<{ nome: string; login: string; senha: string; perfil: PerfilUsuario }> = [
  { nome: "Administrador", login: "admin", senha: "admin123", perfil: PerfilUsuario.ADMIN },
  { nome: "Vendedor Teste", login: "vendedor", senha: "vendedor123", perfil: PerfilUsuario.VENDEDOR },
  { nome: "Caixa Teste", login: "caixa", senha: "caixa123", perfil: PerfilUsuario.CAIXA },
  { nome: "Estoque Teste", login: "estoque", senha: "estoque123", perfil: PerfilUsuario.ESTOQUE },
  { nome: "Montador Teste", login: "montador", senha: "montador123", perfil: PerfilUsuario.MONTADOR },
];

async function seedUsers(): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepository = AppDataSource.getRepository(User);

    for (const u of USERS) {
      const existing = await userRepository.findOne({ where: { login: u.login } });
      if (existing) {
        logger.info({ login: u.login }, "Usuário já existe, pulando");
        continue;
      }

      const user = new User();
      user.nome = u.nome;
      user.login = u.login;
      user.senhaHash = await hashPassword(u.senha);
      user.perfil = u.perfil;
      user.ativo = true;

      await userRepository.save(user);
      logger.info({ login: u.login, perfil: u.perfil }, "✅ Usuário criado");
    }
  } catch (error) {
    logger.error({ error: (error as Error).message }, "Seed failed");
    throw error;
  }
}

export default seedUsers;
