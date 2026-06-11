import { Router } from "express";
import { pagar, cancelar } from "../controllers/caixaController";
import { requireRole } from "../middleware/rbac";

/**
 * Rotas de CAIXA sobre pedidos (base: /pedidos).
 * Montadas após o authMiddleware global (req.user já populado) — paths declarados
 * RELATIVOS a /pedidos. Todas exigem perfil caixa ou admin.
 *
 * - POST /pedidos/:id/pagar     → registra pagamento e promove para "pago"
 * - POST /pedidos/:id/cancelar  → cancela o pedido (com estorno de estoque)
 */
const router = Router();

router.post("/:id/pagar", requireRole("caixa", "admin"), pagar);
router.post("/:id/cancelar", requireRole("caixa", "admin"), cancelar);

export default router;
