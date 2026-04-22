require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const db = require('./db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── Auth Middleware ──
async function requireAuth(req, res, next) {
  try {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const session = await db.queryOne(
      `SELECT user_id, expires_at FROM sessions WHERE token = $1`,
      [token]
    );

    if (!session) return res.status(401).json({ error: 'Invalid session' });
    if (Date.now() > Number(session.expires_at)) {
      await db.run(`DELETE FROM sessions WHERE token = $1`, [token]);
      return res.status(401).json({ error: 'Session expired' });
    }

    req.userId = session.user_id;
    next();
  } catch (err) {
    console.error('requireAuth error:', err);
    res.status(500).json({ error: 'Auth check failed' });
  }
}

// ── Resume Scoring System Prompt (module-level constant) ──
// Extracted from start() to reduce nesting and improve maintainability.
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

// ── AI Response Parser ──
// Extracts a JSON candidate array from raw LLM output, handling markdown
// code fences and partial JSON gracefully. Returns a fallback error row
// per resume when parsing fails completely.
function parseAiReply(reply, batch) {
  const clean = reply.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    let parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) {
      const match = clean.match(/\[[\s\S]*\]/);
      parsed = match ? JSON.parse(match[0]) : [];
    }
    return parsed;
  } catch {
    const match = clean.match(/\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    return batch.map(r => ({
      "Rank": 0,
      "Candidate Name": r.name.replace(/\.pdf$/i, ''),
      "Experience (Yrs)": 0,
      "Education": "Unknown",
      "Current Role": "Unknown",
      "Best Fit Position": "Unknown",
      "Score (/100)": 0,
      "Remarks": "Rejected — Failed to parse AI response"
    }));
  }
}

