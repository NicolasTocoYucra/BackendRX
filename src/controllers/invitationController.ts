import { Request, Response } from "express";
import mongoose from "mongoose";
import Invitation from "../models/Invitation";
import Repository from "../models/Repository";
import User from "../models/User";
import Notification from "../models/Notification";
import { logger } from "../utils/logger";

/**
 * POST /api/invitaciones/:id/invite
 * Invita a un usuario a un repositorio simple.
 */
export const inviteToSimpleRepo = async (req: Request, res: Response) => {
  try {
    const repoId = req.params.id;
    const { email, role } = req.body;
    const inviterId = new mongoose.Types.ObjectId((req as any).user.id);

    const repo = await Repository.findById(repoId);
    if (!repo || repo.typeRepo !== "simple") {
      res.status(400).json({ message: "Repositorio no válido" });
      return;
    }

    if (!repo.owner.equals(inviterId)) {
      res.status(403).json({ message: "Solo el propietario puede invitar." });
      return;
    }

    const invited = await User.findOne({ email });
    if (!invited) {
      res.status(404).json({ message: "El usuario no existe en la plataforma." });
      return;
    }

    // Evitar duplicados
    const existing = await Invitation.findOne({
      repo: repo._id,
      invitedUser: invited._id,
      status: "pending",
    });
    if (existing) {
      res.status(400).json({ message: "Ya existe una invitación pendiente para este usuario." });
      return;
    }

    // Crear invitación
    const token = new mongoose.Types.ObjectId().toHexString();
    const invitation = await Invitation.create({
      repo: repo._id,
      invitedUser: invited._id,
      invitedBy: inviterId,
      role,
      token,
      status: "pending",
    });

    // 🔔 Crear notificación para el usuario invitado
    await Notification.create({
      user: invited._id,
      type: "simple_invite",
      title: `Invitación a ${repo.name}`,
      message: `Has sido invitado por ${(req as any).user.username || "un usuario"} al repositorio "${repo.name}".`,
      actor: inviterId,
      repo: repo._id,
      payload: { invitationToken: token },
    });

    res.status(201).json({
      message: "Invitación enviada correctamente.",
      invitation,
    });
    return;
  } catch (err) {
    logger.error("Error en inviteToSimpleRepo:", err);
    res.status(500).json({ message: "Error interno al crear invitación" });
    return;
  }
};

/**
 * POST /api/invitaciones/accept
 * Acepta una invitación usando el token.
 */
export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const userId = new mongoose.Types.ObjectId((req as any).user.id);

    const invitation = await Invitation.findOne({ token, invitedUser: userId, status: "pending" });
    if (!invitation) {
      res.status(400).json({ message: "Invitación inválida o ya respondida." });
      return;
    }

    const repo = await Repository.findById(invitation.repo);
    if (!repo) {
      res.status(404).json({ message: "Repositorio no encontrado." });
      return;
    }

    // Añadir participante si no existe
    const alreadyMember = repo.participants.some((p: any) =>
      (p.user as any).equals(userId)
    );
    if (!alreadyMember) {
      repo.participants.push({
        user: userId,
        role: invitation.role,
        status: "active",
      } as any);
      await repo.save();
    }

    // Actualizar estado de la invitación
    invitation.status = "accepted";
    await invitation.save();

    // 🔔 Crear notificación para el owner
    await Notification.create({
      user: repo.owner,
      type: "simple_join_accepted",
      title: "Invitación aceptada",
      message: `El usuario ${(req as any).user.username || "alguien"} ha aceptado tu invitación al repositorio "${repo.name}".`,
      actor: userId,
      repo: repo._id,
    });

    res.status(200).json({ message: "Invitación aceptada correctamente." });
    return;
  } catch (err) {
    logger.error("Error en acceptInvitation:", err);
    res.status(500).json({ message: "Error interno al aceptar invitación" });
    return;
  }
};
