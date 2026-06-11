import { Router } from "express";
import {
  createPedido,
  getPedidos,
  getPedidoById,
} from "../controllers/pedidoController";
import { requireRole } from "../middleware/rbac";

/**
 * Rotas de Pedidos (base: /pedidos).
 * Montadas após o authMiddleware global (req.user já populado).
 *
 * - POST   /pedidos     → criar pedido (vendedor, admin)
 * - GET    /pedidos     → listar pedidos (qualquer autenticado)
 * - GET    /pedidos/:id → detalhe do pedido (qualquer autenticado)
 */
const router = Router();

router.post("/", requireRole("vendedor", "admin"), createPedido);
router.get("/", getPedidos);
router.get("/:id", getPedidoById);

export default router;
