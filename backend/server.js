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

// Multer — store uploads in memory (no disk needed)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'job_portal.db');

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
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      login_id TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name     TEXT DEFAULT ''
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

    const user = queryOne(`SELECT id, login_id, password, name FROM users WHERE login_id = ?`, [loginId]);
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
      user: { id: user.id, loginId: user.login_id, name: user.name },
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
    const user = queryOne(`SELECT id, login_id, name FROM users WHERE id = ?`, [req.userId]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user: { id: user.id, loginId: user.login_id, name: user.name } });
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

  // Self-contained system prompt — no external file dependency
  const SYSTEM_PROMPT = `You are a strict, precise resume screening assistant. Your job is to evaluate resumes against a Job Description (JD) and return accurate scores.

RULES YOU MUST FOLLOW:

1. ELIGIBILITY GATES — Apply these FIRST as binary pass/fail checks before scoring:

   GATE A — EXPERIENCE:
   - Extract the minimum experience requirement from the JD (e.g. "3-5 years", "minimum 5 years").
   - Extract the candidate's total relevant experience from their resume.
   - "Relevant" means experience in the SAME domain/field as the JD. Civil engineering experience does NOT count for a Mechanical role. IT experience does NOT count for a Construction role.
   - If candidate's relevant experience is LESS than the JD minimum → REJECTED. Set Score to 0.

   GATE B — EDUCATION:
   - Extract the required education from the JD (e.g. "ITI Mechanic", "B.Tech Civil", "Diploma in Mechanical Engineering").
   - Match the EXACT field of study. "Diploma in Civil Engineering" does NOT satisfy "Diploma in Mechanical Engineering". "B.Tech Civil" does NOT satisfy "ITI Mechanic".
   - Only treat widely recognized equivalents as matching (e.g. PGDM = MBA).
   - If candidate does not hold the required qualification in the required field → REJECTED. Set Score to 0.

   If a candidate fails EITHER gate → Status is "Rejected", Score is 0, and Remarks must state the specific rejection reason.

2. SCORING — Only for candidates who PASS BOTH gates:

   | Category              | What to assess                                                    | Weight |
   |-----------------------|-------------------------------------------------------------------|--------|
   | Skills Match          | Overlap between resume skills and JD required/preferred skills    | 60%    |
   | Role Alignment        | Has the candidate done similar work in similar roles before?      | 25%    |
   | Experience Depth      | Extra experience beyond the JD minimum (more years = higher)      | 10%    |
   | Education Strength    | Higher qualifications or certifications beyond the JD minimum     | 5%     |

   Score interpretation:
   - 80-100: Excellent match — strong skills overlap, relevant experience, right education
   - 60-79: Good match — most requirements met, some gaps
   - 40-59: Partial match — significant gaps but some relevance
   - 20-39: Poor match — minimal relevance to the JD
   - 0-19: Very poor match — almost no relevance

   DO NOT inflate scores. Most candidates should NOT score above 70 unless they are genuinely strong matches.

3. OUTPUT FORMAT:
   - Respond with ONLY a valid JSON array. No markdown, no code fences, no explanation, no text before or after.
   - Each element must have exactly these keys:
     "Rank" (number: 1-based by score descending, 0 for rejected)
     "Candidate Name" (string: full name from resume)
     "Experience (Yrs)" (number: years of RELEVANT experience only)
     "Education" (string: highest qualification with field, e.g. "B.Tech Mechanical")
     "Current Role" (string: most recent job title)
     "Best Fit Position" (string: what role they actually fit based on their profile)
     "Score (/100)" (number: 0-100, or 0 if rejected)
     "Remarks" (string: for qualified — key strengths/gaps; for rejected — specific reason like "Rejected — No mechanical qualification; holds Civil Diploma")`;

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
