import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Next.js loads .env / .env.local automatically. Standalone scripts
// (seed, drizzle-kit) load them via ./env before importing this module.

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Fall back to the PG* variables Neon's dashboard hands out.
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  if (PGHOST && PGUSER && PGDATABASE) {
    const auth = PGPASSWORD
      ? `${encodeURIComponent(PGUSER)}:${encodeURIComponent(PGPASSWORD)}`
      : encodeURIComponent(PGUSER);
    return `postgresql://${auth}@${PGHOST}/${PGDATABASE}?sslmode=verify-full`;
  }

  throw new Error(
    "Database is not configured. Set DATABASE_URL (or PGHOST/PGUSER/PGPASSWORD/PGDATABASE) in .env.local."
  );
}

function createPool() {
  const url = connectionString();
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const pool = new Pool({
    connectionString: url,
    // Neon requires TLS; local Postgres usually doesn't speak it.
    ssl: isLocal ? undefined : { rejectUnauthorized: true },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  // Neon closes idle connections (e.g. when the compute scales to zero).
  // Without a listener, that error would crash the Node process.
  pool.on("error", (err) => console.error("Postgres pool error:", err.message));
  return pool;
}

// Reuse a single pool across hot reloads in dev so we don't exhaust
// Neon's connection limit.
const globalForDb = globalThis as unknown as { pgPool?: Pool };
const pool = globalForDb.pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export { pool };
