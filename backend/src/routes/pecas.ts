import { Router } from "express";
import {
  listar,
  estoqueCritico,
  buscarPorId,
  criar,
  atualizar,
} from "../controllers/pecaController";
import { requireAdmin } from "../middleware/rbac";

const router = Router();

router.get("/", requireAdmin, listar);
// Declarada ANTES de "/:id" para não ser capturada como parâmetro.
router.get("/estoque-critico", requireAdmin, estoqueCritico);
router.get("/:id", requireAdmin, buscarPorId);
router.post("/", requireAdmin, criar);
router.put("/:id", requireAdmin, atualizar);

export default router;
