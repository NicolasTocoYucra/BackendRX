import express from "express";
import {
  register,
  login,
  verifyCode,
  resendCode,             // 👈 agrega esto
  requestPasswordReset,
  resetPassword,
} from "../controllers/authController";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-code", verifyCode);

// 👇 Nueva ruta para reenviar código 2FA
router.post("/verifyCode/resend", resendCode);


router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
