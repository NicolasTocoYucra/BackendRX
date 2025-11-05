/* eslint-disable prettier/prettier */
// src/app.ts
import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { logger } from "./utils/logger";
import { corsOptions } from "./config/cors";

// Rutas
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import fileRoutes from "./routes/fileRoutes";
import repositoryRoutes from "./routes/repositoryRoutes";
import invitationRoutes from "./routes/invitationRoutes";
import notificationRoutes from "./routes/notificationRoutes";

const app = express();

// 🛡️ Seguridad y parsers
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// 🧾 Logs HTTP
app.use(
  morgan("combined", {
    stream: { write: (msg: string) => logger.http(msg.trim()) },
  })
);

// 🩺 Healthcheck
app.get("/healthz", (_req: any, res: any) => res.status(200).json({ ok: true }));

// 🚏 Rutas principales
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/repositorios", repositoryRoutes);
app.use("/api/invitaciones", invitationRoutes);
app.use("/api/notificaciones", notificationRoutes);

// 🚫 404 — Ruta no encontrada
app.use((_req: any, res: any) => {
  res.status(404).json({ error: "Not Found" });
});

// ⚠️ Manejador global de errores
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("❌ Error interno:", err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal Server Error",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export default app;
