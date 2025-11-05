import express from "express";
import { verifyToken } from "../middleware/auth";
import {
  inviteToSimpleRepo,
  acceptInvitation,
} from "../controllers/invitationController";

const router = express.Router();

// Invitar a un repo simple (owner)
router.post("/:id/invite", verifyToken, inviteToSimpleRepo);

// Aceptar invitación con token
router.post("/accept", verifyToken, acceptInvitation);

export default router;
