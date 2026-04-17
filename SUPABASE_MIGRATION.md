# Supabase (Postgres) Migration — Deploy Notes

The backend has been migrated from sql.js (SQLite) to Postgres via the `pg`
driver. Target DB is your self-hosted Supabase Postgres at
`https://supabase.tech.onegroup.co.in`.

## What changed

- New: `backend/db.js` — Postgres pool, schema init, query helpers.
- Rewritten: `backend/server.js` — every query is now async / parameterized (`$1,$2,...`).
- New: `backend/migrate-sqlite-to-pg.js` — one-shot data copy from the old
  `job_portal.db` into Postgres.
- `backend/package.json` — `pg` added, `sql.js` moved to devDependencies
  (still needed only by the migration script).
- `docker-compose.yml` — dropped the `portal-data` volume and the `DB_PATH`
  env var. The backend now reads `DATABASE_URL`.

## Required env vars (put in `backend/.env`)

```
DATABASE_URL=postgresql://postgres:<PASSWORD>@<SUPABASE_HOST>:5432/postgres
APP_BASE_URL=https://<your-public-url>
# Optional — set to "disable" only if your Supabase host has no TLS on 5432
# PGSSL=disable

# Existing mailer vars stay the same
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...

# Existing AI key
OPENROUTER_API_KEY=...
```

Grab the `DATABASE_URL` from Supabase Studio → Project Settings → Database →
Connection string (URI). Use the "Direct connection" string if you run outside
the Supabase host; use the internal one if your Docker host is on the same
network.

## Cutover steps

1. **Install the new dependency locally** (to test before pushing):
   ```
   cd backend
   npm install
   ```

2. **Set `DATABASE_URL`** in `backend/.env`.

3. **One-shot data migration** (copies users, sessions, tokens, store data from
   the old `backend/job_portal.db` into Postgres). Safe to re-run — it's
   idempotent via `ON CONFLICT DO NOTHING`.
   ```
   cd backend
   node migrate-sqlite-to-pg.js
   ```
   If your SQLite file lives elsewhere, pass its path:
   ```
   node migrate-sqlite-to-pg.js /data/job_portal.db
   ```

4. **Smoke test locally**:
   ```
   npm start
   ```
   Hit `http://localhost:3000`, log in as an existing user (or `test123 / 123`),
   try signup, password reset, store reads/writes.

5. **Deploy to Hostinger**:
   - Commit + push the code.
   - On the server, update `backend/.env` to include `DATABASE_URL`
     (remove `DB_PATH` — it's unused).
   - The compose file no longer mounts `/data`. If you want to keep the old
     SQLite file around for a while, copy it out of the `portal-data` volume
     before you `docker compose down -v`.
   - Run the migration script **once** against the prod DB (from the server
     or any host that can reach Supabase):
     ```
     docker compose run --rm job-portal node migrate-sqlite-to-pg.js /data/job_portal.db
     ```
     (Or mount the old volume temporarily to read the file.)
   - `docker compose up -d --build`.

6. **Verify**: `docker compose logs job-portal` should show
   `Postgres via DATABASE_URL` and no connection errors.

## Rollback

The old code lives in git history — if needed, revert the commit, restore the
`portal-data` volume with the SQLite file, and redeploy. No destructive
migration is done against SQLite, so the old file is unchanged.

## Security follow-ups

- Rotate the Supabase admin password you shared in chat.
- Keep `DATABASE_URL` only in `backend/.env` — never commit it.
- `backend/job_portal.db` should be git-ignored or deleted once migration is
  confirmed.
