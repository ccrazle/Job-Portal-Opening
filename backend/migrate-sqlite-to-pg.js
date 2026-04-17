/**
 * One-shot migration: copies relevant data from the legacy SQLite file
 * into the Supabase Postgres database.
 *
 * What gets migrated:
 *   - users  → only test123 (user_id 1)
 *   - store  → only rows belonging to test123 (drafts, posted, screening)
 *
 * What is intentionally skipped:
 *   - sessions      (temporary, expire on their own)
 *   - account_tokens (feature removed)
 *   - pending_signups (feature removed)
 *
 * Usage:
 *   DATABASE_URL=postgres://... node migrate-sqlite-to-pg.js [path/to/job_portal.db]
 *
 * Safe to re-run — uses ON CONFLICT DO NOTHING / DO UPDATE.
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const db   = require('./db');

const SQLITE_PATH = process.argv[2]
  || process.env.DB_PATH
  || path.join(__dirname, 'job_portal.db');

async function main() {
  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`SQLite file not found: ${SQLITE_PATH}`);
    process.exit(1);
  }

  const masked = process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') ?? '(not set)';
  console.log(`Source : ${SQLITE_PATH}`);
  console.log(`Target : ${masked}\n`);

  // Init Postgres schema (creates tables if they don't exist yet)
  await db.initSchema();

  // Open SQLite
  const SQL = await initSqlJs();
  const src = new SQL.Database(fs.readFileSync(SQLITE_PATH));

  const readAll = (sql) => {
    const stmt = src.prepare(sql);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  };

  // ── 1. Migrate test123 user only ──
  const users = readAll(
    `SELECT u.id, u.login_id, u.password, u.name
     FROM users u
     WHERE u.login_id = 'test123'`
  );

  for (const u of users) {
    await db.run(
      `INSERT INTO users (id, login_id, password, name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
         SET login_id = EXCLUDED.login_id,
             password = EXCLUDED.password,
             name     = EXCLUDED.name`,
      [u.id, u.login_id, u.password, u.name || '']
    );
  }
  console.log(`users  : ${users.length} row(s) migrated`);

  // ── 2. Migrate store rows for test123 (user_id = 1) ──
  const store = readAll(
    `SELECT s.user_id, s.key, s.value
     FROM store s
     WHERE s.user_id = 1
       AND LENGTH(s.value) > 2`   // skip empty [] / {} rows
  );

  for (const r of store) {
    await db.run(
      `INSERT INTO store (user_id, key, value)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value`,
      [r.user_id, r.key, r.value]
    );
  }
  console.log(`store  : ${store.length} row(s) migrated`);
  store.forEach(r => console.log(`  • ${r.key} (${r.value.length} bytes)`));

  // ── 3. Fix the serial sequence so new INSERTs don't collide ──
  await db.run(
    `SELECT setval(pg_get_serial_sequence('users','id'),
       COALESCE((SELECT MAX(id) FROM users), 1), true)`
  );

  console.log('\nMigration complete.');
  await db.pool.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
