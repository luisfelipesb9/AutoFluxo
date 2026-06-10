import { Router } from "express";
import {
  getClientes,
  getClienteById,
  postCliente,
  putCliente,
  postVeiculo,
} from "../controllers/clienteController";
import { requireAdmin } from "../middleware/rbac";

const router = Router();

router.get("/", requireAdmin, getClientes);
router.get("/:id", requireAdmin, getClienteById);
router.post("/", requireAdmin, postCliente);
router.put("/:id", requireAdmin, putCliente);
router.post("/:id/veiculos", requireAdmin, postVeiculo);

export default router;
