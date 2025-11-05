import type { RequestHandler } from "express";
import User from "../models/User";
import ResendLog from "../models/ResendLog";

const WINDOW_SEC = Number(process.env.RESEND_WINDOW_SEC || 600);
const MAX_PER_WINDOW = Number(process.env.RESEND_MAX_PER_WINDOW || 3);
const MIN_INTERVAL_SEC = Number(process.env.RESEND_MIN_INTERVAL_SEC || 60);

export const rateLimitResend: RequestHandler = async (req, res, next) => {
  try {
    const username = String(req.body?.username || "").trim();
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (req.socket?.remoteAddress as string) ||
      req.ip ||
      "";

    const user = username ? await User.findOne({ username }) : null;
    const userId = user?._id;

    const now = Date.now();
    const windowStart = new Date(now - WINDOW_SEC * 1000);

    // Filtro por ventana: por user si existe, si no por IP
    const filter: any = { createdAt: { $gte: windowStart } };
    if (userId) filter.userId = userId;
    else filter.ip = ip;

    // Límite por ventana
    const recentCount = await ResendLog.countDocuments(filter);
    if (recentCount >= MAX_PER_WINDOW) {
      const oldest = await ResendLog.find(filter).sort({ createdAt: 1 }).limit(1);
      const oldestTs = oldest[0]?.createdAt?.getTime() || now;
      const retryAfter = Math.max(0, WINDOW_SEC - Math.floor((now - oldestTs) / 1000));
      res.status(429).json({ ok: false, msg: `Has alcanzado el límite.`, retryAfter });
      return;
    }

    // Intervalo mínimo entre reenvíos
    const last = await ResendLog.find(filter).sort({ createdAt: -1 }).limit(1);
    const lastTs = last[0]?.createdAt?.getTime();
    if (lastTs && now - lastTs < MIN_INTERVAL_SEC * 1000) {
      const retryAfter = MIN_INTERVAL_SEC - Math.floor((now - lastTs) / 1000);
      res.status(429).json({ ok: false, msg: `Espera ${retryAfter}s para reenviar nuevamente.`, retryAfter });
      return;
    }

    // Registrar este intento de reenvío (pase o no el envío de mail)
    await ResendLog.create({ userId, ip });
    next();
  } catch (e) {
    console.error("rateLimitResend error:", e);
    // Ante error, no bloquear (pero logueamos)
    next();
  }
};
