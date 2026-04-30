# Changelog

All notable changes to the One Group Job Portal are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.2.0] — 2026-04-30

### AI Scoring Engine

**Retry Logic for API Failures**
The AI scorer now wraps every resume batch in a retry loop with up to 3 attempts and exponential back-off (2 s, then 4 s between retries). Previously a single transient network error or 429 rate-limit response would silently fail an entire batch and produce a row of placeholder zeros. Now:
- Transient errors and rate-limit responses are automatically retried.
- Genuine 4xx client errors (bad API key, malformed request) are treated as non-retryable and fail immediately with a clear error remark.
- If all retries are exhausted, each candidate in the batch gets an honest error remark instead of silent zeros.

**Auto-Retry for Experience Gate Arithmetic Errors**
The AI occasionally rejects a candidate for "insufficient experience" despite the candidate clearly meeting the posted minimum — a known arithmetic failure mode. Previously, the fix was to flag those candidates with a score of -1 and ask the recruiter to re-run the scorer manually. This release replaces that manual step with an automatic re-score:
1. After the main scoring pass, candidates wrongly rejected for experience are identified deterministically (candidate years ≥ job minimum, but score = 0 and remarks cite experience).
2. Those candidates are immediately re-submitted to the AI in a new batch with an explicit mandatory override instruction confirming they meet Gate A.
3. Up to 2 re-score attempts are made. If the AI still refuses to score after both attempts, the -1 sentinel is used as a last resort and the recruiter is notified.
4. Successful auto-re-scores appear in the table as normal scored candidates — no recruiter action required.

**Enhanced Scoring Prompt**
The system prompt sent to the AI now instructs it to return additional fields per candidate:
- `Resume File Name` — the exact PDF filename from the resume heading, used for accurate candidate-to-file matching.
- `Contact` / `Phone` — best mobile/WhatsApp number extracted from the resume text.
- `Email` — email address extracted from the resume text.

These fields are used as a secondary source of contact information, supplemented by the more reliable regex extraction described below.

---

### Contact Information

**Automatic Extraction from PDFs**
Phone number and email address are now extracted directly from each uploaded PDF's raw text during the scoring process. The extractor uses a three-priority approach:
1. **Labeled fields** — looks for text preceded by "Mobile:", "Phone:", "Contact:", "Cell:", "Tel:" etc. and extracts the number that follows.
2. **Standalone Indian mobile** — falls back to any 10-digit number starting with 6–9 if no label is found.
3. **International format** — handles E.164 and common formatted numbers as a final fallback.

Email extraction uses a standard RFC 5321-compliant regex.

Regex extraction runs independently of AI extraction and is treated as the authoritative source — it overrides AI-provided contact data, which has proven unreliable for phone numbers inside styled PDF boxes.

**Contact Column in Screening and Outreach Tables**
A new Contact column (phone + email) is displayed between the Candidate Name and Experience columns in both the Screening and Outreach views. Populated automatically on every score run; no manual entry required.

---

### Resume PDF Preview

**Full-Screen PDF Viewer**
A full-screen preview modal is available on every candidate row in both the Screening and Outreach views. The viewer renders the actual PDF binary using the browser's native PDF engine (base64 → Blob → `<iframe>`), producing the same rendering quality as Google Drive or a dedicated PDF reader.

The modal header includes:
- Candidate name and filename.
- An **Open** button to view the PDF in a new browser tab.
- A **Download** button to save the file locally.

**Graceful Fallback**
If the PDF binary is not available (e.g., the candidate was scored in an earlier session before this release), the viewer falls back to the extracted plain text. If neither is available, a prompt instructs the recruiter to re-upload and re-score.

**PDF Persistence**
The PDF binary is cached in the browser's `localStorage` (key: `jp_pdfs_<jobId>`) so previews remain available across page refreshes without a server round-trip. For long-term storage, the PDF is also saved to Supabase via the new `resume_files` table (see Backend section).

---

### Best Fit Relocation

**"→ Move" Button**
When the AI marks a candidate as rejected but assigns them a `bestFitRole` that matches another currently open posting, a **→ Move** button appears on their row in the Screening table. Clicking it opens a confirmation modal showing the candidate's name and the target job. Confirming the move transfers the candidate into the target job's screening pipeline without requiring a re-upload or re-score.

---

### Platform Recommendations

**Complete Overhaul of `getAIRecommendations()`**
The AI recommendation engine on the Platform Selection step has been fully rewritten. Previously, only four levels were handled — `Leadership`, `Mid-Level`, `Entry-Level`, and `Intern` — and everything else fell through to a generic "General recommendation based on role profile." message.

The new engine covers all eight levels in the database, with department-aware and title-keyword-aware sub-cases for each:

| Level | Recommended Platforms |
|---|---|
| Intern / Trainee | Internshala → Naukri → Indeed |
| Entry-Level (site / blue-collar) | Apna → Classified Ads → Indeed → Naukri |
| Entry-Level (Finance / Sales / CRM) | Naukri → Indeed → Internshala |
| Mid-Level (site workers) | Apna → Indeed → Classified Ads → Naukri |
| Mid-Level (Finance / Sales / CRM) | Naukri → Indeed → Apna |
| Senior | Naukri → LinkedIn → Indeed (Civil / QC / Sales / CRM / Finance, each variant) |
| Leadership / Manager | LinkedIn → Naukri → Indeed (Civil / PM), Naukri → LinkedIn → IIM Jobs (Finance), LinkedIn → Naukri → Indeed (Sales) |
| Senior Manager / GM | LinkedIn → IIM Jobs → Naukri (Finance / Sales), LinkedIn → Naukri → Indeed (Civil) |
| Vice President / AVP | LinkedIn → IIM Jobs → Naukri (all departments) |
| Director / C-suite | LinkedIn → IIM Jobs → Naukri + headhunting recommendation |

