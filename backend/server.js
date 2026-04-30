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
app.use(express.json({ limit: '250mb' }));
// Serve frontend — HTML files always bypass cache so browser picks up JS changes immediately.
// Assets (CSS, JS, images) can be cached normally.
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

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

CRITICAL — AUTHORITATIVE REQUIREMENTS BLOCK:
If the JD begins with a section labelled "=== POSTED JOB REQUIREMENTS (AUTHORITATIVE — THESE OVERRIDE ANY CONFLICTING JD TEXT) ===", treat ALL values in that section as the definitive, binding requirements for this role. They STRICTLY override any different or conflicting values found anywhere in the "FULL JOB DESCRIPTION" section that follows. In particular:
- Use the "Experience Required" value from the authoritative block as the ONLY threshold for Gate A experience checks. Ignore any different experience figure in the full JD text.
- Use "Required Skills" from the authoritative block as the primary Must-have skills list.
- Use "Job Level" and "Employment Type" from the authoritative block for role alignment scoring.

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

STEP A1 — Extract the minimum: Read the "Experience Required" field from the POSTED JOB REQUIREMENTS section first. Parse it as a number (e.g. "12+ years" → minimum = 12, "5-8 years" → minimum = 5, "Minimum 10 years" → minimum = 10). If no POSTED JOB REQUIREMENTS section, extract from the JD text. Call this value MIN_EXP.

STEP A2 — Measure the candidate: From the resume, calculate the candidate's RELEVANT years of experience. "Relevant" means experience in the SAME domain/field as the JD (e.g. civil construction for a civil role). Call this value CAND_EXP.

STEP A3 — ARITHMETIC GATE (MANDATORY EXPLICIT CHECK — DO NOT SKIP):
  Compute: does CAND_EXP >= MIN_EXP?
  → If YES (CAND_EXP >= MIN_EXP): candidate PASSES Gate A. Continue to Gate B.
  → If NO  (CAND_EXP < MIN_EXP): candidate FAILS Gate A. Score = 0. REJECTED.

  ★ CRITICAL EXAMPLES — follow these exactly:
    MIN_EXP=12, CAND_EXP=13 → 13 >= 12 → TRUE → PASS (do NOT reject)
    MIN_EXP=12, CAND_EXP=12 → 12 >= 12 → TRUE → PASS (do NOT reject)
    MIN_EXP=12, CAND_EXP=11 → 11 >= 12 → FALSE → REJECT (Score = 0)
    MIN_EXP=15, CAND_EXP=13 → 13 >= 15 → FALSE → REJECT (Score = 0)
    MIN_EXP=5,  CAND_EXP=8  → 8 >= 5  → TRUE  → PASS (do NOT reject)

  ★ A candidate with MORE experience than the minimum is NEVER rejected for experience. More is always better or equal.

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
  "Resume File Name" (string: exact PDF file name from the "--- RESUME: filename.pdf ---" heading)
  "Candidate Name" (string: full name from resume)
  "Contact" (string: best candidate contact number, preferably mobile/WhatsApp number, or null if not found)
  "Phone" (string: candidate's phone/mobile number extracted from resume, or null if not found)
  "Email" (string: candidate's email address extracted from resume, or null if not found)
  "Experience (Yrs)" (number: years of RELEVANT experience only)
  "Education" (string: highest qualification with field, e.g. "B.Tech Mechanical", "Diploma in Civil")
  "Current Role" (string: most recent job title)
  "Best Fit Position" (string: what role they actually fit based on their profile)
  "Score (/100)" (number: 0 for rejected, actual score for qualified)
  "Remarks" (string: for qualified — strengths/gaps referencing Must-have requirements; for rejected — "Rejected — Education Criteria Not Met (holds Diploma, B.Tech/B.E. required)" or "Rejected — Insufficient Experience (has 2 yrs, 5 yrs required)")

Important:
- Extract Contact/Phone/Email from the resume text itself.
- Use the exact PDF file name shown in the resume heading for "Resume File Name".
- Do not invent contact details. If unavailable, return null.
- PDF preview is attached by the application from the uploaded file; do not include base64 or resume text in your response.

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
    return attachResumeFields(parsed, batch);
  } catch {
    const match = clean.match(/\[[\s\S]*\]/);
    if (match) {
      try { return attachResumeFields(JSON.parse(match[0]), batch); } catch {}
    }
    return attachResumeFields(batch.map(r => ({
      "Rank": 0,
      "Resume File Name": r.name,
      "Candidate Name": r.name.replace(/\.pdf$/i, ''),
      "Contact": r.phone || null,
      "Phone": r.phone || null,
      "Email": r.email || null,
      "Experience (Yrs)": 0,
      "Education": "Unknown",
      "Current Role": "Unknown",
      "Best Fit Position": "Unknown",
      "Score (/100)": 0,
      "Remarks": "Rejected — Failed to parse AI response"
    })), batch);
  }
}

