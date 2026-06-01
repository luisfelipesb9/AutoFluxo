import seedUsers from "./users.seed";
import logger from "../lib/logger";

async function runSeeds(): Promise<void> {
  try {
    logger.info("Starting seed execution...");
    await seedUsers();
    logger.info("✅ All seeds completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Seed execution failed");
    process.exit(1);
  }
}

runSeeds();
