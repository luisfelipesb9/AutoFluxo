import { Router } from "express";
import { requireAdmin } from "../middleware/rbac";
import { searchLimiter } from "../middleware/rateLimiter";
import { buscarNl } from "../controllers/searchController";

const router = Router();

// Busca em linguagem natural (NL → SQL) — exclusivo do ADMIN, com rate-limit
// dedicado (endpoint sensível: gera/executa SQL via OpenAI).
router.post("/nl", searchLimiter, requireAdmin, buscarNl);

export default router;
