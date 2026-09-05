import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pg?: ReturnType<typeof postgres>;
  drizzle?: ReturnType<typeof drizzle<typeof schema>>;
};

function getClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!globalForDb.pg) {
    globalForDb.pg = postgres(connectionString, { max: 10 });
  }
  return globalForDb.pg;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    if (!globalForDb.drizzle) {
      globalForDb.drizzle = drizzle(getClient(), { schema });
    }
    return Reflect.get(globalForDb.drizzle, prop, receiver);
  },
});
