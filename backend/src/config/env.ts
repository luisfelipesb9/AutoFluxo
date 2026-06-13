import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  // Quando "true", o app assume que está atrás de TLS (nginx termina o HTTPS):
  // ativa HSTS e o redirect de fallback http→https. Default false (dev/teste).
  // Transform string→bool: só "true" vira true (z.coerce.boolean trataria "false" como true).
  HTTPS: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter no mínimo 32 caracteres"),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  OPENAI_API_KEY: z.string().optional(),
  DB_READONLY_PASSWORD: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const validateEnv = (): EnvConfig => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Erro ao validar variáveis de ambiente:");
    result.error.issues.forEach((error) => {
      console.error(`  - ${error.path.join(".")}: ${error.message}`);
    });
    process.exit(1);
  }

  return result.data;
};
