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
  await syncObsoleteIndexes();
}

async function syncObsoleteIndexes(): Promise<void> {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    // 1. Drop old single-ticket unique index on chitmemberships if still present
    const cmColl = db.collection("chitmemberships");
    const cmIndexes = await cmColl.indexes();
    if (cmIndexes.some((i) => i.name === "chitGroupId_1_ticketNumber_1")) {
      logger.info("Dropping obsolete index chitGroupId_1_ticketNumber_1 on chitmemberships");
      await cmColl.dropIndex("chitGroupId_1_ticketNumber_1").catch(() => {});
    }

    // 2. Drop old single-payout unique index on payouts if still present
    const payoutColl = db.collection("payouts");
    const payoutIndexes = await payoutColl.indexes();
    if (payoutIndexes.some((i) => i.name === "chitCycleId_1")) {
      logger.info("Dropping obsolete index chitCycleId_1 on payouts");
      await payoutColl.dropIndex("chitCycleId_1").catch(() => {});
    }

    // 3. Drop old non-tenant-scoped receiptNumber_1 index on collections
    const collectionColl = db.collection("collections");
    const collectionIndexes = await collectionColl.indexes();
    if (collectionIndexes.some((i) => i.name === "receiptNumber_1")) {
      logger.info("Dropping obsolete index receiptNumber_1 on collections");
      await collectionColl.dropIndex("receiptNumber_1").catch(() => {});
    }

    // 4. Drop old non-tenant-scoped receiptNumber_1 index on payoutdisbursements
    const disbursementColl = db.collection("payoutdisbursements");
    const disbursementIndexes = await disbursementColl.indexes();
    if (disbursementIndexes.some((i) => i.name === "receiptNumber_1")) {
      logger.info("Dropping obsolete index receiptNumber_1 on payoutdisbursements");
      await disbursementColl.dropIndex("receiptNumber_1").catch(() => {});
    }
  } catch (err) {
    logger.warn({ err }, "Index synchronization non-fatal error");
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
