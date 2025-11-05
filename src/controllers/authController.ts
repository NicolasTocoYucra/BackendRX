// src/controllers/authController.ts
import { Request, Response, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User";
import Repository from "../models/Repository";
import { sendVerificationEmail } from "../utils/sendEmail";
import { logger } from "../utils/logger";
import { env } from "../config/env";
import mongoose from "mongoose";

// Helper: genera código 6 dígitos (2FA)
function generateCode6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: firma JWT app
function signAppJwt(
  payload: Record<string, any>,
  expiresIn: SignOptions["expiresIn"] = "1d",
) {
  return jwt.sign(payload, env.JWT_SECRET as Secret, { expiresIn });
}

/**
 * POST /api/auth/register
 * Crea usuario + repo personal (typeRepo="simple", mode="personal")
 */
export const register: RequestHandler = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ message: "Todos los campos son obligatorios." });
      return;
    }

    // ✅ US-03: contraseña fuerte (≥12, mayúscula, minúscula, número y símbolo)
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{12,}$/;
    if (!strong.test(password)) {
      res.status(422).json({
        message:
          "Contraseña débil: usa ≥12 caracteres, mayúscula, minúscula, número y símbolo.",
      });
      return;
    }

    // Verificar usuario existente
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      res.status(400).json({ message: "El usuario o email ya están en uso." });
      return;
    }

    // Crear usuario
    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashed });
    await newUser.save();

    // Crear repo personal
    const ownerId = newUser._id as mongoose.Types.ObjectId;
    const personalRepo = await Repository.create({
      name: `Repositorio de ${username}`,
      description: "Repositorio personal del usuario",
      typeRepo: "simple",
      mode: "personal",
      privacy: "private",
      owner: ownerId,
      participants: [{ user: ownerId, role: "owner", status: "active" }],
      files: [],
      tags: [],
    });

    newUser.repositories.push(personalRepo._id as mongoose.Types.ObjectId);
    await newUser.save();

    res.status(201).json({
      message: "✅ Usuario registrado exitosamente.",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
      repo: {
        id: personalRepo._id,
        name: personalRepo.name,
      },
    });
    return;
  } catch (err: any) {
    logger.error("❌ Error en register:", err?.message || err);
    console.error("Detalles del error:", err);
    res.status(500).json({
      message: "Error interno del servidor.",
      error: err?.message || "Error desconocido",
    });
    return;
  }
};

/**
 * POST /api/auth/login
 * Primer paso: valida credenciales, genera código 2FA y devuelve loginId temporal.
 */
export const login: RequestHandler = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ message: "Usuario y contraseña son requeridos." });
      return;
    }

    const user = await User.findOne({ username });
    if (!user) {
      res.status(400).json({ message: "Credenciales inválidas." });
      return;
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      res.status(400).json({ message: "Credenciales inválidas." });
      return;
    }

    const code = generateCode6();
    const expires = new Date(Date.now() + env.TWOFA_TTL_MIN * 60 * 1000);

    user.verificationCode = code;
    user.verificationCodeExpires = expires;
    await user.save();

    const loginId = crypto.randomBytes(16).toString("hex");

    logger.info(`Enviando código 2FA a ${user.email}`);
    await sendVerificationEmail(user.email, code);

    res.json({
      loginId,
      twoFA: true,
      message: "Se envió el código de verificación a tu correo.",
      user: { username: user.username, email: user.email },
    });
    return;
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: "Error en el servidor." });
    return;
  }
};

/**
 * POST /api/auth/verify-code
 * Segundo paso: valida código y retorna el JWT final.
 */
export const verifyCode: RequestHandler = async (req, res) => {
  try {
    const { username, code } = req.body;
    if (!username || !code) {
      res.status(400).json({ message: "Datos incompletos." });
      return;
    }

    const user = await User.findOne({ username });
    if (!user) {
      res.status(400).json({ message: "Usuario no encontrado." });
      return;
    }

    if (user.verificationCode !== code) {
      res.status(400).json({ message: "Código inválido." });
      return;
    }

    if (
      user.verificationCodeExpires &&
      user.verificationCodeExpires < new Date()
    ) {
      res.status(400).json({ message: "El código ha expirado." });
      return;
    }

    // OK => genera JWT
    const token = signAppJwt({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    // Limpia 2FA
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
    return;
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: "Error en el servidor." });
    return;
  }
};

