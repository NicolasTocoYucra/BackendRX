// src/utils/logger.ts
import winston from "winston";

const { combine, timestamp, printf, colorize } = winston.format;

const fmt = printf(({ level, message, timestamp }) => `${timestamp} [${level}] ${message}`);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(timestamp(), fmt),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), fmt),
    }),
  ],
});

// Atajos opcionales
(logger as any).http = (msg: string) => logger.info(msg);
