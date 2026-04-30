# v1.2 Release — Surgical Push Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Commit and push only the three changed source files to GitHub, tag the release as v1.2, and publish a GitHub Release — without touching unrelated files or any live user data.

**Architecture:** All changes are in `backend/server.js`, `backend/db.js`, and `frontend/index.html`. The `Skill Prompts/leave-credit.md` file also has local changes but is an internal Claude file and must be explicitly excluded. The Supabase data (user job openings, screening/outreach history) lives entirely in the `key_value_store` table and is not touched by any of these changes. The new `resume_files` table added in `db.js` uses `CREATE TABLE IF NOT EXISTS` — it will be silently skipped if it already exists, guaranteeing zero data loss.

**Tech Stack:** Git CLI, GitHub CLI (`gh`), Node/Express backend, Vanilla JS + Tailwind frontend, Supabase (PostgreSQL)

---

## Safety Guarantees — Read Before Executing

| Risk | Why it's safe |
|---|---|
| User's 3 live job openings (OG-2026-003/004/005) | Stored in Supabase `key_value_store` table. No code change touches that table. |
| Screening / outreach history | Same `key_value_store` table, keyed by `jp_screening_*` and `jp_outreach_*`. Untouched. |
| `resume_files` schema addition | Uses `CREATE TABLE IF NOT EXISTS` — safe to run against a DB that already has the table. |
| localStorage PDF cache | Browser-side storage keyed `jp_pdfs_<jobId>`. Not affected by server deployments. |
| `Skill Prompts/leave-credit.md` | **Deliberately excluded** from every `git add` command below. |

---

## File Map

| File | Action | Why |
|---|---|---|
| `backend/db.js` | **Modified** — add `resume_files` table | Enables server-side PDF storage |
| `backend/server.js` | **Use worktree version** — complete rewrite of scoring pipeline | Worktree has all changes; main OG server.js is an older intermediate version |
| `frontend/index.html` | **Modified** — contact column, preview modal, AI recs, QC job | Core feature frontend |
| `CHANGELOG.md` | **Created** — full v1.2 release notes | Release documentation |
| `Skill Prompts/leave-credit.md` | **NOT touched** — internal Claude file | Must not go into job portal repo |

> **Important:** Before staging, copy the worktree `server.js` to the main repo:
> ```bash
> cp "C:\Users\Lenovo\OneDrive\Desktop\Work\OG\.claude\worktrees\great-lumiere-2698c6\backend\server.js" \
>    "C:\Users\Lenovo\OneDrive\Desktop\Work\OG\backend\server.js"
> ```
> The worktree version includes all user-made scoring improvements (retry logic, auto-retry for gate errors, enhanced prompt, smart candidate matching) which are absent from the main OG copy.

---

## Task 1 — Pre-Flight Verification

**Files:** None created or modified — read-only checks only

- [ ] **Step 1: Confirm you are in the right directory**

```bash
cd "C:\Users\Lenovo\OneDrive\Desktop\Work\OG"
git remote -v
```

Expected output must include:
```
onecity  https://github.com/tech1onegroup/Job-Portal.git (push)
```

- [ ] **Step 2: Verify the exact files with local changes**

```bash
git status --short
```

Expected — exactly these four lines (order may vary):
```
 M Skill Prompts/leave-credit.md
 M backend/db.js
 M backend/server.js
 M frontend/index.html
```

If you see any additional files, **stop and investigate** before proceeding.

- [ ] **Step 3: Confirm the three source files contain our expected additions**

```bash
git diff --stat HEAD -- backend/db.js backend/server.js frontend/index.html
```

You should see insertions only (no surprise deletions of large blocks):

```
 backend/db.js      |  11 +
 backend/server.js  | 121 +++++++
 frontend/index.html| 692 ++++++++++++++++++++++++++++++++++--
```

Approximate numbers — minor variation is fine. If `frontend/index.html` shows more than ~500 deletions, investigate before committing.

- [ ] **Step 4: Confirm `Skill Prompts/leave-credit.md` is NOT staged and will NOT be added**

```bash
git diff --name-only HEAD
```

`Skill Prompts/leave-credit.md` must appear here (unstaged, still dirty). That is correct — we will leave it unstaged throughout.

---

## Task 2 — Create CHANGELOG.md

**Files:**
- Create: `CHANGELOG.md` (repo root)

- [ ] **Step 1: Create the CHANGELOG file**

Create `C:\Users\Lenovo\OneDrive\Desktop\Work\OG\CHANGELOG.md` with this exact content:

