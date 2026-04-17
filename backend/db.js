const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Set it to your Supabase Postgres connection string.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  max: Number(process.env.PGPOOL_MAX || 10),
});

pool.on('error', (err) => {
  console.error('Unexpected pg pool error:', err);
});

async function queryOne(sql, params = []) {
  const r = await pool.query(sql, params);
  return r.rows[0] || null;
}

async function queryAll(sql, params = []) {
  const r = await pool.query(sql, params);
  return r.rows;
}

async function run(sql, params = []) {
  await pool.query(sql, params);
}

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      login_id  TEXT UNIQUE NOT NULL,
      password  TEXT NOT NULL,
      name      TEXT DEFAULT ''
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      expires_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS store (
      user_id INTEGER NOT NULL REFERENCES users(id),
      key     TEXT NOT NULL,
      value   TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (user_id, key)
    );
  `);
}

module.exports = { pool, queryOne, queryAll, run, initSchema };
