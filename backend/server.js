require('dotenv').config();
const express = require('express');
const initSqlJs = require('sql.js');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mailer = require('./mailer');

// Multer — store uploads in memory (no disk needed)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const app = express();
const PORT = 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'job_portal.db');

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

let db;

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Helper: query one row
function queryOne(sql, params) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

// Helper: query all rows
function queryAll(sql, params) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ── Auth Middleware ──
function requireAuth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const session = queryOne(
    `SELECT user_id, expires_at FROM sessions WHERE token = ?`,
    [token]
  );

  if (!session) return res.status(401).json({ error: 'Invalid session' });
  if (Date.now() > session.expires_at) {
    db.run(`DELETE FROM sessions WHERE token = ?`, [token]);
    saveDb();
    return res.status(401).json({ error: 'Session expired' });
  }

  req.userId = session.user_id;
  next();
}

async function start() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // ── Create Tables ──
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      login_id       TEXT UNIQUE NOT NULL,
      password       TEXT NOT NULL,
      name           TEXT DEFAULT '',
      email          TEXT,
      email_verified INTEGER DEFAULT 0,
      pending_email  TEXT
    );
  `);

  // Safe migration for older DBs that lack the new columns
  const addColumnIfMissing = (table, column, ddl) => {
    try {
      const cols = queryAll(`PRAGMA table_info(${table})`, []);
      if (!cols.some(c => c.name === column)) {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
      }
    } catch (e) { console.warn(`Migration warn on ${table}.${column}:`, e.message); }
  };
  addColumnIfMissing('users', 'email', 'email TEXT');
  addColumnIfMissing('users', 'email_verified', 'email_verified INTEGER DEFAULT 0');
  addColumnIfMissing('users', 'pending_email', 'pending_email TEXT');

  db.run(`
    CREATE TABLE IF NOT EXISTS account_tokens (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      purpose    TEXT NOT NULL,
      payload    TEXT,
      expires_at INTEGER NOT NULL,
      used_at    INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pending_signups (
      token        TEXT PRIMARY KEY,
      email        TEXT NOT NULL,
      expires_at   INTEGER NOT NULL,
      verified_at  INTEGER,
      completed_at INTEGER
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS store (
      user_id INTEGER NOT NULL,
      key     TEXT NOT NULL,
      value   TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (user_id, key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // ── Seed test123 user ──
  const existing = queryOne(`SELECT id FROM users WHERE login_id = ?`, ['test123']);
  let testUserId;

  if (!existing) {
    const hash = bcrypt.hashSync('123', 10);
    db.run(`INSERT INTO users (login_id, password, name) VALUES (?, ?, ?)`, ['test123', hash, 'Test User']);
    testUserId = queryOne(`SELECT id FROM users WHERE login_id = ?`, ['test123']).id;

    // Migrate any existing unscoped data from the old store table into this user
    migrateOldData(testUserId);
  } else {
    testUserId = existing.id;
  }

  // One-off: clear any earlier test-state verified email so test123 must go through the
  // full registration + verification flow on next login. Targets only the earlier dev
  // email (founder@onecity.in) so this is safe to leave in place; it's a no-op once cleared.
  db.run(
    `UPDATE users SET email = NULL, email_verified = 0, pending_email = NULL
     WHERE login_id = 'test123' AND email = 'founder@onecity.in'`
  );
  db.run(`DELETE FROM account_tokens WHERE user_id = ?`, [testUserId]);
  db.run(`DELETE FROM sessions WHERE user_id = ?`, [testUserId]);

  saveDb();

  // ── Migrate old unscoped store data ──
  function migrateOldData(userId) {
    // Check if old unscoped store table has data (user_id column may not exist in old rows)
    // We look for rows where user_id = 0 or try to read old-format keys
    const oldKeys = ['jp_drafts', 'jp_posted', 'jp_outreach'];
    for (const key of oldKeys) {
      try {
        // Try reading from old format (no user_id, just key as PK)
        const old = queryOne(`SELECT value FROM store WHERE key = ? AND user_id = 0`, [key]);
        if (old && old.value) {
          db.run(
            `INSERT OR IGNORE INTO store (user_id, key, value) VALUES (?, ?, ?)`,
            [userId, key, old.value]
          );
        }
      } catch { /* table schema may differ, that's fine */ }
    }

    // Also try migrating screening keys
    try {
      const screeningRows = queryAll(`SELECT key, value FROM store WHERE key LIKE 'jp_screening_%' AND user_id = 0`, []);
      for (const row of screeningRows) {
        db.run(
          `INSERT OR IGNORE INTO store (user_id, key, value) VALUES (?, ?, ?)`,
          [userId, row.key, row.value]
        );
      }
    } catch { /* ignore */ }

    // Seed defaults if nothing was migrated
    const defaults = [
      ['jp_drafts', '[]'],
      ['jp_posted', '[]'],
      ['jp_outreach', '{"candidates":[]}']
    ];
    for (const [k, v] of defaults) {
      db.run(`INSERT OR IGNORE INTO store (user_id, key, value) VALUES (?, ?, ?)`, [userId, k, v]);
    }
  }

  // ══════════════════════════════════════
  // ── AUTH ROUTES (no auth required) ──
  // ══════════════════════════════════════

  // POST /api/auth/login
  app.post('/api/auth/login', (req, res) => {
    const { loginId, password, remember } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Login ID and password are required' });
    }

    const user = queryOne(`SELECT id, login_id, password, name, email, email_verified, pending_email FROM users WHERE login_id = ?`, [loginId]);
    if (!user) return res.status(401).json({ error: 'Invalid login ID or password' });

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid login ID or password' });
    }

    // Create session token
    const token = crypto.randomBytes(32).toString('hex');
    const duration = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days vs 24h
    const expiresAt = Date.now() + duration;

    db.run(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`, [token, user.id, expiresAt]);
    saveDb();

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        loginId: user.login_id,
        name: user.name,
        email: user.email || null,
        emailVerified: !!user.email_verified,
        pendingEmail: user.pending_email || null
      },
      expiresAt
    });
  });

  // ── SIGN UP FLOW ──
  // Flow:
  //   1) POST /api/auth/signup/start  { email }  -> issues a pending_signups row, emails verification link, returns { signupToken }
  //   2) User clicks email link -> GET /api/auth/signup/verify?token=...  -> flips verified_at on the row
  //   3) Sign-up page polls GET /api/auth/signup/status?token=...  -> { email, verified }
  //   4) POST /api/auth/signup/complete  { signupToken, loginId, password }  -> creates user, logs them in, returns session token

  const EMAIL_RE_SIGNUP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const SIGNUP_TTL_MS = 60 * 60 * 1000; // 1 hour

  // POST /api/auth/signup/start
  app.post('/api/auth/signup/start', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!EMAIL_RE_SIGNUP.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

    // Block if an account already exists with this verified email
    const taken = queryOne(`SELECT id FROM users WHERE LOWER(email) = ? AND email_verified = 1`, [email]);
    if (taken) return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });

    // Invalidate any existing not-yet-completed signups for this email
    db.run(`DELETE FROM pending_signups WHERE email = ? AND completed_at IS NULL`, [email]);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + SIGNUP_TTL_MS;
    db.run(
      `INSERT INTO pending_signups (token, email, expires_at) VALUES (?, ?, ?)`,
      [token, email, expiresAt]
    );
    saveDb();

    const url = `${mailer.appBaseUrl()}/verify-signup?token=${token}`;
    const tpl = mailer.signupVerifyTemplate({ url });
    await mailer.sendMail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });

    res.json({ ok: true, signupToken: token, email });
  });

  // GET /api/auth/signup/verify?token=...  (from email link)
  app.get('/api/auth/signup/verify', (req, res) => {
    const token = String(req.query.token || '');
    const row = queryOne(`SELECT token, email, expires_at, verified_at, completed_at FROM pending_signups WHERE token = ?`, [token]);
    if (!row) return res.status(400).json({ error: 'This link is invalid.' });
    if (row.completed_at) return res.status(400).json({ error: 'This sign-up has already been completed.' });
    if (Date.now() > row.expires_at) return res.status(400).json({ error: 'This link has expired. Please start sign-up again.' });

    if (!row.verified_at) {
      db.run(`UPDATE pending_signups SET verified_at = ? WHERE token = ?`, [Date.now(), token]);
      saveDb();
    }
    res.json({ ok: true, email: row.email });
  });

  // GET /api/auth/signup/status?token=...
  app.get('/api/auth/signup/status', (req, res) => {
    const token = String(req.query.token || '');
    const row = queryOne(`SELECT email, expires_at, verified_at, completed_at FROM pending_signups WHERE token = ?`, [token]);
    if (!row) return res.status(404).json({ error: 'Unknown signup session.' });
    if (row.completed_at) return res.json({ email: row.email, verified: true, completed: true });
    if (Date.now() > row.expires_at) return res.status(410).json({ error: 'Sign-up session expired. Please start again.' });
    res.json({ email: row.email, verified: !!row.verified_at, completed: false });
  });

  // POST /api/auth/signup/complete
  app.post('/api/auth/signup/complete', (req, res) => {
    const signupToken = String(req.body.signupToken || '');
    const loginId = String(req.body.loginId || '').trim();
    const password = String(req.body.password || '');

    if (loginId.length < 3) return res.status(400).json({ error: 'Login ID must be at least 3 characters.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const row = queryOne(`SELECT token, email, expires_at, verified_at, completed_at FROM pending_signups WHERE token = ?`, [signupToken]);
    if (!row) return res.status(400).json({ error: 'Invalid or expired signup session.' });
    if (row.completed_at) return res.status(400).json({ error: 'This sign-up has already been completed.' });
    if (Date.now() > row.expires_at) return res.status(400).json({ error: 'Sign-up session expired. Please start again.' });
    if (!row.verified_at) return res.status(400).json({ error: 'Please verify your email first.' });

    // Ensure loginId not taken + no other account snuck in with this email since
    if (queryOne(`SELECT id FROM users WHERE login_id = ?`, [loginId])) {
      return res.status(409).json({ error: 'This login ID is already taken.' });
    }
    if (queryOne(`SELECT id FROM users WHERE LOWER(email) = ? AND email_verified = 1`, [row.email])) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    db.run(
      `INSERT INTO users (login_id, password, name, email, email_verified) VALUES (?, ?, ?, ?, 1)`,
      [loginId, hash, loginId, row.email]
    );
    const user = queryOne(`SELECT id, login_id, name, email FROM users WHERE login_id = ?`, [loginId]);

    // Seed default store entries for new user
    const defaults = [
      ['jp_drafts', '[]'],
      ['jp_posted', '[]'],
      ['jp_outreach', '{"candidates":[]}']
    ];
    for (const [k, v] of defaults) {
      db.run(`INSERT OR IGNORE INTO store (user_id, key, value) VALUES (?, ?, ?)`, [user.id, k, v]);
    }

    db.run(`UPDATE pending_signups SET completed_at = ? WHERE token = ?`, [Date.now(), signupToken]);

    // Create session and sign them in
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    db.run(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`, [sessionToken, user.id, expiresAt]);
    saveDb();

    res.json({
      ok: true,
      token: sessionToken,
      user: { id: user.id, loginId: user.login_id, name: user.name, email: user.email, emailVerified: true, pendingEmail: null },
      expiresAt
    });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req, res) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (token) {
      db.run(`DELETE FROM sessions WHERE token = ?`, [token]);
      saveDb();
    }
    res.json({ ok: true });
  });

  // GET /api/auth/me — verify token and get user info
  app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = queryOne(`SELECT id, login_id, name, email, email_verified, pending_email FROM users WHERE id = ?`, [req.userId]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({
      user: {
        id: user.id,
        loginId: user.login_id,
        name: user.name,
        email: user.email || null,
        emailVerified: !!user.email_verified,
        pendingEmail: user.pending_email || null
      }
    });
  });

  // ══════════════════════════════════════
  // ── ACCOUNT ROUTES (email verification, password reset, login ID change) ──
  // ══════════════════════════════════════

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

  function newToken() { return crypto.randomBytes(32).toString('hex'); }

  function issueToken(userId, purpose, payload) {
    // Invalidate any unused tokens of the same purpose for this user
    db.run(
      `DELETE FROM account_tokens WHERE user_id = ? AND purpose = ? AND used_at IS NULL`,
      [userId, purpose]
    );
    const token = newToken();
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    db.run(
      `INSERT INTO account_tokens (token, user_id, purpose, payload, expires_at) VALUES (?, ?, ?, ?, ?)`,
      [token, userId, purpose, payload || null, expiresAt]
    );
    saveDb();
    return token;
  }

  function consumeToken(token, purpose) {
    const row = queryOne(
      `SELECT token, user_id, purpose, payload, expires_at, used_at FROM account_tokens WHERE token = ?`,
      [token]
    );
    if (!row) return { ok: false, error: 'Invalid or unknown link.' };
    if (row.purpose !== purpose) return { ok: false, error: 'Link purpose mismatch.' };
    if (row.used_at) return { ok: false, error: 'This link has already been used.' };
    if (Date.now() > row.expires_at) return { ok: false, error: 'This link has expired. Please request a new one.' };
    db.run(`UPDATE account_tokens SET used_at = ? WHERE token = ?`, [Date.now(), token]);
    return { ok: true, userId: row.user_id, payload: row.payload };
  }

  // POST /api/account/register-email  (authed) — body: { email }
  app.post('/api/account/register-email', requireAuth, async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

    const user = queryOne(`SELECT id, name, email, email_verified FROM users WHERE id = ?`, [req.userId]);
    if (!user) return res.status(401).json({ error: 'User not found' });

    // If user already has this exact email verified, nothing to do
    if (user.email && user.email.toLowerCase() === email && user.email_verified) {
      return res.json({ ok: true, alreadyVerified: true });
    }

    // Prevent collisions — another user already verified this email
    const taken = queryOne(`SELECT id FROM users WHERE LOWER(email) = ? AND email_verified = 1 AND id != ?`, [email, req.userId]);
    if (taken) return res.status(409).json({ error: 'This email is already registered to another account.' });

    // Stash as pending_email and send verification link
    db.run(`UPDATE users SET pending_email = ? WHERE id = ?`, [email, req.userId]);
    saveDb();

    const token = issueToken(req.userId, 'verify_email', email);
    const url = `${mailer.appBaseUrl()}/verify-email?token=${token}`;
    const tpl = mailer.verifyEmailTemplate({ name: user.name, url });
    await mailer.sendMail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });

    res.json({ ok: true, pendingEmail: email });
  });

  // POST /api/account/resend-verification  (authed)
  app.post('/api/account/resend-verification', requireAuth, async (req, res) => {
    const user = queryOne(`SELECT id, name, email, email_verified, pending_email FROM users WHERE id = ?`, [req.userId]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.email_verified) return res.json({ ok: true, alreadyVerified: true });
    const target = user.pending_email || user.email;
    if (!target) return res.status(400).json({ error: 'No email on file. Please register an email first.' });

    const token = issueToken(req.userId, 'verify_email', target);
    const url = `${mailer.appBaseUrl()}/verify-email?token=${token}`;
    const tpl = mailer.verifyEmailTemplate({ name: user.name, url });
    await mailer.sendMail({ to: target, subject: tpl.subject, html: tpl.html, text: tpl.text });
    res.json({ ok: true, pendingEmail: target });
  });

  // GET /api/account/verify-email?token=...  (unauthed — activated from email link)
  app.get('/api/account/verify-email', (req, res) => {
    const token = String(req.query.token || '');
    const result = consumeToken(token, 'verify_email');
    if (!result.ok) return res.status(400).json({ error: result.error });

    const email = String(result.payload || '').toLowerCase();

    // Final collision guard at the moment of verification
    const taken = queryOne(`SELECT id FROM users WHERE LOWER(email) = ? AND email_verified = 1 AND id != ?`, [email, result.userId]);
    if (taken) return res.status(409).json({ error: 'This email is already registered to another account.' });

    db.run(
      `UPDATE users SET email = ?, email_verified = 1, pending_email = NULL WHERE id = ?`,
      [email, result.userId]
    );
    saveDb();
    res.json({ ok: true, email });
  });

  // POST /api/account/request-password-reset  (unauthed) — body: { identifier }
  // identifier = login_id OR email. Response is always generic to avoid account enumeration.
  app.post('/api/account/request-password-reset', async (req, res) => {
    const identifier = String(req.body.identifier || '').trim();
    const genericResponse = { ok: true, message: 'If an account matches, a reset link has been sent to the registered email.' };
    if (!identifier) return res.json(genericResponse);

    const isEmail = EMAIL_RE.test(identifier);
    const user = isEmail
      ? queryOne(`SELECT id, name, email, email_verified FROM users WHERE LOWER(email) = ? AND email_verified = 1`, [identifier.toLowerCase()])
      : queryOne(`SELECT id, name, email, email_verified FROM users WHERE login_id = ?`, [identifier]);

    if (!user || !user.email || !user.email_verified) {
      // Do not leak existence — same response
      return res.json(genericResponse);
    }

    const token = issueToken(user.id, 'reset_password', null);
    const url = `${mailer.appBaseUrl()}/reset-password?token=${token}`;
    const tpl = mailer.resetPasswordTemplate({ name: user.name, url });
    await mailer.sendMail({ to: user.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
    res.json(genericResponse);
  });

  // POST /api/account/reset-password  (unauthed) — body: { token, newPassword }
  app.post('/api/account/reset-password', (req, res) => {
    const token = String(req.body.token || '');
    const newPassword = String(req.body.newPassword || '');
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const result = consumeToken(token, 'reset_password');
    if (!result.ok) return res.status(400).json({ error: result.error });

    const hash = bcrypt.hashSync(newPassword, 10);
    db.run(`UPDATE users SET password = ? WHERE id = ?`, [hash, result.userId]);
    // Invalidate all existing sessions for this user on password reset
    db.run(`DELETE FROM sessions WHERE user_id = ?`, [result.userId]);
    saveDb();
    res.json({ ok: true });
  });

  // POST /api/account/request-login-id-change  (authed) — body: { newLoginId }
  app.post('/api/account/request-login-id-change', requireAuth, async (req, res) => {
    const newLoginId = String(req.body.newLoginId || '').trim();
    if (newLoginId.length < 3) return res.status(400).json({ error: 'Login ID must be at least 3 characters.' });

    const user = queryOne(`SELECT id, name, login_id, email, email_verified FROM users WHERE id = ?`, [req.userId]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (!user.email_verified || !user.email) return res.status(400).json({ error: 'Please verify your email before changing your login ID.' });
    if (newLoginId === user.login_id) return res.status(400).json({ error: 'New login ID must differ from the current one.' });

    const taken = queryOne(`SELECT id FROM users WHERE login_id = ? AND id != ?`, [newLoginId, req.userId]);
    if (taken) return res.status(409).json({ error: 'This login ID is already taken.' });

    const token = issueToken(req.userId, 'change_login_id', newLoginId);
    const url = `${mailer.appBaseUrl()}/confirm-login-id?token=${token}`;
    const tpl = mailer.changeLoginIdTemplate({ name: user.name, newLoginId, url });
    await mailer.sendMail({ to: user.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
    res.json({ ok: true, pendingLoginId: newLoginId });
  });

  // GET /api/account/confirm-login-id?token=...  (unauthed — from email)
  app.get('/api/account/confirm-login-id', (req, res) => {
    const token = String(req.query.token || '');
    const result = consumeToken(token, 'change_login_id');
    if (!result.ok) return res.status(400).json({ error: result.error });

    const newLoginId = String(result.payload || '').trim();
    const taken = queryOne(`SELECT id FROM users WHERE login_id = ? AND id != ?`, [newLoginId, result.userId]);
    if (taken) return res.status(409).json({ error: 'This login ID is no longer available.' });

    db.run(`UPDATE users SET login_id = ? WHERE id = ?`, [newLoginId, result.userId]);
    // Invalidate existing sessions so user must log in with new ID
    db.run(`DELETE FROM sessions WHERE user_id = ?`, [result.userId]);
    saveDb();
    res.json({ ok: true, loginId: newLoginId });
  });

  // ══════════════════════════════════════
  // ── STORE ROUTES (auth required) ──
  // ══════════════════════════════════════

  // GET /api/store/:key
  app.get('/api/store/:key', requireAuth, (req, res) => {
    const row = queryOne(
      `SELECT value FROM store WHERE user_id = ? AND key = ?`,
      [req.userId, req.params.key]
    );
    if (!row) return res.json({ key: req.params.key, value: null });
    try {
      res.json({ key: req.params.key, value: JSON.parse(row.value) });
    } catch {
      res.json({ key: req.params.key, value: row.value });
    }
  });

  // PUT /api/store/:key
  app.put('/api/store/:key', requireAuth, (req, res) => {
    const value = JSON.stringify(req.body.value);
    db.run(
      `INSERT INTO store (user_id, key, value) VALUES (?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value`,
      [req.userId, req.params.key, value]
    );
    saveDb();
    res.json({ ok: true, key: req.params.key });
  });

  // DELETE /api/store/:key
  app.delete('/api/store/:key', requireAuth, (req, res) => {
    db.run(`DELETE FROM store WHERE user_id = ? AND key = ?`, [req.userId, req.params.key]);
    saveDb();
    res.json({ ok: true, key: req.params.key });
  });

  // GET /api/store — list keys
  app.get('/api/store', requireAuth, (req, res) => {
    const prefix = req.query.prefix || '';
    const rows = queryAll(
      `SELECT key FROM store WHERE user_id = ? AND key LIKE ?`,
      [req.userId, prefix + '%']
    );
    res.json({ keys: rows.map(r => r.key) });
  });

  // POST /api/store/bulk
  app.post('/api/store/bulk', requireAuth, (req, res) => {
    const keys = req.body.keys || [];
    const results = {};
    for (const key of keys) {
      const row = queryOne(
        `SELECT value FROM store WHERE user_id = ? AND key = ?`,
        [req.userId, key]
      );
      if (row) {
        try { results[key] = JSON.parse(row.value); }
        catch { results[key] = row.value; }
      } else {
        results[key] = null;
      }
    }
    res.json(results);
  });

  // ══════════════════════════════════════
  // ── SKILL ROUTE (DeepSeek via OpenRouter) ──
  // ══════════════════════════════════════

  // Self-contained system prompt — aligned with resume-scorer.md methodology
  const SYSTEM_PROMPT = `You are a strict, precise resume screening assistant. Your job is to evaluate resumes against a Job Description (JD) and return accurate scores.

YOU MUST FOLLOW THESE RULES EXACTLY. DO NOT BE LENIENT.

═══════════════════════════════════════════════════════════
STEP 1 — PARSE THE JD INTO WEIGHTED REQUIREMENTS
═══════════════════════════════════════════════════════════

Before evaluating any resume, extract every stated requirement from the JD and assign a priority tier based on signal words:

| Tier          | Signal words                                                    | Weight |
|---------------|----------------------------------------------------------------|--------|
| Must-have     | must, required, mandatory, essential, minimum, necessary        | 3      |
| Should-have   | should, preferred, expected, ideally, strongly preferred        | 2      |
| Nice-to-have  | optional, nice to have, bonus, plus, desired, advantageous      | 1      |

If no signal words are found on a requirement → default to Should-have (weight 2).

Group requirements into clusters:
- Technical Skills — tools, languages, platforms, software
- Domain Knowledge — industry-specific expertise
- Experience — years, seniority, past roles
- Education — degrees, certifications, licenses
- Soft Skills — communication, leadership, teamwork

═══════════════════════════════════════════════════════════
STEP 2 — ELIGIBILITY GATES (MANDATORY PASS/FAIL — APPLY BEFORE ANY SCORING)
═══════════════════════════════════════════════════════════

These are HARD binary gates. If a candidate fails EITHER gate, they are IMMEDIATELY REJECTED — Score = 0, no exceptions, no partial credit, no "good match with gaps". REJECTED means REJECTED.

GATE A — MINIMUM EXPERIENCE (Most Important):
- Extract the minimum experience requirement from the JD (e.g. "3-5 years" means minimum is 3, "minimum 5 years" means 5, "5+ years" means 5).
- From the resume, calculate the candidate's total RELEVANT experience. "Relevant" means experience in the SAME domain/field as the JD.
  - Civil engineering experience does NOT count for a Mechanical role.
  - IT experience does NOT count for a Construction role.
  - General labor/site experience does NOT count for an engineering role.
- If candidate's relevant experience is LESS than the JD minimum → REJECTED immediately. Score = 0.
- If the JD does not explicitly state a minimum experience → auto-pass all candidates on this gate.
- If experience is ambiguous or undated → estimate conservatively and note "Experience unclear" in Remarks.

GATE B — EDUCATION (Second Most Important):
- Extract the EXACT education requirement from the JD (e.g. "B.Tech Civil", "Diploma in Mechanical Engineering", "ITI Mechanic").
- This gate checks TWO things — both the DEGREE LEVEL and the FIELD OF STUDY must match.

  DEGREE HIERARCHY (from lowest to highest):
  - 10th Pass / 12th Pass / High School
  - ITI / Trade Certificate
  - Diploma (3-year polytechnic)
  - B.Tech / B.E. / Bachelor's degree (4-year engineering)
  - M.Tech / M.E. / Master's degree
  - MBA / PGDM (management)

  CRITICAL RULES:
  ★ A LOWER degree NEVER satisfies a HIGHER degree requirement.
  ★ Diploma is LOWER than B.Tech/B.E. — if JD requires "B.Tech" or "B.E.", a Diploma holder is REJECTED.
  ★ ITI is LOWER than Diploma — if JD requires "Diploma", an ITI holder is REJECTED.
  ★ 10th/12th Pass is LOWER than everything — always REJECTED unless JD specifically asks for it.
  ★ The field must also match — "B.Tech Civil" does NOT satisfy "B.Tech Mechanical". "Diploma in Civil" does NOT satisfy "Diploma in Electrical".
  ★ Only widely recognized equivalents count: B.E. = B.Tech, PGDM = MBA, BE = B.E.

  EXAMPLES OF REJECTION:
  - JD requires "B.Tech/B.E. Civil" → Candidate has "Diploma in Civil Engineering" → REJECTED (Diploma < B.Tech)
  - JD requires "B.Tech/B.E. Civil" → Candidate has "B.Tech Mechanical" → REJECTED (wrong field)
  - JD requires "Diploma in Mechanical" → Candidate has "ITI Mechanic" → REJECTED (ITI < Diploma)
  - JD requires "B.Tech/B.E." → Candidate has "12th Pass" → REJECTED (12th < B.Tech)
  - JD requires "B.Tech/B.E." → Candidate has "BA" → REJECTED (BA is not an engineering degree)
  - JD requires "B.Tech/B.E. Civil" → Candidate has "B.E. Civil" → PASS (B.E. = B.Tech)
  - JD requires "B.Tech/B.E. Civil" → Candidate has "M.Tech Civil" → PASS (higher degree in same field)

- If candidate does not meet BOTH the degree level AND field → REJECTED immediately. Score = 0.
- If the JD does not explicitly state an education requirement → auto-pass all candidates.

REJECTION OUTPUT RULES:
- If a candidate fails EITHER gate → Score MUST be 0. Do NOT give them any score like 60 or 70.
- Remarks MUST state: "Rejected — Education Criteria Not Met (candidate's actual qualification, JD's required qualification)" or "Rejected — Insufficient Experience (candidate has X yrs, JD requires Y yrs)" or both if both gates fail.
- A rejected candidate CANNOT have a "Good match" or "Excellent match" remark. They are REJECTED, period.

═══════════════════════════════════════════════════════════
STEP 3 — SCORING (ONLY for candidates who PASSED BOTH gates)
═══════════════════════════════════════════════════════════

IMPORTANT: If you are about to score a candidate, verify AGAIN that they passed both gates. If they hold a Diploma when B.Tech is required, STOP — they are rejected, not scored.

For each QUALIFIED candidate, calculate scores in these categories:

| Category           | What to assess                                                          | Max Points |
|--------------------|-------------------------------------------------------------------------|------------|
| Skills Match       | Overlap of technical skills, tools, platforms, domain knowledge, and     | /60        |
|                    | soft skills between resume and JD. Apply tier weights here — missing a  |            |
|                    | Must-have skill (weight 3) costs far more than missing a Nice-to-have   |            |
|                    | (weight 1). Includes keyword matching AND contextual assessment.        |            |
| Role Alignment     | How closely the candidate's past job titles, roles, and actual          | /25        |
|                    | responsibilities align with the JD role. Did they actually DO similar   |            |
|                    | work, not just have similar keywords?                                   |            |
| Experience Depth   | Beyond the minimum gate, reward extra relevant experience. 8 years when | /10        |
|                    | JD asks for 5 scores higher than exactly 5. Consider career progression |            |
|                    | and domain depth.                                                       |            |
| Education Strength | Beyond the minimum gate, reward higher qualifications, certifications,  | /5         |
|                    | relevant specializations, or prestigious institutions.                  |            |

Final Score = Skills Match (/60) + Role Alignment (/25) + Experience Depth (/10) + Education Strength (/5) = /100

Apply JD tier weights (Must-have=3, Should-have=2, Nice-to-have=1) within the Skills Match category. A candidate who nails all Must-haves but misses Nice-to-haves scores much higher than one who has Nice-to-haves but misses Must-haves.

Score interpretation:
- 70-100: Strong match — strong skills overlap, relevant experience, right education
- 40-69: Partial match — some requirements met, notable gaps
- 0-39: Poor match — minimal relevance to the JD

DO NOT INFLATE SCORES. Be strict:
- A candidate should NOT score above 70 unless they genuinely match most Must-have requirements.
- Scores should be spread out (e.g., 56, 63, 68, 84, 89) — not clustered at the same number.
- Different candidates with different profiles MUST get different scores.

═══════════════════════════════════════════════════════════
STEP 4 — OUTPUT FORMAT
═══════════════════════════════════════════════════════════

Respond with ONLY a valid JSON array. No markdown, no code fences, no explanation, no text before or after.

Each element must have exactly these keys:
  "Rank" (number: 1-based by score descending for qualified candidates, 0 for rejected)
  "Candidate Name" (string: full name from resume)
  "Experience (Yrs)" (number: years of RELEVANT experience only)
  "Education" (string: highest qualification with field, e.g. "B.Tech Mechanical", "Diploma in Civil")
  "Current Role" (string: most recent job title)
  "Best Fit Position" (string: what role they actually fit based on their profile)
  "Score (/100)" (number: 0 for rejected, actual score for qualified)
  "Remarks" (string: for qualified — strengths/gaps referencing Must-have requirements; for rejected — "Rejected — Education Criteria Not Met (holds Diploma, B.Tech/B.E. required)" or "Rejected — Insufficient Experience (has 2 yrs, 5 yrs required)")

FINAL REMINDER: A Diploma is NOT equal to B.Tech/B.E. A candidate with a Diploma when B.Tech/B.E. is required MUST be rejected with Score 0. Do NOT score them. Do NOT call them a "good match". They are REJECTED.`;

  // Auth middleware for multer routes
  function authForUpload(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    const session = queryOne(`SELECT user_id, expires_at FROM sessions WHERE token = ?`, [token]);
    if (!session) return res.status(401).json({ error: 'Invalid session' });
    if (Date.now() > session.expires_at) {
      db.run(`DELETE FROM sessions WHERE token = ?`, [token]);
      saveDb();
      return res.status(401).json({ error: 'Session expired' });
    }
    req.userId = session.user_id;
    next();
  }

  app.post('/api/run-skill', authForUpload, upload.array('resumes', 50), async (req, res) => {
    const { jdText, jobTitle, department } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No resume files uploaded' });
    }
    if (!jdText || !jdText.trim()) {
      return res.status(400).json({ success: false, error: 'No JD provided' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'OpenRouter API key not configured' });
    }

    try {
      // Step 1: Parse all PDFs server-side
      console.log(`  Parsing ${files.length} resume PDFs...`);
      const resumeTexts = [];

      for (const file of files) {
        try {
          const parsed = await pdfParse(file.buffer);
          const text = (parsed.text || '').trim();
          if (text.length < 50) {
            resumeTexts.push({ name: file.originalname, text: '[Could not extract text — possibly scanned image PDF]', failed: true });
          } else {
            // Limit each resume to 2000 chars to stay within context
            resumeTexts.push({ name: file.originalname, text: text.substring(0, 2000), failed: false });
          }
          console.log(`    ✓ ${file.originalname}: ${text.length} chars extracted`);
        } catch (parseErr) {
          console.warn(`    ✗ ${file.originalname}: parse failed — ${parseErr.message}`);
          resumeTexts.push({ name: file.originalname, text: `[Failed to parse: ${parseErr.message}]`, failed: true });
        }
      }

      // Step 2: Process in batches of 5 to avoid context limits
      const BATCH_SIZE = 5;
      const allCandidates = [];
      const totalBatches = Math.ceil(resumeTexts.length / BATCH_SIZE);

      const jdBlock = `=== JOB DESCRIPTION ===\nTitle: ${jobTitle || 'Not specified'}\nDepartment: ${department || 'Not specified'}\n\n${jdText}`;

      for (let b = 0; b < totalBatches; b++) {
        const batch = resumeTexts.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
        console.log(`  Batch ${b + 1}/${totalBatches}: scoring ${batch.length} resumes...`);

        const resumeBlock = batch.map(r => `--- RESUME: ${r.name} ---\n${r.text}`).join('\n\n');

        const userInput = `Score the following ${batch.length} resume(s) against this Job Description.\n\n${jdBlock}\n\n=== RESUMES ===\n${resumeBlock}`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': `http://localhost:${PORT}`,
            'X-Title': 'Job Portal - Resume Scorer'
          },
          body: JSON.stringify({
            model: 'deepseek/deepseek-chat-v3-0324',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userInput }
            ],
            max_tokens: 4096,
            temperature: 0.1
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error(`  Batch ${b + 1} failed: ${response.status}`);
          // Add failed entries for this batch
          batch.forEach(r => {
            allCandidates.push({
              "Rank": 0,
              "Candidate Name": r.name.replace(/\.pdf$/i, ''),
              "Experience (Yrs)": 0,
              "Education": "Unknown",
              "Current Role": "Unknown",
              "Best Fit Position": "Unknown",
              "Score (/100)": 0,
              "Remarks": `Rejected — API error on batch ${b + 1}: ${errData.error?.message || response.status}`
            });
          });
          continue;
        }

        const data = await response.json();
        let reply = data.choices?.[0]?.message?.content || '[]';
        console.log(`  Batch ${b + 1} response: ${reply.length} chars`);

        // Parse batch response
        try {
          reply = reply.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          let parsed = JSON.parse(reply);
          if (!Array.isArray(parsed)) {
            const match = reply.match(/\[[\s\S]*\]/);
            parsed = match ? JSON.parse(match[0]) : [];
          }
          allCandidates.push(...parsed);
        } catch (parseErr) {
          // Try to extract JSON array
          const match = reply.match(/\[[\s\S]*\]/);
          if (match) {
            try {
              allCandidates.push(...JSON.parse(match[0]));
            } catch {
              console.error(`  Batch ${b + 1} JSON parse failed`);
              batch.forEach(r => {
                allCandidates.push({
                  "Rank": 0,
                  "Candidate Name": r.name.replace(/\.pdf$/i, ''),
                  "Experience (Yrs)": 0, "Education": "Unknown", "Current Role": "Unknown",
                  "Best Fit Position": "Unknown", "Score (/100)": 0,
                  "Remarks": "Rejected — Failed to parse AI response"
                });
              });
            }
          }
        }
      }

      // Step 3: Re-rank all candidates by score
      allCandidates.sort((a, b) => (b["Score (/100)"] || 0) - (a["Score (/100)"] || 0));
      let rank = 1;
      allCandidates.forEach(c => {
        c["Rank"] = (c["Score (/100)"] || 0) > 0 ? rank++ : 0;
      });

      console.log(`  Total candidates scored: ${allCandidates.length}`);
      res.json({ success: true, result: JSON.stringify(allCandidates) });
    } catch (err) {
      console.error('Skill API error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // SPA catch-all
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  });

  // ── Start ──
  app.listen(PORT, () => {
    console.log(`\n  Job Portal Backend running at:`);
    console.log(`  -> http://localhost:${PORT}\n`);
    console.log(`  SQLite database: ${DB_PATH}`);
    console.log(`  Serving frontend from: ${path.join(__dirname, '..', 'frontend')}\n`);
  });
}

process.on('SIGINT', () => {
  if (db) db.close();
  process.exit(0);
});

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
