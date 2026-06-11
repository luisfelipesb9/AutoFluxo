import { Router } from "express";
import {
  list,
  getById,
  create,
  update,
  resetSenha,
  remove,
} from "../controllers/usuarioController";
import { requireAdmin } from "../middleware/rbac";

/**
 * Rotas do CRUD administrativo de usuários.
 *
 * Montado (em Wave 3) APÓS o authMiddleware global, portanto `req.user` já
 * está populado. Toda rota exige perfil `admin` (`requireAdmin`).
 */
const router = Router();

router.get("/", requireAdmin, list);
router.get("/:id", requireAdmin, getById);
router.post("/", requireAdmin, create);
router.put("/:id", requireAdmin, update);
router.put("/:id/reset-senha", requireAdmin, resetSenha);
router.delete("/:id", requireAdmin, remove);

export default router;
