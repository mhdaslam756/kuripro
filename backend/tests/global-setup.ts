import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

/**
 * Starts ONE throwaway in-memory MongoDB replica set for the whole test run and hands its URI to every
 * test file via Vitest's provide/inject. A replica set (not a standalone) is required because the app's
 * auth registration uses multi-document transactions. If the mongod binary can't be provisioned, the
 * URI is provided empty and the DB-backed suites skip themselves — the rest of the suite stays green.
 */
declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

let replSet: MongoMemoryReplSet | undefined;

export default async function setup({ provide }: TestProject): Promise<() => Promise<void>> {
  try {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    provide("mongoUri", replSet.getUri());
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("\n[tests] in-memory MongoDB unavailable — DB-backed suites will skip:", (error as Error).message);
    provide("mongoUri", "");
  }

  return async () => {
    await replSet?.stop();
  };
}
