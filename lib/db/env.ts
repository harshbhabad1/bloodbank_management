// Loads env files for standalone scripts (seed, drizzle-kit) the same way
// Next.js does: .env.local wins over .env. Import this before ./index.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