async function start() {
  await db.initSchema();

  // ── Seed test123 user ──
  const existing = await db.queryOne(`SELECT id FROM users WHERE login_id = $1`, ['test123']);
  if (!existing) {
    const hash = bcrypt.hashSync('123', 10);
    const inserted = await db.queryOne(
      `INSERT INTO users (login_id, password, name) VALUES ($1, $2, $3) RETURNING id`,
      ['test123', hash, 'Test User']
    );
    const defaults = [
      ['jp_drafts', '[]'],
      ['jp_posted', '[]'],
      ['jp_outreach', '{"candidates":[]}']
    ];
    for (const [k, v] of defaults) {
      await db.run(
        `INSERT INTO store (user_id, key, value) VALUES ($1, $2, $3) ON CONFLICT (user_id, key) DO NOTHING`,
        [inserted.id, k, v]
      );
    }
  }

  // ══════════════════════════════════════
  // ── AUTH ROUTES ──
  // ══════════════════════════════════════

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { loginId, password, remember } = req.body;
      if (!loginId || !password) {
        return res.status(400).json({ error: 'Login ID and password are required' });
      }

      const user = await db.queryOne(
        `SELECT id, login_id, password, name FROM users WHERE login_id = $1`,
        [loginId]
      );
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid login ID or password' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const duration = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const expiresAt = Date.now() + duration;

      await db.run(
        `INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)`,
        [token, user.id, expiresAt]
      );

      res.json({
        ok: true,
        token,
        user: { id: user.id, loginId: user.login_id, name: user.name },
        expiresAt
      });
    } catch (err) {
      console.error('login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const token = req.headers['authorization']?.replace('Bearer ', '');
      if (token) await db.run(`DELETE FROM sessions WHERE token = $1`, [token]);
      res.json({ ok: true });
    } catch (err) {
      console.error('logout error:', err);
      res.json({ ok: true });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const user = await db.queryOne(
        `SELECT id, login_id, name FROM users WHERE id = $1`,
        [req.userId]
      );
      if (!user) return res.status(401).json({ error: 'User not found' });
      res.json({ user: { id: user.id, loginId: user.login_id, name: user.name } });
    } catch (err) {
      console.error('/auth/me error:', err);
      res.status(500).json({ error: 'Lookup failed' });
    }
  });

  // ══════════════════════════════════════
  // ── STORE ROUTES ──
  // ══════════════════════════════════════

  app.get('/api/store/:key', requireAuth, async (req, res) => {
    try {
      const row = await db.queryOne(
        `SELECT value FROM store WHERE user_id = $1 AND key = $2`,
        [req.userId, req.params.key]
      );
      if (!row) return res.json({ key: req.params.key, value: null });
      try { res.json({ key: req.params.key, value: JSON.parse(row.value) }); }
      catch { res.json({ key: req.params.key, value: row.value }); }
    } catch (err) {
      console.error('store GET error:', err);
      res.status(500).json({ error: 'Read failed' });
    }
  });

  app.put('/api/store/:key', requireAuth, async (req, res) => {
    try {
      const value = JSON.stringify(req.body.value);
      await db.run(
        `INSERT INTO store (user_id, key, value) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value`,
        [req.userId, req.params.key, value]
      );
      res.json({ ok: true, key: req.params.key });
    } catch (err) {
      console.error('store PUT error:', err);
      res.status(500).json({ error: 'Write failed' });
    }
  });

  app.delete('/api/store/:key', requireAuth, async (req, res) => {
    try {
      await db.run(
        `DELETE FROM store WHERE user_id = $1 AND key = $2`,
        [req.userId, req.params.key]
      );
      res.json({ ok: true, key: req.params.key });
    } catch (err) {
      console.error('store DELETE error:', err);
      res.status(500).json({ error: 'Delete failed' });
    }
  });

  app.get('/api/store', requireAuth, async (req, res) => {
    try {
      const prefix = req.query.prefix || '';
      const rows = await db.queryAll(
        `SELECT key FROM store WHERE user_id = $1 AND key LIKE $2`,
        [req.userId, prefix + '%']
      );
      res.json({ keys: rows.map(r => r.key) });
    } catch (err) {
      console.error('store list error:', err);
      res.status(500).json({ error: 'List failed' });
    }
  });

  app.post('/api/store/bulk', requireAuth, async (req, res) => {
    try {
      const keys = req.body.keys || [];
      if (!keys.length) return res.json({});
      const rows = await db.queryAll(
        `SELECT key, value FROM store WHERE user_id = $1 AND key = ANY($2::text[])`,
        [req.userId, keys]
      );
      const map = new Map(rows.map(r => [r.key, r.value]));
      const results = {};
      for (const key of keys) {
        const v = map.get(key);
        if (v === undefined) { results[key] = null; continue; }
        try { results[key] = JSON.parse(v); } catch { results[key] = v; }
      }
      res.json(results);
    } catch (err) {
      console.error('store bulk error:', err);
      res.status(500).json({ error: 'Bulk read failed' });
    }
  });

  // ══════════════════════════════════════
  // ── SKILL ROUTE (DeepSeek via OpenRouter) ──
  // ══════════════════════════════════════

  app.post('/api/run-skill', requireAuth, upload.array('resumes', 50), async (req, res) => {
    const { jdText, jobTitle, department } = req.body;
    const files = req.files;

    if (!files || files.length === 0)
      return res.status(400).json({ success: false, error: 'No resume files uploaded' });
    if (!jdText || !jdText.trim())
      return res.status(400).json({ success: false, error: 'No JD provided' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey)
      return res.status(500).json({ success: false, error: 'OpenRouter API key not configured' });

    try {
      console.log(`  Parsing ${files.length} resume PDFs...`);
      const resumeTexts = [];

      for (const file of files) {
        try {
          const parsed = await pdfParse(file.buffer);
          const text = (parsed.text || '').trim();
          resumeTexts.push(
            text.length < 50
              ? { name: file.originalname, text: '[Could not extract text — possibly scanned image PDF]', failed: true }
              : { name: file.originalname, text: text.substring(0, 2000), failed: false }
          );
          console.log(`    ✓ ${file.originalname}: ${text.length} chars extracted`);
        } catch (parseErr) {
          console.warn(`    ✗ ${file.originalname}: parse failed — ${parseErr.message}`);
          resumeTexts.push({ name: file.originalname, text: `[Failed to parse: ${parseErr.message}]`, failed: true });
        }
      }

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
            'HTTP-Referer': process.env.APP_BASE_URL || `http://localhost:${PORT}`,
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
          batch.forEach(r => allCandidates.push({
            "Rank": 0, "Candidate Name": r.name.replace(/\.pdf$/i, ''),
            "Experience (Yrs)": 0, "Education": "Unknown", "Current Role": "Unknown",
            "Best Fit Position": "Unknown", "Score (/100)": 0,
            "Remarks": `Rejected — API error: ${errData.error?.message || response.status}`
          }));
          continue;
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || '[]';
        console.log(`  Batch ${b + 1} response: ${reply.length} chars`);
        allCandidates.push(...parseAiReply(reply, batch));
      }

      allCandidates.sort((a, b) => (b["Score (/100)"] || 0) - (a["Score (/100)"] || 0));
      let rank = 1;
      allCandidates.forEach(c => { c["Rank"] = (c["Score (/100)"] || 0) > 0 ? rank++ : 0; });

      console.log(`  Total candidates scored: ${allCandidates.length}`);
      res.json({ success: true, result: JSON.stringify(allCandidates) });
    } catch (err) {
      console.error('Skill API error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Health check
  app.get('/health', (req, res) => res.json({ ok: true }));

  // SPA catch-all
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`\n  Job Portal running at http://localhost:${PORT}`);
    console.log(`  Database: Supabase Postgres (DATABASE_URL)\n`);
  });
}

process.on('SIGINT', async () => {
  try { await db.pool.end(); } catch {}
  process.exit(0);
});

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
