// src/controllers/repositoryController.ts
import { Request, Response } from "express";
import Repository from "../models/Repository";
import User from "../models/User";
import { logger } from "../utils/logger";
import mongoose from "mongoose";

// POST /api/repositorios
export const createRepository = async (req: Request, res: Response) => {
  try {
    const ownerId = new mongoose.Types.ObjectId((req as any).user.id);
    const {
      name,
      description,
      typeRepo,          // "simple" | "creator"
      mode,              // solo "simple": "personal" | "grupal"
      privacy,           // solo "simple": "public" | "private"
      interestAreas,     // solo "creator"
      geoAreas,          // solo "creator"
      sectors,           // solo "creator"
      tags = [],
      memberEmails = [],
      isRxUno = false,
    } = req.body;

    if (!name || !typeRepo) {
      res.status(400).json({ message: "El nombre y tipoRepo son obligatorios" });
      return;
    }

    // Mapea miembros por email → ids
    const memberIds: mongoose.Types.ObjectId[] = [];
    if (Array.isArray(memberEmails) && memberEmails.length) {
      const users = await User.find({ email: { $in: memberEmails } }, { _id: 1 });
      if (users.length !== memberEmails.length) {
          res.status(400).json({ message: "Uno o más correos no están registrados" });
          return;
        }
      users.forEach((u) => memberIds.push(u._id as mongoose.Types.ObjectId));
    }

    // Participantes: owner + invitados activos (writer/viewer por defecto viewer)
    const participants: any[] = [{ user: ownerId, role: "owner", status: "active" }];
    memberIds.forEach((id) => {
      if (!id.equals(ownerId)) participants.push({ user: id, role: typeRepo === "creator" ? "member" : "viewer", status: "active" });
    });

    const repo = await Repository.create({
      name,
      description,
      typeRepo,
      mode: typeRepo === "simple" ? mode || "grupal" : undefined,
      privacy: typeRepo === "simple" ? privacy || "public" : "public",
      interestAreas: typeRepo === "creator" ? interestAreas || [] : [],
      geoAreas: typeRepo === "creator" ? geoAreas || [] : [],
      sectors: typeRepo === "creator" ? sectors || [] : [],
      tags,
      owner: ownerId,
      participants,
      files: [],
      isRxUno: !!isRxUno,
      featured: !!isRxUno,
      featuredWeight: isRxUno ? 100 : 0,
    });

    res.status(201).json({ message: "Repositorio creado con éxito", repository: repo });
    return;
  } catch (error) {
    logger.error("Error al crear repositorio:", error);
    res.status(500).json({ message: "Error interno del servidor" });
    return;
  }
};

// GET /api/repositorios/mine
export const getMyRepositories = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Repos donde el usuario es propietario
    const ownerRepos = await Repository.find({ owner: userId })
      .populate("owner", "username email")
      .lean();

    // Repos donde participa pero no es dueño
    const memberRepos = await Repository.find({
      "participants.user": userId,
      owner: { $ne: userId },
    })
      .populate("owner", "username email")
      .lean();

    const totalRepos = ownerRepos.length + memberRepos.length;
    const totalFiles = [
      ...ownerRepos.map((r) => r.files?.length || 0),
      ...memberRepos.map((r) => r.files?.length || 0),
    ].reduce((a, b) => a + b, 0);

    res.json({
      ownerRepos,
      memberRepos,
      totals: {
        total: totalRepos,
        owner: ownerRepos.length,
        member: memberRepos.length,
        files: totalFiles,
      },
    });
  } catch (err) {
    console.error("❌ Error obteniendo repos:", err);
    res.status(500).json({ message: "Error al obtener repositorios" });
  }
};

// GET /api/repositorios/public
export const getPublicRepositories = async (_req: Request, res: Response) => {
  try {
    const publicRepos = await Repository.find({
      $or: [
        { typeRepo: "simple", privacy: "public" },
        { typeRepo: "creator" }, // vitrina
      ],
    })
      .sort({ isRxUno: -1, featuredWeight: -1, createdAt: -1 })
      .populate("owner", "username email")
      .lean();

    res.status(200).json(publicRepos);
    return;
  } catch (error) {
    logger.error("Error al obtener repos públicos:", error);
    res.status(500).json({ message: "Error al obtener repositorios públicos" });
    return;
  }
};

// GET /api/repositorios/:id/files (si quieres por GridFS directo) — opcional
export const getFilesByRepository = async (req: Request, res: Response) => {
  try {
    const repoId = req.params.id;
    const db = mongoose.connection.db;
    const files = await db
      .collection("uploads.files")
      .find({ "metadata.repositoryId": new mongoose.Types.ObjectId(repoId) })
      .toArray();

    res.status(200).json(files);
    return;
  } catch (error) {
    logger.error("Error al obtener archivos por repositorio:", error);
    res.status(500).json({ message: "Error al obtener archivos" });
    return;
  }
};
//Get /api/repositorios/:id
export const getRepositoryById = async (req: Request, res: Response) => {
  try {
    const repoId = req.params.id;
    const repo = await Repository.findById(repoId)
      .populate("owner", "username email")
      .lean();

    if (!repo) {
      res.status(404).json({ message: "Repositorio no encontrado" });
      return;
    }

    res.status(200).json(repo);
  } catch (error) {
    logger.error("Error al obtener repositorio:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// DELETE /api/repositorios/:id
export const deleteRepository = async (req: Request, res: Response) => {
  try {
    const repoId = req.params.id;
    const userId = (req as any).user.id;

    const repo = await Repository.findById(repoId);
    if (!repo) {
      res.status(404).json({ message: "Repositorio no encontrado" });
      return;
    }

    if (repo.owner.toString() !== userId) {
      res.status(403).json({ message: "No tienes permisos para eliminarlo" });
      return;
    }

    await Repository.findByIdAndDelete(repoId);
    res.status(200).json({ message: "Repositorio eliminado correctamente" });
    return;
  } catch (error) {
    logger.error("Error al eliminar repositorio:", error);
    res.status(500).json({ message: "Error interno del servidor" });
    return;
  }
};
