import { Router } from "express";
import { listLogs } from "../controllers/adminLogController";
import { requireAdmin } from "../middleware/rbac";

const router = Router();

// Consulta de logs de auditoria — exclusivo do ADMIN.
router.get("/logs", requireAdmin, listLogs);

export default router;
