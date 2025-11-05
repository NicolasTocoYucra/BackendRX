// src/controllers/fileController.ts
import { RequestHandler } from "express";
import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import File from "../models/File";
import { logger } from "../utils/logger";

let gfsBucket: GridFSBucket;
mongoose.connection.once("open", () => {
  gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
  });
});

// POST /api/files/upload/:repoId
export const uploadFile: RequestHandler = async (req, res) => {
  try {
    const file = (req as any).file;
    const userId = (req as any).user?.id;
    const { repoId } = req.params;
    const { title, description, tags, importance, sensitive } = req.body;

  if (!file) { res.status(400).json({ message: "No se subió ningún archivo" }); return; }
  if (!repoId) { res.status(400).json({ message: "Falta repoId en la ruta" }); return; }

    const uploadStream = gfsBucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: {
        repositoryId: new mongoose.Types.ObjectId(repoId),
        uploadedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      },
    });

    const gridFsId: ObjectId = uploadStream.id as ObjectId;

    uploadStream.end(file.buffer);

    uploadStream.on("finish", async () => {
      const stored = await gfsBucket.find({ _id: gridFsId }).toArray();
      if (!stored?.length) {
        return res.status(500).json({ message: "No se pudo recuperar el archivo de GridFS" });
      }

      const doc = await File.create({
        filename: stored[0].filename,
        originalname: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        title: title || file.originalname,
        description,
        tags: typeof tags === "string" ? tags.split(",").map((s: string) => s.trim()) : Array.isArray(tags) ? tags : [],
        importance: Number(importance) || 0,
        sensitive: String(sensitive) === "true",
        repository: repoId,
        uploadedBy: userId,
        storagePath: `gridfs:${gridFsId.toHexString()}`,
      });

      res.status(201).json({ message: "Archivo subido con éxito", file: doc });
      return;
    });

    uploadStream.on("error", (error) => {
      logger.error("Error subiendo a GridFS:", error);
      res.status(500).json({ message: "Error al guardar archivo en GridFS" });
      return;
    });
  } catch (error) {
    logger.error("Error al subir archivo:", error);
    res.status(500).json({ message: "Error al subir el archivo" });
    return;
  }
};

// GET /api/files/repo/:repoId
export const getFilesByRepositoryId: RequestHandler = async (req, res) => {
  try {
    const { repoId } = req.params;
    const files = await File.find({ repository: repoId }).sort({ importance: -1, createdAt: -1 });
    res.status(200).json(files);
    return;
  } catch (error) {
    logger.error("Error al buscar archivos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
    return;
  }
};

// GET /api/files/my
export const getMyFiles: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const files = await File.find({ uploadedBy: userId }).sort({ importance: -1, createdAt: -1 });
    res.status(200).json(files);
    return;
  } catch (error) {
    logger.error("Error al listar mis archivos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
    return;
  }
};

// GET /api/files/:id/download
export const downloadById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
  const doc = await File.findById(id);
  if (!doc) { res.status(404).json({ message: "Archivo no encontrado" }); return; }

    // storagePath: gridfs:<id>
    const storage = doc.storagePath || "";
    if (!storage.startsWith("gridfs:")) {
      res.status(501).json({ message: "Descarga no implementada para este storage" });
      return;
    }
    const gridId = new ObjectId(storage.split(":")[1]);

    res.setHeader("Content-Type", doc.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${doc.originalname}"`);

    const stream = gfsBucket.openDownloadStream(gridId);
    stream.on("error", (err) => {
      logger.error("Error en descarga GridFS:", err);
      res.status(500).end();
      return;
    });
    stream.pipe(res);
  } catch (error) {
    logger.error("Error al descargar:", error);
    res.status(500).json({ message: "Error interno del servidor" });
    return;
  }
};
