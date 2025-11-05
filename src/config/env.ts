// src/config/env.ts
import dotenv from "dotenv";
dotenv.config();

const required = (name: string, fallback?: string): string => {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var: ${name}`);
  return v as string;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 5000),

  MONGO_URI: required("MONGO_URI"),
  JWT_SECRET: required("JWT_SECRET"),

  EMAIL_USER: required("EMAIL_USER"),
  EMAIL_PASS: required("EMAIL_PASS"),

  FRONTEND_URL: required("FRONTEND_URL", "http://localhost:5173"),

  RESET_TOKEN_TTL_MIN: Number(process.env.RESET_TOKEN_TTL_MIN || 20),

  RESEND_WINDOW_SEC: Number(process.env.RESEND_WINDOW_SEC || 600),
  RESEND_MAX_PER_WINDOW: Number(process.env.RESEND_MAX_PER_WINDOW || 3),
  RESEND_MIN_INTERVAL_SEC: Number(process.env.RESEND_MIN_INTERVAL_SEC || 60),
  TWOFA_TTL_MIN: Number(process.env.TWOFA_TTL_MIN || 5),

  // S3 (opcional por ahora)
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_PUBLIC_BASE: process.env.S3_PUBLIC_BASE,
};
