import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __aiQualitySql: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var __aiQualityDb: ReturnType<typeof drizzle> | undefined;
}

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  if (!globalThis.__aiQualitySql) {
    globalThis.__aiQualitySql = postgres(databaseUrl, {
      prepare: false,
      max: 1,
    });
  }

  if (!globalThis.__aiQualityDb) {
    globalThis.__aiQualityDb = drizzle(globalThis.__aiQualitySql);
  }

  return globalThis.__aiQualityDb;
}