/**
 * POST /api/auth/request-reset
 * Envía enlace temporal para restablecer contraseña
 */
export const requestPasswordReset: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "El correo es obligatorio." });
      return;
    }

    const user = await User.findOne({ email });
    // Por seguridad, no revelar si existe o no
    if (!user) {
      res.status(200).json({ ok: true });
      return;
    }

    // Generar token único y fecha de expiración (10 minutos)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await user.save();

    // Enlace de recuperación (usa tu FRONTEND_URL)
    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;

    // Enviar email (puedes mejorar el diseño en sendEmail)
    await sendVerificationEmail(
      user.email,
      `Has solicitado restablecer tu contraseña.\n\nEnlace: ${resetLink}\n\nEste enlace expirará en 10 minutos.`
    );

    res.status(200).json({ ok: true, message: "Se enviaron las instrucciones al correo." });
  } catch (err) {
    console.error("❌ Error en requestPasswordReset:", err);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

/**
 * POST /api/auth/reset-password
 * Restablece la contraseña usando el token recibido
 */
export const resetPassword: RequestHandler = async (req, res) => {
  try {
    const { token, password } = req.body;
    console.log("📩 Datos recibidos:", req.body); // 👈 Añade esto
    if (!token || !password) {
      res.status(400).json({ message: "Datos incompletos." });
      return;
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({ message: "Token inválido o expirado." });
      return;
    }

    // Validar contraseña fuerte
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{12,}$/;
    if (!strong.test(password)) {
      res.status(422).json({
        message: "Contraseña débil: usa ≥12 caracteres, mayúscula, minúscula, número y símbolo.",
      });
      return;
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Contraseña restablecida correctamente." });
  } catch (err) {
    console.error("❌ Error en resetPassword:", err);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

/**
 * POST /api/auth/verifyCode/resend
 * Reenvía un nuevo código de verificación 2FA
 */
// 👇 memoria temporal para control de reenvíos
const resendTracker = new Map<string, { lastSent: number; attempts: number; windowStart: number }>();

export const resendCode: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { username } = req.body as { username?: string };
    const now = Date.now();

    // Evitar filtración: siempre respondemos 200
    if (!username) {
      res.status(200).json({ ok: true });
      return;
    }

    // clave de tracking (por usuario o IP)
    const key = username;
    const entry = resendTracker.get(key) || { lastSent: 0, attempts: 0, windowStart: now };

    const windowMs = Number(env.RESEND_WINDOW_SEC) * 1000;
    const minIntervalMs = Number(env.RESEND_MIN_INTERVAL_SEC) * 1000;
    const maxPerWindow = Number(env.RESEND_MAX_PER_WINDOW);

    // Resetear ventana si expiró
    if (now - entry.windowStart > windowMs) {
      entry.attempts = 0;
      entry.windowStart = now;
    }

    // Validar límites
    if (entry.attempts >= maxPerWindow) {
      res.status(429).json({
        ok: false,
        message: `Has alcanzado el máximo de ${maxPerWindow} reenvíos. Intenta de nuevo en unos minutos.`,
      });
      return;
    }

    if (now - entry.lastSent < minIntervalMs) {
      const wait = Math.ceil((minIntervalMs - (now - entry.lastSent)) / 1000);
      res.status(429).json({
        ok: false,
        message: `Espera ${wait}s antes de reenviar otro código.`,
      });
      return;
    }

    // Actualiza tracker
    entry.attempts++;
    entry.lastSent = now;
    resendTracker.set(key, entry);

    // Buscar usuario
    const user = await User.findOne({ username });
    if (!user) {
      res.status(200).json({ ok: true });
      return;
    }

    // Generar nuevo código
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + env.TWOFA_TTL_MIN * 60 * 1000);
    user.verificationCode = code;
    user.verificationCodeExpires = expires;
    await user.save();

    // Enviar correo
    await sendVerificationEmail(
      user.email,
      `Tu nuevo código de verificación es: ${code}\n\nEste código expirará en ${env.TWOFA_TTL_MIN} minutos.`
    );

    res.status(200).json({
      ok: true,
      message: `Código reenviado correctamente. Válido por ${env.TWOFA_TTL_MIN} minutos.`,
    });
  } catch (err) {
    console.error("❌ Error en resendCode:", err);
    res.status(200).json({ ok: true });
  }
};





