import { Router } from "express";
import { requireAdmin } from "../middleware/rbac";
import { buscarNl } from "../controllers/searchController";

const router = Router();

// Busca em linguagem natural (NL → SQL) — exclusivo do ADMIN.
router.post("/nl", requireAdmin, buscarNl);

export default router;
