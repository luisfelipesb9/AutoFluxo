import { Router } from "express";
import { requireAdmin } from "../middleware/rbac";
import {
  vendas,
  pecasMaisVendidas,
  estoqueCritico,
  historicoCliente,
  pedidosStatus,
  performance,
} from "../controllers/relatorioController";

const router = Router();

// Todos os relatórios são exclusivos do ADMIN.
router.use(requireAdmin);

router.get("/vendas", vendas);
router.get("/pecas-mais-vendidas", pecasMaisVendidas);
router.get("/estoque-critico", estoqueCritico);
router.get("/historico-cliente", historicoCliente);
router.get("/pedidos-status", pedidosStatus);
router.get("/performance", performance);

export default router;