// ── Name normalizer (for matching AI output names to resume file names) ──
const normName = name =>
  String(name || '').trim().toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ');

const resumeKey = value => normName(value).replace(/[^a-z0-9]/g, '');
const nameTokens = value => normName(value).split(' ').filter(token => token.length > 1);

// ── Contact extractors — regex-based, more reliable than AI extraction ──
function extractPhoneFromText(text) {
  const phones = new Set();
  const patterns = [
    /(?:\+?91[\s.-]?)?(?:0[\s.-]?)?([6-9]\d(?:[\s.-]?\d){8})\b/g,
    /\b([6-9]\d{9})\b/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(String(text || ''))) !== null) {
      const digits = match[1].replace(/\D/g, '');
      if (/^[6-9]\d{9}$/.test(digits)) phones.add(digits);
    }
  }
  if (phones.size) return Array.from(phones)[0];

  // Priority 1: labeled field (Mobile: xxx, Phone: xxx, Contact: xxx, etc.)
  const labeled = text.match(/(?:mobile|mob|phone|ph\.?|contact no|contact|cell|tel)[\s:.\-]*([+\d][\d\s\-().]{6,14}\d)/i);
  if (labeled) {
    const clean = labeled[1].replace(/[\s\-().]/g, '').trim();
    if (clean.length >= 7) return clean;
  }
  // Priority 2: standalone Indian mobile (10 digits starting with 6-9)
  const indian = text.match(/\b([6-9]\d{9})\b/);
  if (indian) return indian[1];
  // Priority 3: international format
  const intl = text.match(/\b(\+?\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,5}[\s\-]?\d{3,5})\b/);
  if (intl) {
    const clean = intl[1].replace(/[\s\-().]/g, '').trim();
    if (clean.length >= 7) return clean;
  }
  return null;
}

function extractEmailFromText(text) {
  const match = text.match(/\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/);
  return match ? match[0].toLowerCase() : null;
}

// Find the original resume entry without guessing by upload order. A wrong
// phone/PDF is worse than a blank cell, so matching must be explicit.
function findResumeForCandidate(candidateName, resumeTexts, resumeFileName = '') {
  const expectedFileKey = resumeKey(resumeFileName);
  if (expectedFileKey) {
    const byExactFile = resumeTexts.find(r => resumeKey(r.name) === expectedFileKey);
    if (byExactFile) return byExactFile;
    const byContainedFile = resumeTexts.find(r => {
      const key = resumeKey(r.name);
      return key && (key.includes(expectedFileKey) || expectedFileKey.includes(key));
    });
    if (byContainedFile) return byContainedFile;
  }

  const normCand = normName(candidateName);
  const candidateKey = resumeKey(normCand);
  const exactName = resumeTexts.find(r => resumeKey(r.name) === candidateKey);
  if (exactName) return exactName;

  const parts = nameTokens(normCand);
  if (parts.length < 2) return null;
  return resumeTexts.find(r => {
    const fileTokens = new Set(nameTokens(r.name));
    return parts.every(part => fileTokens.has(part));
  }) || null;
}

