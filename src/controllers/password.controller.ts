import type { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import PasswordReset from "../models/PasswordReset";
import { generateRawToken, sha256 } from "../utils/token";
import { sendPasswordResetEmail } from "../services/mailer";

const TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MIN || 20);

export const forgotPassword: RequestHandler = async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase().trim();
  if (!email) { res.status(200).json({ ok: true }); return; }

  const user = await User.findOne({ email });
  if (!user) { res.status(200).json({ ok: true }); return; }

  const raw = generateRawToken(32);
  const tokenHash = sha256(raw);
  const expiresAt = new Date(Date.now() + TTL_MIN * 60 * 1000);

  await PasswordReset.deleteMany({ userId: user._id });
  await PasswordReset.create({ userId: user._id, tokenHash, expiresAt });

  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetUrl = `${frontend}/account/reset-password?token=${raw}`; // ⬅️ ruta FE consistente

  try { await sendPasswordResetEmail(user.email, resetUrl); }
  catch (e) { console.error("Error enviando email:", e); }

  res.status(200).json({ ok: true }); return;
};

export const resetPassword: RequestHandler = async (req, res) => {
  const token = String(req.body?.token || "");
  const newPassword = String(req.body?.newPassword || "");
  if (!token || !newPassword) { res.status(400).json({ ok:false, msg:"Datos incompletos" }); return; }

  const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{12,}$/;
  if (!strong.test(newPassword)) {
    res.status(422).json({ ok:false, msg:"Contraseña débil (≥12, mayús/minús, número, símbolo)" }); return;
  }

  const tokenHash = sha256(token);
  const pr = await PasswordReset.findOne({ tokenHash, usedAt: { $exists: false } });
  if (!pr) { res.status(400).json({ ok:false, msg:"Token inválido" }); return; }
  if (pr.expiresAt.getTime() < Date.now()) { res.status(400).json({ ok:false, msg:"Token expirado" }); return; }

  const user = await User.findById(pr.userId);
  if (!user) { res.status(404).json({ ok:false, msg:"Usuario no encontrado" }); return; }

  user.password = await bcrypt.hash(newPassword, 12); // ⬅️ tu esquema usa "password"
  await user.save();

  pr.usedAt = new Date();
  await pr.save();

  res.json({ ok:true, msg:"Contraseña actualizada" }); return;
};
