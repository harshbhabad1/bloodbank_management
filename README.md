# BloodBank Manager

Blood bank management system — donors, donations, inventory, and requests. Built with Next.js, Drizzle ORM and Neon Postgres.

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL` — Neon **pooled** connection string (host contains `-pooler`), with `?sslmode=verify-full`
   - `DATABASE_URL_UNPOOLED` — Neon **direct** connection string (optional; used by drizzle-kit)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — the single admin login
   - `SESSION_SECRET` — at least 32 characters (required in production)

   If `DATABASE_URL` is unset, the app falls back to the `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` variables from the Neon dashboard.

3. Create the tables and load sample data:

   ```bash
   pnpm db:push
   pnpm db:seed
   ```

   `db:seed` truncates all tables first.

4. Start the dev server and open http://localhost:3000:

   ```bash
   pnpm dev
   ```

## Deploying

Set the same environment variables in your host (e.g. Vercel project settings). Use the pooled Neon URL for `DATABASE_URL`.
