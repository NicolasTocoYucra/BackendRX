// src/controllers/notificationController.ts
import { Request, Response } from "express";
import Notification from "../models/Notification";
import { logger } from "../utils/logger";

export const listNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const items = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("actor", "username email")
      .populate("repo", "name typeRepo");
    res.status(200).json(items);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: "Error al listar notificaciones" });
  }
};


export const getNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const n = await Notification.findById(req.params.id);
    if (!n) {
      res.status(404).json({ message: "No encontrada" });
      return;
    }
    res.status(200).json(n);
    return;
  } catch (err) {
    res.status(500).json({ message: "Error al obtener notificación" });
    return;
  }
};

export const markSeen = async (req: Request, res: Response): Promise<void> => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { seen: true });
    res.status(200).json({ ok: true });
    return;
  } catch (err) {
    res.status(500).json({ message: "Error al marcar vista" });
    return;
  }
};
