import { Router } from "express";
import {
  listar,
  estoqueCritico,
  buscarPorId,
  criar,
  atualizar,
} from "../controllers/pecaController";
import { requireAdmin, requireRole } from "../middleware/rbac";

const router = Router();

// Leitura liberada para os papéis que precisam consultar peças (ex.: vendedor
// no novo pedido, estoque na separação). Escrita continua restrita ao admin.
const podeConsultar = requireRole(
  "admin",
  "vendedor",
  "caixa",
  "estoque",
  "montador"
);

router.get("/", podeConsultar, listar);
// Declarada ANTES de "/:id" para não ser capturada como parâmetro.
router.get("/estoque-critico", podeConsultar, estoqueCritico);
router.get("/:id", podeConsultar, buscarPorId);
router.post("/", requireAdmin, criar);
router.put("/:id", requireAdmin, atualizar);

export default router;