Each recommendation includes platform-specific search keyword suggestions. No role in the database will show the generic fallback message.

The function signature is updated from `getAIRecommendations(level, empType, dept)` to `getAIRecommendations(level, empType, dept, title)`, and the `renderPlatforms()` call now passes `formData.jobTitle` as the fourth argument.

---

### Job Database

**New Role: Quality Control (QC) Engineer**
Added to the **Civil / Engineering** department.

- **Location:** The Saavira, Sector 48, Gurugram
- **Experience:** 4–7 years in QC / Quality Assurance – Construction
- **Salary:** 5–9 LPA
- **Reports to:** Project Manager / Senior Project Engineer
- **Key Competencies:** Quality Control Systems, IS Code Knowledge, Inspection Skills, NCR Management, Concrete & RCC Quality, MS Office
- **JD covers:** Quality Control Plan development, RCC inspection (pre- and post-pour), material approval, NCR issuance and closure, QC documentation for project handover
- **Screening questions:** 5 questions covering QC experience, IS code familiarity, NCR history, inspection types, and availability

---

### Bug Fixes

- **`jobId is not defined` — Screening table crash.** `rerenderResults()` was calling `renderCandidateRow(c, i, jobMeta.jobTitle, jobId)` but `jobId` was not in scope at the call site; only `jobMeta` was available. Fixed by changing to `jobMeta.jobId`. This caused the entire screening table to fail to render after scoring.

- **Contact info and PDF data lost on re-score.** The deduplication logic in `processImportedCandidates()` was identifying existing scored candidates (score > 0) and skipping them entirely, discarding the newly extracted phone, email, resume text, and PDF binary. Fixed with a partial-merge strategy: for scored candidates, only `phone`, `email`, `resumeText`, and `pdfBase64` are updated; score, tier, status, referral flags, and recruiter-set fields are preserved.

- **Incorrect candidate-to-resume matching.** The original `attachResumeMetadata()` matched candidates to their original PDF by upload position (array index). When the AI returns candidates in a different order from the upload batch, the wrong PDF would be linked to the wrong candidate — or the match would fail entirely. Fixed by `findResumeForCandidate()`, which tries three strategies in order: exact filename match → substring filename match → all name tokens present in filename. Wrong matches produce a blank contact/preview rather than misattributed data.

- **JavaScript syntax error breaking entire page.** An unescaped apostrophe inside a single-quoted string in `getAIRecommendations()` (`it's`) caused a parse error that prevented the entire `<script>` block from loading. As a result, no JavaScript functions were available — including `doLogin()` — making the portal appear frozen at the sign-in screen. Fixed by escaping to `it\'s`.

---

### Backend

**New Supabase Table: `resume_files`**
Added via `CREATE TABLE IF NOT EXISTS` — non-destructive, safe to run against a database that already has the table.

Schema (worktree version — keyed by job + candidate for efficient per-job lookups):
```sql
CREATE TABLE IF NOT EXISTS resume_files (
  user_id      INTEGER NOT NULL REFERENCES users(id),
  job_id       TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  mime_type    TEXT NOT NULL DEFAULT 'application/pdf',
  content      BYTEA NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, job_id, candidate_id)
);
```

**New API Endpoints**

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/resumes/bulk` | Batch-insert or update PDFs for multiple candidates; uses `ON CONFLICT DO UPDATE` so re-uploads overwrite cleanly |
| `POST` | `/api/resumes/available` | Given a job ID and list of candidate IDs, returns which candidates have a stored PDF and their serve URLs |
| `GET` | `/api/resumes/:jobId/:candidateId` | Serve a specific candidate's PDF binary with correct MIME type and cache headers |

**Helpers Added to `server.js`**

| Function | Purpose |
|---|---|
| `extractPhoneFromText(text)` | Three-priority regex phone extractor (labeled field → Indian mobile → international) |
| `extractEmailFromText(text)` | RFC-compliant email regex extractor |
| `normName(name)` | Name normalizer — lowercases, strips `.pdf`, collapses whitespace |
| `resumeKey(value)` | Alphanumeric-only key for fuzzy name matching |
| `nameTokens(value)` | Splits a normalized name into tokens for all-tokens-present matching |
| `findResumeForCandidate(candidateName, resumeTexts, resumeFileName)` | Three-strategy candidate-to-resume linker |
| `attachResumeFields(candidates, batch)` | Links phone, email, resumeText, and pdfBase64 to scored candidates using `findResumeForCandidate` |

**Other Backend Changes**
- JSON body size limit raised from `10 MB` to `250 MB` to support large multi-file resume batches.
- Resume PDF extraction now stores `pdfBase64` and extracts `phone` + `email` during the parse phase; no longer inserts into `resume_files` during scoring (PDF persistence is handled separately via `/api/resumes/bulk`).
- Post-scoring step attaches `_resumeText`, `_pdfBase64`, and regex-extracted contacts to each candidate row using `findResumeForCandidate` for accurate file-to-candidate linking.

---

## [1.0.0] — 2026-03-01 (Initial Release)

- Internal HR job portal for One Group.
- Job posting creation wizard with 130+ pre-loaded roles across Civil, Finance, Sales, and CRM departments.
- AI-powered resume screening via DeepSeek v3 (OpenRouter).
- Candidate pipeline management with tier classification (Shortlisted / Borderline / Rejected).
- Outreach pipeline for managing candidate communication status.
- Supabase (PostgreSQL) backend; Hostinger hosting.
- Single-page application: Tailwind CSS + Vanilla JS frontend, Express.js backend.
