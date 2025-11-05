// src/config/cors.ts
import { CorsOptions } from "cors";
import { env } from "./env";

const origins = (env.FRONTEND_URL || "http://localhost:5173").split(",").map(s => s.trim()); 


export const corsOptions: CorsOptions = {
  origin: origins.length ? origins : "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
};
