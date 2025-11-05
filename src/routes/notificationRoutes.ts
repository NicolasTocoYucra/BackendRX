import express from "express";
import { verifyToken } from "../middleware/auth";
import {
  listNotifications,
  getNotification,
  markSeen,
} from "../controllers/notificationController";

const router = express.Router();

router.get("/", verifyToken, listNotifications);
router.get("/:id", verifyToken, getNotification);
router.put("/:id/seen", verifyToken, markSeen);

export default router;
