import { Router } from "express";
import {
  postIniciarMontagem,
  postConcluir,
} from "../controllers/montagemController";
import { requireRole } from "../middleware/rbac";

/**
 * Rotas de MONTAGEM (base: /pedidos).
 * Montadas pela Wave 3 após o authMiddleware global (req.user já populado).
 * Acesso restrito a montador/admin.
 *
 * - POST /pedidos/:id/iniciar-montagem → liberado    → em_montagem
 * - POST /pedidos/:id/concluir         → em_montagem → concluido
 */
const router = Router();

router.post(
  "/:id/iniciar-montagem",
  requireRole("montador", "admin"),
  postIniciarMontagem
);

router.post("/:id/concluir", requireRole("montador", "admin"), postConcluir);

export default router;