function attachResumeFields(candidates, batch) {
  return (Array.isArray(candidates) ? candidates : []).map(candidate => {
    const entry = findResumeForCandidate(
      candidate['Candidate Name'],
      batch,
      candidate['Resume File Name']
    );
    if (!entry) return candidate;

    return {
      ...candidate,
      "Resume File Name": candidate["Resume File Name"] || entry.name,
      "Contact": entry.phone || null,
      "Phone": entry.phone || null,
      "Email": entry.email || null,
      "_resumeText": entry.text || candidate["_resumeText"] || null,
      "_pdfBase64": entry.pdfBase64 || candidate["_pdfBase64"] || null,
      "_resumeMatched": true,
    };
  });
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

  // Persist resume PDFs separately from candidate JSON. Candidate rows only keep
  // a lightweight preview URL, while the actual file stays server-side.
  app.post('/api/resumes/bulk', requireAuth, async (req, res) => {
    try {
      const files = Array.isArray(req.body.files) ? req.body.files : [];
      if (!files.length) return res.json({ ok: true, saved: [] });

      const saved = [];
      for (const file of files) {
        const jobId = String(file.jobId || '').trim();
        const candidateId = String(file.candidateId || '').trim();
        const rawBase64 = String(file.pdfBase64 || '').replace(/^data:application\/pdf;base64,/, '').trim();
        if (!jobId || !candidateId || !rawBase64) continue;

        const content = Buffer.from(rawBase64, 'base64');
        if (!content.length) continue;

        const fileName = String(file.fileName || 'resume.pdf').slice(0, 255);
        await db.run(
          `INSERT INTO resume_files (user_id, job_id, candidate_id, file_name, mime_type, content, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (user_id, job_id, candidate_id)
           DO UPDATE SET file_name = EXCLUDED.file_name,
                         mime_type = EXCLUDED.mime_type,
                         content = EXCLUDED.content,
                         updated_at = NOW()`,
          [req.userId, jobId, candidateId, fileName, 'application/pdf', content]
        );
        saved.push({ candidateId, fileName, url: `/api/resumes/${encodeURIComponent(jobId)}/${encodeURIComponent(candidateId)}` });
      }

      res.json({ ok: true, saved });
    } catch (err) {
      console.error('resume bulk save error:', err);
      res.status(500).json({ error: 'Resume save failed' });
    }
  });

  app.post('/api/resumes/available', requireAuth, async (req, res) => {
    try {
      const jobId = String(req.body.jobId || '').trim();
      const candidateIds = (Array.isArray(req.body.candidateIds) ? req.body.candidateIds : []).map(String);
      if (!jobId || !candidateIds.length) return res.json({ resumes: {} });

      const rows = await db.queryAll(
        `SELECT candidate_id, file_name
           FROM resume_files
          WHERE user_id = $1 AND job_id = $2 AND candidate_id = ANY($3::text[])`,
        [req.userId, jobId, candidateIds]
      );
      const resumes = {};
      rows.forEach(row => {
        resumes[row.candidate_id] = {
          fileName: row.file_name,
          url: `/api/resumes/${encodeURIComponent(jobId)}/${encodeURIComponent(row.candidate_id)}`
        };
      });
      res.json({ resumes });
    } catch (err) {
      console.error('resume availability error:', err);
      res.status(500).json({ error: 'Resume lookup failed' });
    }
  });

  app.get('/api/resumes/:jobId/:candidateId', requireAuth, async (req, res) => {
    try {
      const row = await db.queryOne(
        `SELECT file_name, mime_type, content
           FROM resume_files
          WHERE user_id = $1 AND job_id = $2 AND candidate_id = $3`,
        [req.userId, req.params.jobId, req.params.candidateId]
      );
      if (!row) return res.status(404).send('Resume not found');

      const safeName = String(row.file_name || 'resume.pdf').replace(/["\r\n]/g, '');
      res.setHeader('Content-Type', row.mime_type || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.send(row.content);
    } catch (err) {
      console.error('resume read error:', err);
      res.status(500).send('Resume read failed');
    }
  });

  app.post('/api/run-skill', requireAuth, upload.array('resumes', 50), async (req, res) => {
    const { jdText, jobTitle, department, jobExperience, minExperienceYears } = req.body;
    const files = req.files;
    // Parse the minimum experience as a number for post-processing gate validation
    const minExpYears = minExperienceYears ? parseInt(minExperienceYears) : null;

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
          const pdfBase64 = file.buffer.toString('base64');
          if (text.length < 50) {
            resumeTexts.push({ name: file.originalname, text: '[Could not extract text — possibly scanned image PDF]', phone: null, email: null, pdfBase64, failed: true });
          } else {
            // Extract phone/email directly from raw PDF text — regex is more reliable than AI
            const phone = extractPhoneFromText(text);
            const email = extractEmailFromText(text);
            resumeTexts.push({ name: file.originalname, text: text.substring(0, 3000), phone, email, pdfBase64, failed: false });
            console.log(`    ✓ ${file.originalname}: ${text.length} chars | phone: ${phone || 'not found'} | email: ${email || 'not found'} | pdf: ${Math.round(file.buffer.length/1024)}KB`);
          }
        } catch (parseErr) {
          console.warn(`    ✗ ${file.originalname}: parse failed — ${parseErr.message}`);
          resumeTexts.push({ name: file.originalname, text: `[Failed to parse: ${parseErr.message}]`, phone: null, email: null, pdfBase64: file.buffer.toString('base64'), failed: true });
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

        // ── Batch API call with up to 3 retries (exponential back-off) ──
        const MAX_BATCH_RETRIES = 3;
        let batchScored = false;

        for (let attempt = 1; attempt <= MAX_BATCH_RETRIES && !batchScored; attempt++) {
          try {
            if (attempt > 1) {
              const delay = (attempt - 1) * 2000; // 2 s, 4 s
              console.log(`    Batch ${b + 1} retry ${attempt}/${MAX_BATCH_RETRIES} in ${delay / 1000}s…`);
              await new Promise(r => setTimeout(r, delay));
            }

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
              const errMsg = errData.error?.message || `HTTP ${response.status}`;
              // 4xx client errors (except 429 rate-limit) are not retryable
              if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                console.error(`  Batch ${b + 1} client error (not retrying): ${errMsg}`);
                batch.forEach(r => allCandidates.push({
                  "Rank": 0, "Candidate Name": r.name.replace(/\.pdf$/i, ''),
                  "Experience (Yrs)": 0, "Education": "Unknown", "Current Role": "Unknown",
                  "Best Fit Position": "Unknown", "Score (/100)": 0,
                  "Remarks": `Rejected — API error: ${errMsg}`
                }));
                batchScored = true; // handled (as an error row)
              } else {
                console.warn(`  Batch ${b + 1} attempt ${attempt}/${MAX_BATCH_RETRIES} failed: ${errMsg}`);
                if (attempt === MAX_BATCH_RETRIES) {
                  batch.forEach(r => allCandidates.push({
                    "Rank": 0, "Candidate Name": r.name.replace(/\.pdf$/i, ''),
                    "Experience (Yrs)": 0, "Education": "Unknown", "Current Role": "Unknown",
                    "Best Fit Position": "Unknown", "Score (/100)": 0,
                    "Remarks": `Rejected — API error after ${MAX_BATCH_RETRIES} retries: ${errMsg}`
                  }));
                  batchScored = true;
                }
              }
              continue;
            }

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || '[]';
            console.log(`  Batch ${b + 1} response (attempt ${attempt}): ${reply.length} chars`);
            allCandidates.push(...parseAiReply(reply, batch));
            batchScored = true;

          } catch (fetchErr) {
            console.warn(`  Batch ${b + 1} attempt ${attempt}/${MAX_BATCH_RETRIES} network error: ${fetchErr.message}`);
            if (attempt === MAX_BATCH_RETRIES) {
              batch.forEach(r => allCandidates.push({
                "Rank": 0, "Candidate Name": r.name.replace(/\.pdf$/i, ''),
                "Experience (Yrs)": 0, "Education": "Unknown", "Current Role": "Unknown",
                "Best Fit Position": "Unknown", "Score (/100)": 0,
                "Remarks": `Rejected — Network error: ${fetchErr.message}`
              }));
              batchScored = true;
            }
          }
        }
      }

      // ── Post-processing: detect and AUTO-RETRY AI experience gate arithmetic errors ──
      // When the AI wrongly rejects a candidate despite them meeting the minimum experience,
      // we immediately re-score just those candidates rather than flagging for manual re-run.
      // The -1 sentinel is only used as a last resort if the auto-retry also fails.
      if (minExpYears !== null && !isNaN(minExpYears)) {
        // Step 1 — identify candidates the AI incorrectly rejected for experience
        const rescoreNeeded = [];
        allCandidates.forEach((c, idx) => {
          const score = c['Score (/100)'];
          const remarks = (c['Remarks'] || '').toLowerCase();
          const candidateYears = parseFloat(c['Experience (Yrs)']) || 0;
          if (score === 0 && remarks.includes('insufficient experience') && candidateYears >= minExpYears) {
            console.warn(`  ⚠ Experience gate error: "${c['Candidate Name']}" has ${candidateYears} yrs ≥ ${minExpYears} min — AI wrongly rejected. Auto-retrying.`);
            rescoreNeeded.push({ idx, candidate: c, candidateYears });
          }
        });

        // Step 2 — auto-retry those candidates with an explicit gate-override note
        if (rescoreNeeded.length > 0) {
          console.log(`  Auto-retrying ${rescoreNeeded.length} experience-gate-corrected candidate(s)…`);
          try {
            // Re-attach original resume texts (best-effort name matching)
            const rescoreBatch = rescoreNeeded.map(({ candidate }) =>
              findResumeForCandidate(candidate['Candidate Name'], resumeTexts, candidate['Resume File Name']) ||
              { name: candidate['Candidate Name'], text: '[Resume text unavailable]', failed: false }
            );

            const rescoreNote =
              `\n\n⚠ MANDATORY OVERRIDE: The following candidates have been VERIFIED to meet Gate A ` +
              `(experience ≥ ${minExpYears} years). Do NOT reject any of them for experience. ` +
              `Proceed directly to full skills/fit scoring (Step 3+) for each candidate.`;
            const rescoreInput =
              `Score the following ${rescoreBatch.length} resume(s) against this Job Description.${rescoreNote}\n\n` +
              `${jdBlock}\n\n=== RESUMES ===\n` +
              rescoreBatch.map(r => `--- RESUME: ${r.name} ---\n${r.text}`).join('\n\n');

            const MAX_GATE_RETRIES = 2;
            for (let attempt = 1; attempt <= MAX_GATE_RETRIES; attempt++) {
              if (attempt > 1) await new Promise(r => setTimeout(r, 2000));
              try {
                const retryRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': process.env.APP_BASE_URL || `http://localhost:${PORT}`,
                    'X-Title': 'Job Portal - Resume Scorer (Gate Retry)'
                  },
                  body: JSON.stringify({
                    model: 'deepseek/deepseek-chat-v3-0324',
                    messages: [
                      { role: 'system', content: SYSTEM_PROMPT },
                      { role: 'user', content: rescoreInput }
                    ],
                    max_tokens: 4096,
                    temperature: 0.1
                  })
                });

                if (!retryRes.ok) {
                  console.warn(`    Gate retry attempt ${attempt} HTTP ${retryRes.status}`);
                  continue;
                }

                const retryData = await retryRes.json();
                const retryReply = retryData.choices?.[0]?.message?.content || '[]';
                const rescored = parseAiReply(retryReply, rescoreBatch);

                rescored.forEach((rc, i) => {
                  // Match by name first, fall back to position index
                  const item = rescoreNeeded.find(({ candidate }) =>
                    normName(candidate['Candidate Name']) === normName(rc['Candidate Name'])
                  ) || rescoreNeeded[i];

                  if (!item) return;

                  if (rc['Score (/100)'] > 0) {
                    allCandidates[item.idx] = rc;
                    console.log(`    ✓ Auto-re-scored "${rc['Candidate Name']}": ${rc['Score (/100)']}`);
                  } else {
                    // Still no score — fall back to -1 sentinel so user can manually re-run
                    allCandidates[item.idx]['Score (/100)'] = -1;
                    allCandidates[item.idx]['Remarks'] =
                      `Experience gate auto-corrected: candidate has ${item.candidateYears} yrs relevant experience, ` +
                      `requirement is ${jobExperience || minExpYears + '+ years'} — they MEET the minimum. ` +
                      `Full skills/fit scoring could not be completed due to AI error. Please re-run the scorer for a complete assessment.`;
                    console.warn(`    ✗ Auto-re-score still failed for "${item.candidate['Candidate Name']}", flagging as re-score`);
                  }
                });

                break; // exit retry loop on a successful HTTP response
              } catch (retryFetchErr) {
                console.warn(`    Gate retry attempt ${attempt} network error: ${retryFetchErr.message}`);
              }
            }

            // Any candidates the retry didn't update (still at 0) → -1 sentinel
            rescoreNeeded.forEach(({ idx, candidateYears }) => {
              if (allCandidates[idx]['Score (/100)'] === 0) {
                allCandidates[idx]['Score (/100)'] = -1;
                allCandidates[idx]['Remarks'] =
                  `Experience gate auto-corrected: candidate has ${candidateYears} yrs relevant experience, ` +
                  `requirement is ${jobExperience || minExpYears + '+ years'} — they MEET the minimum. ` +
                  `Full skills/fit scoring could not be completed due to AI error. Please re-run the scorer for a complete assessment.`;
              }
            });

          } catch (gateRetryErr) {
            console.error('  Gate auto-retry block failed:', gateRetryErr.message);
            // Fall back: flag all as -1 so the frontend can prompt a manual re-run
            rescoreNeeded.forEach(({ idx, candidateYears }) => {
              allCandidates[idx]['Score (/100)'] = -1;
              allCandidates[idx]['Remarks'] =
                `Experience gate auto-corrected: candidate has ${candidateYears} yrs relevant experience, ` +
                `requirement is ${jobExperience || minExpYears + '+ years'} — they MEET the minimum. ` +
                `Full skills/fit scoring could not be completed due to AI error. Please re-run the scorer for a complete assessment.`;
            });
          }
        }
      }

      // Attach extracted resume text, visual PDF, and regex-sourced contacts to each candidate.
      allCandidates.forEach(c => {
        const entry = findResumeForCandidate(c['Candidate Name'], resumeTexts, c['Resume File Name']);
        if (entry) {
          c['_resumeText'] = entry.text;
          c['_pdfBase64']  = entry.pdfBase64 || null;   // for visual PDF preview in browser
          c['_resumeMatched'] = true;
          // Regex wins over AI for phone/email — far more reliable
          c['Contact'] = entry.phone || null;
          c['Phone'] = entry.phone || null;
          c['Email'] = entry.email || null;
        }
      });

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
