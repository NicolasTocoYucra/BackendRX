import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  id: string;
  email: string;
  role?: string; // opcional, por si lo agregas después
}

// Extiende la Request para incluir 'user'
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verifica el JWT y agrega req.user
 */
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers["authorization"];
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({ message: "Token requerido (Bearer <token>)" });
      return;
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ message: "Token expirado" });
      return;
    }
    res.status(403).json({ message: "Token inválido" });
  }
};
export const requireRole = (...rolesPermitidos: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      res.status(403).json({ message: "Usuario no autenticado o sin rol asignado" });
      return;
    }
    if (!rolesPermitidos.includes(req.user.role)) {
      res.status(403).json({ message: "No tienes permisos suficientes" });
      return;
    }
    next();
  };
};