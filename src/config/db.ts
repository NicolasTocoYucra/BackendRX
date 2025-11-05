// src/config/db.ts
import mongoose from "mongoose";
import { Db } from 'mongodb';
import { env } from "./env";
import { logger } from "../utils/logger";

mongoose.set("strictQuery", true);
let db: Db;
export const getDb = (): Db => { if (!db) { db = mongoose.connection.db; } return db; };
export async function connectMongo(retries = 3, delayMs = 1500): Promise<typeof mongoose> {
  const uri = env.MONGO_URI;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      } as any);

      const db = mongoose.connection;
      db.on("connected", () => logger.info(`🟢 Mongo connected: ${db.host}`));
      db.on("error", (err) => logger.error("Mongo connection error:", err));
      db.on("disconnected", () => logger.warn("🟡 Mongo disconnected"));

      return conn;
    } catch (err) {
      logger.error(`Mongo connect attempt ${attempt} failed`, err);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("Unexpected connectMongo flow");
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}
