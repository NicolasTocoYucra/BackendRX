/* eslint-disable prettier/prettier */
import dotenv from "dotenv";
dotenv.config();

import { connectMongo, disconnectMongo } from "./config/db";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import app from "./app";

async function bootstrap() {
  try {
    // 🔥 ESTA LÍNEA CAMBIA: antes usabas getDb(), ahora debe conectarse de verdad
    await connectMongo();

    const PORT = env.PORT;
    const server = app.listen(PORT, () =>
      logger.info(`🚀 Server listening on port ${PORT}`)
    );

    // Cierre ordenado
    const shutdown = async (signal: string) => {
      try {
        logger.warn(`🛑 Received ${signal}, shutting down...`);
        server.close(async () => {
          await disconnectMongo();
          logger.info("🔌 MongoDB disconnected");
          process.exit(0);
        });
      } catch (e) {
        logger.error(e);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("uncaughtException", (err) => {
      logger.error("Uncaught Exception", err);
      shutdown("uncaughtException");
    });
    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled Rejection", reason);
      shutdown("unhandledRejection");
    });
  } catch (err) {
    logger.error("❌ Fatal error on bootstrap", err);
    process.exit(1);
  }
}

bootstrap();
