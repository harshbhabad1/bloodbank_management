import "./lib/db/env";
import type { Config } from "drizzle-kit";

// Schema changes go over Neon's direct (unpooled) endpoint when available.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL in .env.local before running drizzle-kit.");

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
} satisfies Config;
