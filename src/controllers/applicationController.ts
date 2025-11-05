// src/controllers/applicationController.ts
import { Request, Response } from "express";
import Application from "../models/Application";
import Repository from "../models/Repository";
import Notification from "../models/Notification";
import mongoose from "mongoose";
import { logger } from "../utils/logger";

// POST /api/applications/creator/:repoId
export const applyCreator = async (req: Request, res: Response): Promise<void> => {
  try {
    const repoId = req.params.repoId;
    const applicantId = new mongoose.Types.ObjectId((req as any).user.id);
    const { creatorType, aporte, motivacion, tipoAporte, disponibilidadHoras, urlPortafolio } = req.body;

    const repo = await Repository.findById(repoId);
    if (!repo || repo.typeRepo !== "creator") {
      res.status(400).json({ message: "Repositorio no válido para esta acción" });
      return;
    }

    const app = await Application.create({
      kind: "creator",
      repo: repo._id,
      applicant: applicantId,
      creatorType,
      aporte,
      motivacion,
      tipoAporte,
      disponibilidadHoras,
      urlPortafolio,
    });

    // Notifica al owner
    await Notification.create({
      user: repo.owner,
      type: "creator_new_application",
      title: "Nueva aplicación como Creador",
      repo: repo._id,
      application: app._id,
      actor: applicantId,
    });

    res.status(201).json({ message: "Aplicación enviada", application: app });
    return;
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: "Error al aplicar" });
    return;
  }
};

// POST /api/applications/member/:repoId
export const applyMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const repoId = req.params.repoId;
    const applicantId = new mongoose.Types.ObjectId((req as any).user.id);
    const { plan, aportePersonal = [], amount } = req.body;

    const repo = await Repository.findById(repoId);
    if (!repo || repo.typeRepo !== "creator") {
      res.status(400).json({ message: "Repositorio no válido para esta acción" });
      return;
    }

    const app = await Application.create({
      kind: "member",
      repo: repo._id,
      applicant: applicantId,
      plan,
      aportePersonal,
      amount,
    });

    // Notifica al owner (o auto-acepta si plan = cobre y hay cupo? lo decides luego)
    await Notification.create({
      user: repo.owner,
      type: "creator_new_application",
      title: "Nueva aplicación como Miembro",
      repo: repo._id,
      application: app._id,
      actor: applicantId,
    });

    res.status(201).json({ message: "Aplicación enviada", application: app });
    return;
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: "Error al aplicar" });
    return;
  }
};

// GET /api/applications/repo/:repoId
export const listApplicationsByRepo = async (req: Request, res: Response): Promise<void> => {
  try {
    const repoId = req.params.repoId;
    const apps = await Application.find({ repo: repoId })
      .sort({ createdAt: -1 })
      .populate("applicant", "username email");
    res.status(200).json(apps);
    return;
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: "Error al listar aplicaciones" });
    return;
  }
};

// PUT /api/applications/:id/accept
export const acceptApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const approverId = new mongoose.Types.ObjectId((req as any).user.id);

    const app = await Application.findById(id);
    if (!app) {
      res.status(404).json({ message: "Aplicación no encontrada" });
      return;
    }

    const repo = await Repository.findById(app.repo);
    if (!repo) {
      res.status(404).json({ message: "Repositorio no encontrado" });
      return;
    }
    if (!repo.owner.equals(approverId)) {
      res.status(403).json({ message: "No autorizado" });
      return;
    }

    app.status = "accepted";
    app.decidedBy = approverId;
    app.decidedAt = new Date();
    await app.save();

    // Agrega al repo con rol según tipo
    const role = app.kind === "creator" ? "creator" : "member";
    const exists = repo.participants.some((p: any) => (p.user as any).equals(app.applicant));
    if (!exists) {
      repo.participants.push({ user: app.applicant, role, status: "active" } as any);
      await repo.save();
    }

    // Notifica al solicitante
    await Notification.create({
      user: app.applicant,
      type: app.kind === "creator" ? "creator_creator_accepted" : "creator_member_joined",
      title: app.kind === "creator" ? "Fuiste aceptado como Creador" : "Unido como Miembro",
      repo: repo._id,
      application: app._id,
      actor: approverId,
    });

    res.status(200).json({ message: "Aplicación aceptada" });
    return;
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: "Error al aceptar" });
    return;
  }
};

// PUT /api/applications/:id/reject
export const rejectApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const approverId = new mongoose.Types.ObjectId((req as any).user.id);

    const app = await Application.findById(id);
    if (!app) {
      res.status(404).json({ message: "Aplicación no encontrada" });
      return;
    }

    const repo = await Repository.findById(app.repo);
    if (!repo) {
      res.status(404).json({ message: "Repositorio no encontrado" });
      return;
    }
    if (!repo.owner.equals(approverId)) {
      res.status(403).json({ message: "No autorizado" });
      return;
    }

    app.status = "rejected";
    app.decidedBy = approverId;
    app.decidedAt = new Date();
    await app.save();

    res.status(200).json({ message: "Aplicación rechazada" });
    return;
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: "Error al rechazar" });
    return;
  }
};
