import dns from "node:dns";
import mongoose from "mongoose";

import { env } from "./env.js";
import { logger } from "./logger.js";

mongoose.set("strictQuery", true);

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connected");
  });

  mongoose.connection.on("error", (error) => {
    logger.error({ err: error }, "MongoDB connection error");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  // Check if system DNS handles SRV records properly for mongodb+srv:// URIs;
  // if local DNS resolver returns EBADRESP (common on macOS/local routers),
  // switch to public DNS resolvers (Google 8.8.8.8 / Cloudflare 1.1.1.1) before connecting.
  if (env.MONGODB_URI.startsWith("mongodb+srv://")) {
    try {
      const match = env.MONGODB_URI.match(/mongodb\+srv:\/\/[^@]+@([^/?]+)/);
      if (match && match[1]) {
        const host = match[1];
        await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
      }
    } catch (err: any) {
      if (err?.code === "EBADRESP" || err?.syscall === "querySrv") {
        logger.info("Local DNS SRV query returned EBADRESP; falling back to public DNS resolvers (8.8.8.8, 1.1.1.1)");
        try {
          dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
        } catch (dnsErr) {
          logger.error({ err: dnsErr }, "Failed to set custom DNS servers");
        }
      }
    }
  }

  await mongoose.connect(env.MONGODB_URI);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
