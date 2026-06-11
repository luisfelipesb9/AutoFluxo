import { Router } from "express";
import {
  getClientes,
  getClienteById,
  postCliente,
  putCliente,
  postVeiculo,
} from "../controllers/clienteController";
import { requireAdmin, requireRole } from "../middleware/rbac";

const router = Router();

// Leitura liberada para os papéis que precisam consultar clientes (ex.: vendedor
// no novo pedido). Escrita (cadastro) continua restrita ao admin.
const podeConsultar = requireRole(
  "admin",
  "vendedor",
  "caixa",
  "estoque",
  "montador"
);

router.get("/", podeConsultar, getClientes);
router.get("/:id", podeConsultar, getClienteById);
router.post("/", requireAdmin, postCliente);
router.put("/:id", requireAdmin, putCliente);
router.post("/:id/veiculos", requireAdmin, postVeiculo);

export default router;