```markdown
# Changelog

All notable changes to the One Group Job Portal are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.2.0] — 2026-04-30

### Added

#### Contact Info Column
- Phone number and email address are now auto-extracted from uploaded PDFs using regex matching (no AI dependency).
- Both fields appear in a new **Contact** column between Candidate Name and Experience in the Screening and Outreach tables.
- Extraction works even when contact details are inside styled boxes or tables in the PDF.

#### Resume PDF Preview Modal
- New full-screen modal (Google Drive-style) lets recruiters view any candidate's resume directly inside the portal.
- Renders native PDF via browser's built-in PDF engine (`base64 → Blob → <iframe>`).
- Falls back to extracted text if PDF binary is not available.
- Available in both Screening and Outreach views via a **Preview** button on each candidate row.

#### PDF Storage (Server-Side)
- PDFs ≤ 3 MB are now stored in the Supabase `resume_files` table and served via `GET /api/resumes/:id`.
- Larger files degrade gracefully to text-only preview with no error thrown.
- PDF binary is also cached in `localStorage` (key: `jp_pdfs_<jobId>`) so previews survive page refreshes without a server round-trip.

#### Best Fit Relocation ("→ Move" Button)
- Rejected candidates whose AI-assigned `bestFitRole` matches another open posting now show a **→ Move** button.
- One click moves the candidate into the correct job's screening pipeline without re-scoring.

#### AI Platform Recommendations — Full Overhaul
- `getAIRecommendations()` now accepts a 4th `title` argument and covers **all 8 job levels** in the database.
- Each level has department-aware and title-keyword-aware sub-cases:
  - **Intern / Trainee** → Internshala + Naukri + Indeed
  - **Director / C-suite** → LinkedIn + IIM Jobs + Naukri (with headhunting tip)
  - **Vice President / AVP** → LinkedIn + IIM Jobs + Naukri (Finance / Sales / Civil variants)
  - **Senior Manager / GM** → LinkedIn + IIM Jobs / Naukri (Finance / Sales / Civil variants)
  - **Leadership** → LinkedIn + Naukri + Indeed (Civil/PM), Naukri + LinkedIn + IIM Jobs (Finance), LinkedIn + Naukri + Indeed (Sales)
  - **Senior** → Naukri + LinkedIn + Indeed (Civil/QC/Sales/CRM/Finance, each with role-specific search keywords)
  - **Mid-Level** → Apna + Indeed + Classifieds + Naukri (site workers), Naukri + Indeed + Apna (Finance/Sales/CRM)
  - **Entry-Level** → Apna + Classifieds + Indeed + Naukri (site/blue-collar), Naukri + Indeed + Internshala (office/trainee)
- No role ever shows the generic fallback "General recommendation based on role profile." message again.
- Each recommendation includes platform-specific search keyword suggestions.

#### New Job: Quality Control (QC) Engineer
- Added to `JOB_DATABASE` under **Civil / Engineering** department.
- Location: The Saavira, Sector 48, Gurugram.
- Experience: 4–7 years in QC / Quality Assurance – Construction.
- Includes full JD (inspection, NCR management, material quality, documentation) and 5 screening questions.

### Fixed

- **`jobId is not defined` crash** in `rerenderResults()` — the screening table's row renderer was calling `renderCandidateRow(c, i, jobMeta.jobTitle, jobId)` but `jobId` was not in scope; fixed to `jobMeta.jobId`.
- **Contact info not populating on re-score** — dedup logic in `processImportedCandidates()` was skipping all existing scored candidates, discarding newly extracted phone/email/resumeText. Fixed with partial-merge logic that updates contact fields and PDF data without overwriting scores or status.
- **PDF preview blank on existing candidates** — same dedup issue caused `pdfBase64` to be lost on re-upload. Partial merge now preserves PDF binary for already-scored candidates.

### Changed

- JSON body size limit increased from `10mb` to `25mb` to support larger multi-file resume uploads.
- `saveScreeningData()` now strips `pdfBase64` before writing to Supabase (avoids bloating the key-value store) and saves PDF binaries to `localStorage` separately.
- `loadScreeningData()` restores `pdfBase64` from `localStorage` on load, so previews work immediately without re-uploading.
- `renderPlatforms()` now passes `formData.jobTitle` to `getAIRecommendations()` as the 4th argument.

### Backend

- New helper `extractMobileNumbers(text)` — regex-based Indian mobile number extraction from PDF text.
- New helper `attachResumeMetadata(candidates, batch)` — links PDF metadata (resumeId, resumeUrl, phone) back to AI-scored candidates.
- New endpoint `GET /api/resumes/:id` — serves stored PDF binary from Supabase with correct MIME type and cache headers.
- New Supabase table `resume_files` (added via `CREATE TABLE IF NOT EXISTS` — non-destructive).

---

## [1.0.0] — 2026-03-01 (Initial Release)

- Internal HR job portal for One Group.
- Job posting creation with 130+ pre-loaded roles across Civil, Finance, Sales, and CRM departments.
- AI-powered resume screening via DeepSeek v3 (OpenRouter).
- Outreach pipeline management.
- Supabase (PostgreSQL) backend; Hostinger hosting.
- Single-page application: Tailwind CSS + Vanilla JS frontend.
```

