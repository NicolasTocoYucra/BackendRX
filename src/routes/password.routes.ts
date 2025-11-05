import { Router } from "express";
import { forgotPassword, resetPassword } from "../controllers/password.controller";

const router = Router();

// quedarán como /api/auth/forgot y /api/auth/reset
router.post("/forgot", forgotPassword);
router.post("/reset", resetPassword);

export default router;
