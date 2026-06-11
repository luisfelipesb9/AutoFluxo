import { Router } from "express";
import {
  postIniciarSeparacao,
  putSepararItem,
  postEnviarMontagem,
  postDevolverCaixa,
} from "../controllers/estoqueController";
import { requireRole } from "../middleware/rbac";

/**
 * Rotas de ESTOQUE / SEPARAÇÃO (paths RELATIVOS, montadas sob a base /pedidos
 * pelo agregador de rotas após o authMiddleware global — req.user populado).
 *
 * Todas exigem perfil estoque/admin:
 *  - POST /pedidos/:id/iniciar-separacao            → pago/devolvido_caixa → em_separacao
 *  - PUT  /pedidos/:id/itens/:item_id/separar       → baixa estoque (lock + recheck)
 *  - POST /pedidos/:id/enviar-montagem              → em_separacao → liberado
 *  - POST /pedidos/:id/devolver-caixa               → → devolvido_caixa
 */
const router = Router();

router.post(
  "/:id/iniciar-separacao",
  requireRole("estoque", "admin"),
  postIniciarSeparacao
);

router.put(
  "/:id/itens/:item_id/separar",
  requireRole("estoque", "admin"),
  putSepararItem
);

router.post(
  "/:id/enviar-montagem",
  requireRole("estoque", "admin"),
  postEnviarMontagem
);

router.post(
  "/:id/devolver-caixa",
  requireRole("estoque", "admin"),
  postDevolverCaixa
);

export default router;
