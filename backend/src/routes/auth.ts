import { Router } from "express";
import { login, logout } from "../controllers/authController";
import { loginLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/login", loginLimiter, login);
router.post("/logout", logout);

export default router;
