import { Router } from "express";
import authRouter from "./auth";
import docsRouter from "./docs";
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

export default router;