- [ ] **Step 2: Verify the file was created**

```bash
ls C:/Users/Lenovo/OneDrive/Desktop/Work/OG/CHANGELOG.md
```

Expected: File exists with non-zero size.

---

## Task 3 — Stage Only the Safe Files

**Files:** Staging step only — no file creation

- [ ] **Step 1: Promote the worktree `server.js` (which has all scoring improvements) into the main repo**

```bash
cp "C:\Users\Lenovo\OneDrive\Desktop\Work\OG\.claude\worktrees\great-lumiere-2698c6\backend\server.js" \
   "C:\Users\Lenovo\OneDrive\Desktop\Work\OG\backend\server.js"
```

Verify the copy succeeded:
```bash
grep "MAX_BATCH_RETRIES\|MAX_GATE_RETRIES\|findResumeForCandidate" \
  "C:\Users\Lenovo\OneDrive\Desktop\Work\OG\backend\server.js"
```
Expected: all three identifiers found. If the grep returns nothing, the copy failed — investigate before proceeding.

- [ ] **Step 2: Stage the three source files and the new CHANGELOG — by explicit name**

```bash
cd "C:\Users\Lenovo\OneDrive\Desktop\Work\OG"
git add backend/db.js backend/server.js frontend/index.html CHANGELOG.md
```

> ⚠️ **Do NOT run `git add -A` or `git add .`** — that would include `Skill Prompts/leave-credit.md`.

- [ ] **Step 2: Verify only the correct files are staged**

```bash
git status
```

Expected output:
```
Changes to be committed:
  modified:   CHANGELOG.md  (new file)
  modified:   backend/db.js
  modified:   backend/server.js
  modified:   frontend/index.html

Changes not staged for commit:
  modified:   Skill Prompts/leave-credit.md
```

`Skill Prompts/leave-credit.md` must appear under **"not staged"**, not under "to be committed".  
If it appears under "to be committed", run `git restore --staged "Skill Prompts/leave-credit.md"` immediately.

---

## Task 4 — Commit

**Files:** Git history only

- [ ] **Step 1: Create the commit**

