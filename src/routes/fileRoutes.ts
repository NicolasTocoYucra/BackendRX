import express from "express";
import multer from "multer";
import { verifyToken } from "../middleware/auth";
import {
  uploadFile,
  getFilesByRepositoryId,
  getMyFiles,
  downloadById,
} from "../controllers/fileController";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Subir archivo a un repo
router.post("/upload/:repoId", verifyToken, upload.single("file"), uploadFile);

// Mis archivos (inicio)
router.get("/my", verifyToken, getMyFiles);

// Archivos por repo (metadatos en Mongo)
router.get("/repo/:repoId", verifyToken, getFilesByRepositoryId);

// Descargar por id (GridFS)
router.get("/:id/download", verifyToken, downloadById);

export default router;
