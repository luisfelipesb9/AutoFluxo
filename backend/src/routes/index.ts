import { Router } from "express";
import authRouter from "./auth";
import { getRoot } from "../controllers/rootController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use("/auth", authRouter);
router.use(authMiddleware);

router.get("/", getRoot);

export default router;