```bash
cd "C:\Users\Lenovo\OneDrive\Desktop\Work\OG"
git commit -m "$(cat <<'EOF'
feat: v1.2 — Contact Info, PDF Preview, AI Recommendations overhaul, QC Engineer

Features:
- Contact Info column: phone + email auto-extracted via regex from PDFs
- Resume PDF Preview modal: full-screen iframe renderer (base64→Blob) in
  Screening and Outreach views
- PDF storage: Supabase resume_files table + GET /api/resumes/:id endpoint;
  localStorage cache for offline preview
- Best Fit Relocation: '→ Move' button moves rejected candidates to their
  best-fit job pipeline in one click
- AI Platform Recommendations: full rewrite covering all 8 job levels and
  all departments with title-specific platform suggestions and search keywords
- QC Engineer job added to JOB_DATABASE (Civil / Engineering)

Fixes:
- jobId is not defined crash in rerenderResults() screening table render
- Contact info lost on re-score due to dedup logic skipping scored candidates
- pdfBase64 lost on re-upload for existing candidates (partial-merge fix)

Backend:
- JSON body limit: 10mb → 25mb
- extractMobileNumbers() regex helper
- attachResumeMetadata() links PDF metadata to AI-scored candidates
- CREATE TABLE IF NOT EXISTS resume_files (non-destructive schema add)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Confirm the commit was created**

```bash
git log --oneline -3
```

The newest commit should start with `feat: v1.2 —`.

---

## Task 5 — Tag v1.2

**Files:** Git tags only

- [ ] **Step 1: Create an annotated tag for v1.2**

```bash
cd "C:\Users\Lenovo\OneDrive\Desktop\Work\OG"
git tag -a v1.2.0 -m "v1.2.0 — Contact Info, PDF Preview, AI Recommendations overhaul, QC Engineer"
```

- [ ] **Step 2: Verify the tag exists**

```bash
git tag -l "v*"
```

Expected: `v1.2.0` appears in the list.

---

## Task 6 — Push to GitHub

**Files:** Remote `onecity` (https://github.com/tech1onegroup/Job-Portal.git)

- [ ] **Step 1: Push the commit**

```bash
cd "C:\Users\Lenovo\OneDrive\Desktop\Work\OG"
git push onecity main
```

Expected: Non-zero objects transferred; ends with `main -> main`.  
If rejected as "behind remote", run `git pull onecity main --rebase` first, then re-push.

- [ ] **Step 2: Push the tag**

```bash
git push onecity v1.2.0
```

Expected: `* [new tag]  v1.2.0 -> v1.2.0`

- [ ] **Step 3: Verify remote is updated**

```bash
git log onecity/main --oneline -3
```

The v1.2 commit should be at the top.

---

## Task 7 — Create GitHub Release

**Files:** GitHub Release page (via `gh` CLI)

- [ ] **Step 1: Check gh CLI is authenticated**

```bash
gh auth status
```

Expected: Shows authenticated as your GitHub user. If not, run `gh auth login` and follow prompts.

- [ ] **Step 2: Create the GitHub Release**

```bash
cd "C:\Users\Lenovo\OneDrive\Desktop\Work\OG"
gh release create v1.2.0 \
  --repo tech1onegroup/Job-Portal \
  --title "v1.2.0 — Contact Info, PDF Preview & AI Recommendations" \
  --notes "$(cat <<'EOF'
## What's New in v1.2.0

### ✨ New Features

**Contact Info Column**
Phone number and email are now auto-extracted from uploaded PDFs using regex (not AI). Both appear in a new Contact column in the Screening and Outreach tables — no manual entry required.

**Resume PDF Preview**
Full-screen modal with Google Drive-style native PDF rendering. Click the Preview button on any candidate row in Screening or Outreach to view their resume in place. Falls back to extracted text if binary is unavailable.

**Best Fit Relocation**
Rejected candidates whose AI-assigned best-fit role matches another open posting get a → Move button. One click moves them to the right pipeline.

**AI Platform Recommendations — Fully Rebuilt**
Every job level and department now gets specific, reasoned platform suggestions with search keyword hints. No role will ever show the generic fallback message again.

**Quality Control (QC) Engineer**
New role added to the Civil / Engineering department — full JD, KRAs, and screening questions included.

---

### 🐛 Bug Fixes

- Fixed `jobId is not defined` crash that broke the Screening table render
- Fixed contact info and PDF data being lost when re-scoring already-scored candidates
- Fixed dedup logic that dropped phone/email/PDF on candidate re-upload

---

### ⚙️ Backend Changes

- JSON upload limit increased 10 MB → 25 MB
- New `resume_files` Supabase table for server-side PDF storage
- New endpoint `GET /api/resumes/:id` to serve PDFs
- Regex-based mobile number extraction from PDF text

---

> **Data safety:** All existing job openings, screening history, and outreach data in Supabase remain completely untouched by this release.
EOF
)"
```

- [ ] **Step 3: Verify the release was created**

```bash
gh release view v1.2.0 --repo tech1onegroup/Job-Portal
```

Expected: Shows release title, tag `v1.2.0`, and the notes you just wrote.

---

## Self-Review Checklist

**Spec coverage:**
- [x] Contact Info column → Task 4 commit, Task 7 release notes
- [x] PDF Preview modal → Task 4 commit, Task 7 release notes  
- [x] Best Fit Relocation button → Task 4 commit, Task 7 release notes
- [x] AI Recommendations overhaul → Task 4 commit, Task 7 release notes
- [x] QC Engineer job → Task 4 commit, Task 7 release notes
- [x] Bug fixes documented → CHANGELOG + release notes
- [x] `Skill Prompts/leave-credit.md` excluded → Task 3 Step 2 verification
- [x] User data not affected → Safety Guarantees table at top

**Placeholder scan:** No TBD, TODO, or "similar to above" references. All commands are exact.

**Safety scan:**
- No `git add -A` or `git add .` — all adds are by explicit path
- No `DROP`, `ALTER TABLE`, or `DELETE` in any DB change
- No modification to `key_value_store` table
- `CREATE TABLE IF NOT EXISTS` is idempotent
