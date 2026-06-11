import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => process.env.NODE_ENV === "test",
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 requisições por IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => process.env.NODE_ENV === "test",
});

// Endpoint sensível: cada busca gera/executa SQL dinâmico via OpenAI (caro e
// potencialmente custoso no banco). Limite dedicado, mais restrito que o geral.
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 buscas por IP
  message: "Muitas buscas em sequência. Aguarde um momento.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => process.env.NODE_ENV === "test",
});
