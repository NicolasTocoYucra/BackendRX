import { Request, Response } from "express";
import User from "../models/User";
import { logger } from "../utils/logger";

/**
 * 🔹 Listar usuarios públicos (usados en el directorio)
 */
export const listPublicUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, sortBy } = req.query;

    // Filtro base
    const filter: any = { isPublic: true };
    if (search && typeof search === "string") {
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { nombre: { $regex: search, $options: "i" } },
        { apellido: { $regex: search, $options: "i" } },
      ];
    }

    // Ordenamiento dinámico
    const sort: any =
      sortBy === "repos"
        ? { repoCount: -1 }
        : sortBy === "antiguedad"
        ? { createdAt: 1 }
        : sortBy === "reciente"
        ? { createdAt: -1 }
        : { repoCount: -1 };

    const users = await User.find(filter)
      .select("username nombre apellido bio profileImage repoCount hobbies userType isPublic createdAt")
      .sort(sort)
      .limit(30)
      .lean();

    res.status(200).json(users);
  } catch (err) {
    logger.error("Error al listar usuarios:", err);
    res.status(500).json({ error: "Error al listar usuarios" });
  }
};

/**
 * 🔹 Obtener perfil propio (/me)
 */
export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const user = await User.findById(userId).select("-password").lean();

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    res.status(200).json(user);
  } catch (err) {
    logger.error("Error al obtener perfil propio:", err);
    res.status(500).json({ error: "Error al obtener perfil propio" });
  }
};

/**
 * 🔹 Obtener perfil por ID (público o privado)
 */
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-password").lean();

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    res.status(200).json(user);
  } catch (err) {
    logger.error("Error al obtener perfil:", err);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
};

/**
 * 🔹 Actualizar perfil (solo el dueño del perfil)
 */
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const requesterId = (req as any).user.id;
    if (requesterId !== req.params.id) {
      res.status(403).json({ error: "No autorizado para actualizar este perfil" });
      return;
    }

    const payload = {
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      bio: req.body.bio,
      isPublic: req.body.isPublic,
      hobbies: req.body.hobbies,
      profileStyles: req.body.profileStyles,
      student: req.body.student,
      researcher: req.body.researcher,
      businessAdmin: req.body.businessAdmin,
      academic: req.body.academic,
      // compat
      institucion: req.body.institucion,
      ciudad: req.body.ciudad,
      contacto: req.body.contacto,
    };

    const updated = await User.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true }).select("-password");

    if (!updated) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    res.status(200).json(updated);
  } catch (err) {
    logger.error("Error al actualizar perfil:", err);
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
};
