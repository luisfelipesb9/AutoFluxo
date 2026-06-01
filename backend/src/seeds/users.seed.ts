import { AppDataSource } from "../lib/database";
import { User } from "../entities/User";
import { hashPassword } from "../services/userService";
import logger from "../lib/logger";

async function seedUsers(): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepository = AppDataSource.getRepository(User);

    // Check if admin already exists
    const existingAdmin = await userRepository.findOne({
      where: { login: "admin" },
    });

    if (existingAdmin) {
      logger.info("Admin user already exists, skipping seed");
      return;
    }

    // Create admin user
    const adminUser = new User();
    adminUser.nome = "Administrador";
    adminUser.login = "admin";
    adminUser.senhaHash = await hashPassword("admin123");
    adminUser.perfil = "ADMIN";
    adminUser.ativo = true;

    await userRepository.save(adminUser);
    logger.info("✅ Admin user created");

    // Create test user
    const testUser = new User();
    testUser.nome = "Usuário Teste";
    testUser.login = "user";
    testUser.senhaHash = await hashPassword("user123");
    testUser.perfil = "USER";
    testUser.ativo = true;

    await userRepository.save(testUser);
    logger.info("✅ Test user created");
  } catch (error) {
    logger.error({ error: (error as Error).message }, "Seed failed");
    throw error;
  }
}

export default seedUsers;
