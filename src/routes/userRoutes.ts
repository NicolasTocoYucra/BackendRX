import express from "express";
import { verifyToken } from "../middleware/auth";
import {
  listPublicUsers,
  getMyProfile,
  getUserProfile,
  updateUserProfile,
} from "../controllers/userController";

const router = express.Router();

// 🔹 Perfil propio (autenticado)
router.get("/me", verifyToken, getMyProfile);

// 🔹 Listar usuarios públicos
router.get("/", listPublicUsers);

// 🔹 Obtener perfil por ID (respeta privacidad en frontend)
router.get("/:id", getUserProfile);

// 🔹 Actualizar perfil (solo dueño)
router.put("/:id", verifyToken, updateUserProfile);

export default router;
