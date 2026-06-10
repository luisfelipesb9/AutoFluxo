import { Router } from "express";
import authRouter from "./auth";
import docsRouter from "./docs";
import usuariosRouter from "./usuarios";
import pecasRouter from "./pecas";
import clientesRouter from "./clientes";
import pedidosRouter from "./pedidos";
import caixaRouter from "./caixa";
import estoqueRouter from "./estoque";
import montagemRouter from "./montagem";
import { getRoot } from "../controllers/rootController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Public docs
router.use("/docs", docsRouter);

// Public auth routes
router.use("/auth", authRouter);

// Protect all other routes
router.use(authMiddleware);

router.get("/", getRoot);

// Cadastros (admin)
router.use("/usuarios", usuariosRouter);
router.use("/pecas", pecasRouter);
router.use("/clientes", clientesRouter);

// Fluxo de pedido — todos sob /pedidos (routers compõem aditivamente,
// tuplas método+rota são disjuntas).
router.use("/pedidos", pedidosRouter);
router.use("/pedidos", caixaRouter);
router.use("/pedidos", estoqueRouter);
router.use("/pedidos", montagemRouter);

export default router;
