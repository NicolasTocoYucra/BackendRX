import express from "express";
import { verifyToken } from "../middleware/auth";
import {
  applyCreator,
  applyMember,
  listApplicationsByRepo,
  acceptApplication,
  rejectApplication,
} from "../controllers/applicationController";

const router = express.Router();

// Aplicar
router.post("/creator/:repoId", verifyToken, applyCreator);
router.post("/member/:repoId", verifyToken, applyMember);

// Listar aplicaciones de un repo (owner/admin del repo)
router.get("/repo/:repoId", verifyToken, listApplicationsByRepo);

// Decidir
router.put("/:id/accept", verifyToken, acceptApplication);
router.put("/:id/reject", verifyToken, rejectApplication);

export default router;
