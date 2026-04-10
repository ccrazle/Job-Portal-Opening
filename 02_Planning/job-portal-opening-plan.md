# Job Portal Opening — Phase 1 Context Document

**Created:** 2026-04-10
**Purpose:** Internal reference, HR handoff guide, and detailed specification for the Job Portal Opening process.

---

## A. Internal Reference — Decisions Made

### Approach
Database-driven with AI-assisted recommendations. The system contains a pre-loaded database of 130–140 job openings across departments. HR selects from this database using dependent dropdowns — all role details and JDs auto-populate. AI recommends target platforms based on job type, level, and platform trends. Post-approval, the system generates copy-paste-ready content per platform. Resume screening is handled as a separate post-posting flow with automated scoring.

### Mapping Logic
Job-to-portal mapping is **AI-recommended** based on job type, level, and platform trends — which portal gets the most traction for each job category. The AI considers employment type, seniority, industry norms, and historical platform performance. HR can always override the recommendation.

### Platforms Selected
1. **LinkedIn** — Corporate, leadership, and mid-level professional roles
2. **Naukri.com** — Broadest reach across all levels in India
3. **IIM Jobs** — Premium management roles, leadership positions
4. **Indeed** — Technical, field/site, and entry-level roles
5. **Internshala** — Internships and fresher positions only
6. **Apna Jobs** — Entry-level, blue-collar, and skilled trade roles (electricians, mechanics, site workers, etc.)
7. **Classified Ads** — Local/regional job boards and newspaper classifieds (Quikr Jobs, OLX Jobs, local publications) for field-level and trade roles

### Folder Structure Rationale
Numbered folders (01-06) for process order. Hybrid organization — top-level by category, job-specific files within where applicable. All lowercase with hyphens, no spaces.

### Job Database
The system is backed by a pre-loaded database of 130–140 job openings organized by department. Each record contains complete role details (title, department, location, type, level, experience, salary, skills) and a full job description. This database serves as the source of truth for the dependent dropdown system in the wizard — HR selects, system populates, HR overrides if needed.

### Field Definitions
Master Excel has 17 columns covering: identification (Job ID), role details (title, department, location, type, level), compensation (salary, experience), team (reporting to, openings), skills (required, preferred), content (JD, screening questions), process (target portals, status, date).

---

## B. HR Input Guide — What HR Needs to Provide

### 1. Job Selection (Primary — via Wizard)
Most job openings are created by selecting from the pre-loaded database of 130–140 jobs. HR selects Department → Job Title, and all fields auto-populate. HR then only needs to:
- Confirm or override auto-populated fields (location, salary, etc.) if this specific opening differs from the default
- Enter the **Number of Openings** (always manual — varies per opening)

### 2. Raw JD Documents (Secondary — for overrides or new roles)
If the auto-populated JD needs replacement, or if a role is not in the database:
- **Format:** Word (.docx) or PDF (.pdf)
- **Where to place:** `01-JDs-Raw/Word/` or `01-JDs-Raw/PDF/`
- **Naming:** Use job title and department, e.g., `VP-Operations.docx`, `Site-Supervisor-Mumbai.pdf`
- **Content needed:** Full job description including responsibilities, qualifications, experience, and any special requirements

### 3. Job Details Reference (for database records)
Each job in the database contains the following fields. These auto-populate into the wizard but can be overridden per opening:

| Field | Required? | Notes |
|-------|-----------|-------|
| Job Title | Yes | Official designation (from database) |
| Department | Yes | Team or division (from database) |
| Location | Yes | City and state (from database, overridable) |
| Employment Type | Yes | Full-time / Part-time / Contract / Internship |
| Job Level | Yes | Leadership / Mid-Level / Entry-Level / Intern |
| Experience Required | Yes | Range (e.g., 5-8 years) |
| Salary Range | Recommended | CTC range in LPA |
| Number of Openings | Yes | **Always manual** — how many positions for this specific opening |
| Reporting To | Yes | Manager name and designation |
| Required Skills | Yes | Must-have competencies |
| Preferred Skills | Optional | Nice-to-have competencies |

### 3. Screening Questions
- **Format:** Provide per job opening (unique to each role)
- **Include:** The question text and expected answer type (Text / MCQ / Yes-No)
- **Limit:** Recommended max 5 questions per job (especially for Naukri postings)
- **Where it goes:** We enter into Sheet 2 of `job-master-sheet.xlsx` and create individual files in `04-Screening-Questions/`

### 4. Message Templates Review
- Draft templates are already created in `05-Message-Templates/`
- **HR action:** Review each template and:
  - Customize the tone and wording as needed
  - Fill in company-specific defaults ({Company Name}, {HR Email}, {HR Name}, {Designation})
  - Approve or request changes
- **Templates provided:** Application Received, Shortlisting, Interview Invite, Selection/Offer, Rejection, On Hold/Waitlisted

### 5. Confirm Portal Mapping
- AI auto-recommends platforms per job — HR reviews and overrides in Card 3
- Mapping reference data is in `02-Master-Data/job-to-portal-mapping.xlsx`
- Flag any jobs that need exceptions to the AI recommendations

### 6. Resume Screening (Post-Posting)
- **When:** After an opening is posted and candidates start applying
- **Step 1:** HR collects resumes from all portals and runs the "Resume Scorer" skill externally. The skill produces a ranked CSV file (Rank, Applicant Name, Best Fit Role, Exp, Education, Keyword/Skill Score, Experience Score).
- **Step 2:** HR manually imports that CSV into the portal's "Screen Resumes" page.
- **Step 3:** Portal auto-groups candidates by role, assigns communication tiers (Top 20% → WhatsApp + call, Top 60% → WhatsApp, Referral → WhatsApp + call + human call), triggers outreach, and tracks confirmations.

---

## C. Detailed Spec

### Excel Column Specifications

**Sheet 3 — Job Database (Pre-loaded):**
- DB ID: Integer, auto-increment (internal, not shown to HR)
- Department: Text (used as the first-level dropdown filter)
- Job Title: Text (used as the second-level dependent dropdown)
- Location: Text (City, State/Country — default for this role)
- Employment Type: Dropdown — Full-time, Part-time, Contract, Internship
- Job Level: Dropdown — Leadership, Mid-Level, Entry-Level, Intern
- Experience Required: Text (e.g., "5-8 years")
- Salary Range: Text (e.g., "15-20 LPA")
- Reporting To: Text (default reporting manager for this role)
- Required Skills: Text, comma-separated
- Preferred Skills: Text, comma-separated
- Job Description: Text (full JD content)
- Screening Questions Reference: Text, pointer to the corresponding file in `04-Screening-Questions/` (e.g., `SAV-2026-001-questions.md`). Each job title maps to its own set of pre-defined screening questions.

This sheet contains 130–140 pre-loaded records. When HR selects a Department → Job Title combination in Card 1, all corresponding fields auto-populate from this sheet into a new row in Sheet 1. The associated screening questions auto-populate into Card 4.

**Sheet 1 — Job Master (Active Openings):**
- Job ID: Text, format `OG-YYYY-NNN` (auto-increment)
- Job Title: Text, max 100 characters
- Department: Text
- Location: Text (City, State/Country)
- Employment Type: Dropdown — Full-time, Part-time, Contract, Internship
- Job Level: Dropdown — Leadership, Mid-Level, Entry-Level, Intern
- Experience Required: Text (e.g., "5-8 years")
- Salary Range: Text (e.g., "15-20 LPA")
- Number of Openings: Integer
- Reporting To: Text
- Required Skills: Text, comma-separated
- Preferred Skills: Text, comma-separated
- Job Description: Text (or reference to file in 01-JDs-Raw)
- Screening Questions: Reference to Sheet 2
- Target Portals: Text, comma-separated (derived from mapping)
- Posting Status: Dropdown — Draft, Posted, Closed
- Date Created: Date, format YYYY-MM-DD

**Sheet 2 — Screening Questions:**
- Job ID: Text, must match Sheet 1
- Question No.: Integer, sequential per Job ID
- Question Text: Text
- Expected Answer Type: Dropdown — Text, MCQ, Yes-No

### Portal Character Limits

| Portal | Field | Limit |
|--------|-------|-------|
| Naukri.com | Company Profile | 254 characters |
| Naukri.com | Candidate Profile | 254 characters |
| Indeed | Job Description (optimal) | 700-2,000 characters |
| Internshala | Job Description | 2,500 characters max |
| LinkedIn | Job Description (recommended) | 300-600 words |
| Apna Jobs | Job Description | 1,500 characters max |
| Classified Ads | Job Description (print-optimized) | 500-800 characters |

### Template Placeholders — Master List

| Placeholder | Used In | Description |
|-------------|---------|-------------|
| {Candidate Name} | All templates | Applicant's full name |
| {Job Title} | All templates | Position title |
| {Company Name} | All templates | Organization name |
| {HR Name} | All templates | HR contact person |
| {Designation} | All templates | HR person's title |
| {HR Email} | Application Received, On Hold | HR email address |
| {HR Phone} | Interview Invite | HR phone number |
| {Timeline} | Application Received | Expected response time |
| {Interview Round} | Interview Invite | Round name |
| {Date} | Interview Invite | Interview date |
| {Time} | Interview Invite | Interview time (IST) |
| {Mode} | Interview Invite | Online / In-Person |
| {Location/Link} | Interview Invite | Address or meeting URL |
| {Duration} | Interview Invite | Expected interview length |
| {Panel} | Interview Invite | Interviewer details |
| {Confirmation Deadline} | Interview Invite | Reply-by date |
| {Department} | Selection/Offer | Team or division |
| {CTC Offered} | Selection/Offer | Compensation package |
| {Expected Joining Date} | Selection/Offer | Start date |
| {Manager Name, Designation} | Selection/Offer | Reporting manager |
| {Location} | Selection/Offer | Work location |
| {Acceptance Deadline} | Selection/Offer | Offer reply-by date |
| {Expected Timeline} | On Hold | Decision expected by |

---

## D. Process Flow Summary

```
HR opens the portal → clicks "Create New Opening"
    │
    v
Card 1: Job Selection — select Department → Job Title (dependent dropdown)
         All fields auto-populate from database (130-140 pre-loaded jobs)
         HR can override any field for this specific opening
    │
    v
Card 2: JD Review & Edit — auto-populated JD displayed for review
         HR can edit inline, upload replacement, or write from scratch
    │
    v
Card 3: Platforms — AI recommends portals based on job type/level
         HR confirms or overrides (7 platforms available)
    │
    v
Card 4: Screening Questions — add pre-screening questions
    │
    v
Card 5: Review & Approve — summary view, HR approves
    │
    v
System auto-generates formatted content per selected platform
(stored in 03-Portal-Formats/generated/{Job-ID}/)
    │
    v
HR copies generated content → pastes into each portal's dashboard → submits
    │
    v
Opening is live on external platforms
    │
    v
Candidates apply via portals → HR collects resumes
    │
    v
HR runs "Resume Scorer" skill (external) → produces ranked CSV
(Columns: Rank, Name, Best Fit Role, Exp, Education, Skill Score, Exp Score)
    │
    v
HR imports CSV into portal → "Screen Resumes" page
    │
    v
Portal groups candidates by Best Fit Role → assigns communication tiers:
  Tier 1 (Top 20% per role): WhatsApp + Automated call
  Tier 2 (Top 60% per role): WhatsApp only
  Referral/Recommended:      WhatsApp + Automated call + Human call
    │
    v
HR triggers outreach → tracks confirmations → produces final shortlist
(Resume Screening — see Section I for full spec)

── At any point: [Save as Draft] to exit and resume later ──
── Drafts can be resumed, edited, or permanently deleted ──
── Posted openings can be edited in place (no re-approval needed) ──
```

---

## E. File Index

| Path | Description |
|------|-------------|
| `01-JDs-Raw/Word/` | Raw JD Word documents from HR |
| `01-JDs-Raw/PDF/` | Raw JD PDF documents from HR |
| `02-Master-Data/job-master-sheet.xlsx` | Master job list + screening questions |
| `02-Master-Data/job-to-portal-mapping.xlsx` | Job level/category to portal mapping |
| `03-Portal-Formats/format-linkedin.md` | LinkedIn posting format and best practices |
| `03-Portal-Formats/format-naukri.md` | Naukri.com posting format and best practices |
| `03-Portal-Formats/format-iimjobs.md` | IIM Jobs posting format and best practices |
| `03-Portal-Formats/format-indeed.md` | Indeed posting format and best practices |
| `03-Portal-Formats/format-internshala.md` | Internshala posting format and best practices |
| `03-Portal-Formats/format-apna.md` | Apna Jobs posting format and best practices |
| `03-Portal-Formats/format-classifieds.md` | Classified Ads posting format and best practices |
| `04-Screening-Questions/` | Per-job screening question files (by Job ID) |
| `05-Message-Templates/application-received.md` | Auto-acknowledgment template |
| `05-Message-Templates/shortlisting-notification.md` | Shortlist notification template |
| `05-Message-Templates/interview-invite.md` | Interview scheduling template |
| `05-Message-Templates/selection-offer.md` | Offer extension template |
| `05-Message-Templates/rejection.md` | Rejection communication template |
| `05-Message-Templates/on-hold-waitlisted.md` | Waitlist status update template |
| `06-Context/job-portal-opening-context.md` | This file |
| `03-Portal-Formats/generated/{Job-ID}/` | Auto-generated platform content (created on approval) |
| `07-Resume-Screening/{Job-ID}/uploads/` | Imported CSVs from Resume Scorer skill |
| `07-Resume-Screening/{Job-ID}/results/` | Per-role tiered candidate results |
| `07-Resume-Screening/{Job-ID}/confirmed.csv` | Final confirmation list (candidates who accepted) |
| `07-Resume-Screening/{Job-ID}/outreach-log.csv` | Communication log (WhatsApp/call status per candidate) |

---

## F. Card-Based Portal Flow — Backend Design

### Overview

The job opening creation process is presented to the HR as a **linear card wizard** — a step-by-step guided flow where each card represents one stage of the process. The user completes a card, clicks **Next**, and moves forward. They can also go **Back** to edit a previous card without losing data. At any point, they can hit **Save as Draft** to persist their progress and return later.

This pattern follows the same UX convention used by LinkedIn Job Posting, Lever, Greenhouse, and Workday — a progressive disclosure wizard that reduces cognitive load by showing only one concern at a time.

### Roles

| Role | Access | Scope |
|------|--------|-------|
| **HR** | Primary user of the platform. Creates job openings via the card wizard, manages drafts, approves and posts openings. |
| **Admin** | Platform maintainer. Manages the system itself — configuration, bug fixes, user management, platform health. Does not interact with the job creation wizard during normal operations. |

### Card Sequence

```
┌──────────────────────────────────────────────────────────────────┐
│                        WIZARD PROGRESS BAR                       │
│  [1. Select ●]──[2. JD ○]──[3. Platforms ○]──[4. Screen ○]──[5. Approve ○]  │
└──────────────────────────────────────────────────────────────────┘

Card 1 (Select Job) ─► Card 2 (Review JD) ─► Card 3 (AI Platforms) ─► Card 4 (Questions) ─► Card 5 (Approve)
                                                                                                 │
                                                                                           Opening Created
                                                                                           (Status: Posted)
                                                                                                 │
                                                                                     Resume Screening available
                                                                                     (separate flow, Section I)

At any point:  [Save as Draft] ─► Exit ─► Resume later
```

### Card Definitions

#### Card 1 — Job Selection & Details

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Select a job from the pre-loaded database and confirm/override its details |
| **Data Source** | `02-Master-Data/job-master-sheet.xlsx` → Sheet 3 (Job Database) |
| **Primary Input** | **Dependent dropdown system:** (1) HR selects a **Department** from the first dropdown (filters the database). (2) A second dropdown shows only **Job Titles** belonging to that department. (3) On selecting a Job Title, all fields auto-populate from the database record. |
| **Fields Auto-Populated** | Job Title, Department, Location, Employment Type, Job Level, Experience Required, Salary Range, Reporting To, Required Skills, Preferred Skills |
| **Fields Editable** | All auto-populated fields can be overridden by HR for this specific opening. Overrides apply only to this opening — the database record remains unchanged. |
| **Fields Manual-Only** | Number of Openings (always entered by HR, not stored in database — varies per opening) |
| **Auto-Generated** | Job ID (format `OG-YYYY-NNN`, auto-incremented) |
| **Auto-Generated** | Date Created (system date, `YYYY-MM-DD`) |
| **Validation** | Department and Job Title selection is mandatory. All required fields must be filled (whether auto-populated or overridden) before proceeding. |
| **On Next** | Data saved to Sheet 1 as a new active opening row. Card 2 unlocks. |

#### Card 2 — Job Description (Review & Edit)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Review the auto-populated JD and optionally edit or replace it |
| **Data Source** | Auto-populated from Sheet 3 (Job Database) via Card 1 selection. Fallback: `01-JDs-Raw/Word/` and `01-JDs-Raw/PDF/`. |
| **Primary Display** | The JD text auto-populated from the database is shown in an **editable text area**, pre-filled and ready for review. HR can edit inline — add, remove, or rewrite sections specific to this opening. |
| **Secondary Input** | If the auto-populated JD needs full replacement: (a) Upload a `.docx` or `.pdf` file — stored in `01-JDs-Raw/` with naming convention `{Job-ID}-{Title}.ext` (b) Select from existing JD files already in the folder (c) Clear and type/paste a new JD from scratch. Uploading or selecting a file replaces the text area content. |
| **Skills Fields** | Required Skills and Preferred Skills are shown pre-filled from Card 1 auto-population. HR can edit them here as well. |
| **Validation** | JD text area must not be empty. Required Skills is mandatory. |
| **On Next** | JD content and skills written to master sheet. Card 3 unlocks. |

#### Card 3 — Platform Selection (AI-Recommended)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Choose which job portals this opening will be posted to |
| **Data Source** | `02-Master-Data/job-to-portal-mapping.xlsx` and `03-Portal-Formats/` |
| **AI Recommendation** | The system uses an AI recommendation engine that analyzes the job's type, level, department, and employment type to suggest the most effective platforms. Recommendation logic: **Leadership / Senior roles** → LinkedIn, IIM Jobs, Naukri.com. **Mid-Level professional roles** → LinkedIn, Naukri.com, Indeed. **Entry-Level / Technical / Field roles** → Indeed, Naukri.com, Apna Jobs. **Blue-collar / Skilled trades** (electrician, mechanic, site workers) → Apna Jobs, Classified Ads, Indeed. **Internships / Fresher** → Internshala, Naukri.com. |
| **Override** | HR can override AI suggestions — add or remove any platform. AI recommendations are suggestions, not constraints. |
| **Platforms Available** | LinkedIn, Naukri.com, IIM Jobs, Indeed, Internshala, Apna Jobs, Classified Ads (7 total) |
| **Display** | Each platform shown as a selectable tile with: platform name, logo placeholder, and a brief tag. AI-recommended platforms are pre-selected with a "Recommended" badge. Non-recommended platforms are unselected but available. |
| **Info on Selection** | On selecting a platform, show the relevant character limits from `03-Portal-Formats/format-{platform}.md` as a tooltip or side note so HR is aware of constraints. |
| **Validation** | At least one platform must be selected. |
| **On Next** | Target Portals column updated in master sheet. Card 4 unlocks. |

#### Card 4 — Screening Questions (Auto-Populated)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Review and customize pre-screening questions for this opening |
| **Data Source** | `04-Screening-Questions/` → mapped per job title from Sheet 3 (Screening Questions Reference column). Falls back to `02-Master-Data/job-master-sheet.xlsx` → Sheet 2. |
| **Auto-Population** | When HR selects a job in Card 1, the system loads the corresponding screening questions file (e.g., selecting "Project Manager" loads questions from `SAV-2026-001-questions.md`). Questions appear pre-filled in the list — each with its Question Text and Answer Type (Text, MCQ, Yes-No) already set. |
| **Auto-Populated Badge** | A green "Auto-loaded from database" badge is shown when questions come from the pre-mapped file. Changes to "Custom" if HR modifies them. |
| **Override** | HR can: (a) Edit any auto-populated question's text or answer type. (b) Delete questions that aren't relevant to this specific opening. (c) Reorder questions via drag-to-reorder. (d) Add new questions manually using the input form at the bottom. All overrides apply only to this opening — the source file in `04-Screening-Questions/` is never modified. |
| **Display** | List view of questions with drag-to-reorder, inline edit, and delete actions. Each question shows its number, text, and answer type badge. |
| **Constraints** | Recommended max 5 questions (soft warning if exceeded, especially for Naukri postings). |
| **Validation** | At least 1 screening question recommended (soft warning, not a hard block — HR can proceed with zero). |
| **On Next** | Questions written to Sheet 2 (keyed by Job ID) and saved as `04-Screening-Questions/{Job-ID}-questions.md`. Card 5 unlocks. |

#### Card 5 — Review & Approve

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Final review of the complete job opening before it goes live |
| **Data Source** | Aggregated from Cards 1–4 |
| **Display** | Read-only summary view showing all data across cards in a consolidated layout: a **Job Details** section (Card 1 fields), a **JD Preview** section (Card 2 content, truncated with "View Full" expand), a **Platforms** section (selected portals as badges), and a **Screening Questions** section (numbered list). Each section has an **Edit** button that navigates back to the respective card. |
| **Actions** | **Approve** — Triggers auto-generation of platform-formatted content and marks status as "Posted". **Back** — Return to Card 4 for edits. |
| **On Approve** | Posting Status set to "Posted". Timestamp recorded. Platform content auto-generated (see Section G). Flow complete. |

### Save as Draft — Persistent Action

| Attribute | Detail |
|-----------|--------|
| **Available On** | Every card (Cards 1–5). Always visible in the card footer alongside Back/Next. |
| **Behavior** | Saves all data entered so far across all visited cards. Posting Status set to "Draft" in master sheet. Admin exits the wizard. |
| **Resume** | When the admin returns, they see their drafted openings in a "Drafts" list. Clicking a draft reopens the wizard at the last completed card, with all prior data pre-filled. Incomplete card data (partially filled fields) is also preserved. |
| **No Expiry** | Drafts persist indefinitely until HR resumes or manually deletes them. |
| **Delete** | HR can permanently delete a draft from the Drafts list. Removes the master sheet row, associated screening question entries (Sheet 2), and the screening question file. Uploaded JD files in `01-JDs-Raw/` are retained (they may be reused). Deletion requires a confirmation prompt ("Are you sure? This cannot be undone."). |

### Card Navigation Rules

| Rule | Behavior |
|------|----------|
| **Forward progression** | Cards unlock sequentially. Card N+1 is only accessible after Card N passes validation. |
| **Backward navigation** | Admin can go back to any previously completed card at any time. Editing a prior card does not reset subsequent cards — data is preserved, but the admin must re-confirm by stepping forward through each card again. |
| **Progress indicator** | A horizontal step bar at the top shows all 5 steps. Completed steps show a filled circle (●), the current step is highlighted, and future steps show an empty circle (○). |
| **Draft re-entry** | On resuming a draft, the progress bar reflects which cards were completed. Admin lands on the first incomplete card. |

### Data Flow — Card to Storage Mapping

```
Card 1 (Job Selection & Details)
  ├─► Reads from: job-master-sheet.xlsx → Sheet 3 (Job Database, 130-140 records)
  ├─► Department dropdown → filters Job Title dropdown (dependent)
  ├─► Auto-populates fields from selected database record
  └─► Writes to: job-master-sheet.xlsx → Sheet 1 (new active opening row)

Card 2 (JD Review & Edit)
  ├─► Auto-populated from Sheet 3 via Card 1 selection
  ├─► Optional: 01-JDs-Raw/Word/ or 01-JDs-Raw/PDF/ (file upload/replacement)
  └─► Writes to: job-master-sheet.xlsx → Sheet 1 (Columns: Required Skills, Preferred Skills, Job Description)

Card 3 (Platforms — AI-Recommended)
  ├─► AI engine analyzes job type, level, dept → recommends platforms
  ├─► Reads from: job-to-portal-mapping.xlsx (reference data)
  ├─► Reads from: 03-Portal-Formats/ (character limit display)
  └─► Writes to: job-master-sheet.xlsx → Sheet 1 (Column: Target Portals)

Card 4 (Screening Questions — Auto-Populated)
  ├─► Reads from: 04-Screening-Questions/{mapped-file}.md (via Sheet 3 reference)
  ├─► Auto-populates questions from the job's pre-mapped screening file
  ├─► HR can override: edit, delete, reorder, add new questions
  ├─► Writes to: job-master-sheet.xlsx → Sheet 2 (Job ID, Question No., Text, Answer Type)
  └─► Writes to: 04-Screening-Questions/{Job-ID}-questions.md

Card 5 (Approve)
  └─► job-master-sheet.xlsx → Sheet 1 (Column: Posting Status → "Posted", Date)
  └─► Triggers: platform content generation (Section G)

Save as Draft (any card)
  └─► job-master-sheet.xlsx → Sheet 1 (Column: Posting Status → "Draft")
```

### Edit After Approval

| Attribute | Detail |
|-----------|--------|
| **Scope** | A "Posted" opening can be edited directly without changing its status. |
| **Behavior** | HR opens the posted opening → wizard reopens with all fields pre-filled → HR edits any card → saves. Status remains "Posted" throughout. No re-approval step required. |
| **Content Regeneration** | If the edit affects fields used in platform-formatted content (JD, skills, platforms, screening questions), the platform content is automatically regenerated to reflect changes. |

### Status Lifecycle

```
(New) ──► Draft ──► Posted ──► Closed
             │         │
             │         └── (edit in place, stays Posted)
             │
             ├── (resume + approve) ─► Posted
             │
             └── (delete) ─► Removed
```

- **Draft** — Partially or fully filled, not yet approved. Can be resumed, edited, or deleted.
- **Posted** — Approved by HR. Opening is live. Can be edited in place. Platform content has been generated.
- **Closed** — Opening is no longer active (filled or withdrawn). Transition from Posted only.
- **Removed** — Draft permanently deleted by HR. Data cleaned up.

---

## G. Auto-Generated Platform Content — Post-Approval Output

### Overview

When HR clicks **Approve** on Card 5, the system automatically generates **ready-to-paste content** formatted for each selected platform. This is not an API integration — it produces formatted text that HR copies into each portal's employer dashboard. This keeps the process reliable and independent of third-party API availability.

**Phase 2 upgrade path:** For platforms that later support API access (e.g., Indeed XML feed, LinkedIn Job Posting API), the generated content can be submitted programmatically instead of manually.

### Generation Trigger

- **On Approve** — Content generated for all platforms selected in Card 3.
- **On Edit (Posted)** — If a posted opening is edited and the changes affect content-relevant fields, platform content is regenerated.

### Per-Platform Output

Each platform's content is generated using the format rules defined in `03-Portal-Formats/format-{platform}.md` and the data from Cards 1–4.

#### LinkedIn

| Field | Source | Formatting |
|-------|--------|------------|
| Job Title | Card 1 → Job Title | Plain text, max 100 characters |
| Company | System config (company name) | Pre-set |
| Location | Card 1 → Location | City, State/Country |
| Employment Type | Card 1 → Employment Type | Mapped to LinkedIn options (Full-time, Part-time, Contract, Internship) |
| Job Description | Card 2 → JD content | 300–600 words recommended. Structured with sections: About the Role, Responsibilities, Qualifications, Preferred Skills. |
| Screening Questions | Card 4 → Questions | Appended as formatted list (LinkedIn supports up to 5 custom questions) |

#### Naukri.com

| Field | Source | Formatting |
|-------|--------|------------|
| Job Title | Card 1 → Job Title | Plain text |
| Experience | Card 1 → Experience Required | Range format (e.g., "5-8 years") |
| Salary | Card 1 → Salary Range | CTC in LPA |
| Location | Card 1 → Location | City |
| Job Description | Card 2 → JD content | Structured text. Company Profile and Candidate Profile sections kept under 254 characters each. |
| Key Skills | Card 2 → Required Skills + Preferred Skills | Comma-separated tags |
| Screening Questions | Card 4 → Questions | Max 5 questions (hard limit on Naukri). If more than 5 exist, top 5 by order are used with a warning. |

#### IIM Jobs

| Field | Source | Formatting |
|-------|--------|------------|
| Job Title | Card 1 → Job Title | Plain text |
| Function/Role | Card 1 → Department | Mapped to IIM Jobs categories |
| Experience | Card 1 → Experience Required | Range |
| Location | Card 1 → Location | City |
| Compensation | Card 1 → Salary Range | CTC range |
| Job Description | Card 2 → JD content | Structured text focused on leadership/management context per `format-iimjobs.md` |

#### Indeed

| Field | Source | Formatting |
|-------|--------|------------|
| Job Title | Card 1 → Job Title | Plain text |
| Location | Card 1 → Location | City, State |
| Salary | Card 1 → Salary Range | Range with period (per year/month) |
| Job Type | Card 1 → Employment Type | Mapped to Indeed options |
| Job Description | Card 2 → JD content | 700–2,000 characters optimal. Plain text, bullet-point heavy for readability. |
| Screening Questions | Card 4 → Questions | Dealbreaker-style Yes/No or short text |

#### Internshala

| Field | Source | Formatting |
|-------|--------|------------|
| Job/Internship Title | Card 1 → Job Title | Plain text |
| Duration | Card 1 → Employment Type | Internship duration if applicable |
| Stipend/Salary | Card 1 → Salary Range | Stipend for interns, CTC for full-time |
| Location | Card 1 → Location | City (or "Work from Home" if remote) |
| Job Description | Card 2 → JD content | Max 2,500 characters. Concise, fresher-friendly language per `format-internshala.md` |
| Skills Required | Card 2 → Required Skills | Tag format |

#### Apna Jobs

| Field | Source | Formatting |
|-------|--------|------------|
| Job Title | Card 1 → Job Title | Plain text, simple and direct |
| Location | Card 1 → Location | City |
| Salary | Card 1 → Salary Range | Monthly or annual, based on role type |
| Experience | Card 1 → Experience Required | Range or "Freshers welcome" for entry-level |
| Job Description | Card 2 → JD content | Max 1,500 characters. Simple language, bullet-point focused, no corporate jargon. Emphasis on day-to-day responsibilities and basic qualifications. Per `format-apna.md` |
| Skills Required | Card 2 → Required Skills | Tag format, practical/trade skills |

#### Classified Ads

| Field | Source | Formatting |
|-------|--------|------------|
| Job Title | Card 1 → Job Title | Short, keyword-rich |
| Location | Card 1 → Location | City and area |
| Salary | Card 1 → Salary Range | Monthly range |
| Contact | System config (HR contact) | Phone number and/or email |
| Job Description | Card 2 → JD content | 500–800 characters. Print-optimized, compact. Key info first: role, location, salary, experience, how to apply. Per `format-classifieds.md` |

### Output Storage

Generated content is stored for reference and reuse:

```
03-Portal-Formats/generated/
  └─► {Job-ID}/
        ├── linkedin.md
        ├── naukri.md
        ├── iimjobs.md
        ├── indeed.md
        ├── internshala.md
        ├── apna.md
        └── classifieds.md
```

Only files for selected platforms are generated. Each file contains the complete, copy-paste-ready content formatted for that portal.

### HR Workflow After Approval

```
HR clicks Approve (Card 5)
    │
    v
System generates formatted content for each selected platform
    │
    v
HR navigates to "Posted Openings" list
    │
    v
HR clicks a posted opening → sees generated content per platform
    │
    v
HR opens the portal's employer dashboard (LinkedIn, Naukri, etc.)
    │
    v
HR copies the generated content → pastes into portal → submits
    │
    v
Opening is live on the external platform
```

---

## H. Message Templates — Standalone Reference

The message templates stored in `05-Message-Templates/` are **not part of the job opening wizard**. They are standalone reference files used during later stages of the hiring lifecycle (after candidates apply).

| Template | Used When |
|----------|-----------|
| `application-received.md` | Candidate submits an application |
| `shortlisting-notification.md` | Candidate is shortlisted for next round |
| `interview-invite.md` | Scheduling an interview |
| `selection-offer.md` | Extending a job offer |
| `rejection.md` | Informing candidate of rejection |
| `on-hold-waitlisted.md` | Putting candidate on hold |

These files use placeholder syntax (e.g., `{Candidate Name}`, `{Job Title}`) as defined in the Template Placeholders table in Section C. HR can customize these templates at any time independently of the job opening process.

---

## I. Resume Screening & Scoring — Post-Posting Flow

### Overview

Resume screening is a **two-stage process** that happens after a job opening is posted:

1. **Stage 1 (External — Resume Scorer Skill):** HR runs the pre-built "Resume Scorer" skill outside the portal. This skill takes all applicant resumes, matches them against the JD, and produces a ranked CSV file with scores. This is manual — HR runs the skill and gets the CSV output. The Resume Scorer skill is **already built** and produces the 7-column CSV format described below.

2. **Stage 2 (Portal — Import & Outreach):** HR imports that CSV into the portal's screening page. The portal displays the ranked data, automatically segments candidates into communication tiers per role, and handles the candidate selection pipeline.

**Outreach (Phase 1):** WhatsApp messages and calls are handled **manually by HR** for now. The portal displays which candidates should receive what type of communication (WhatsApp, call, human call) and HR executes the outreach. The portal tracks the status of each communication. Automated WhatsApp/call integration is a Phase 2 upgrade.

The portal does **not** do the scoring itself — it consumes the scored CSV and manages the tiering, referral matching, outreach tracking, and confirmation pipeline.

### End-to-End Flow

```
Opening is Posted (Card 5 approved)
    │
    v
Candidates apply via external platforms (LinkedIn, Naukri, etc.)
    │
    v
HR collects resumes from all portals
    │
    v
┌─── STAGE 1: External (Resume Scorer Skill) ───┐
│                                                 │
│  HR runs "Resume Scorer" skill                  │
│  Input: Resumes + JD                            │
│  Output: Ranked CSV file (scored 0-100)         │
│                                                 │
└─────────────────────────────────────────────────┘
    │
    v
HR manually imports the CSV into the portal
    │
    v
┌─── STAGE 2: Portal (Import & Outreach) ────────┐
│                                                  │
│  Portal displays ranked candidates per role      │
│  Auto-segments into communication tiers          │
│  Triggers WhatsApp / Calls per tier              │
│  Collects confirmation responses                 │
│  Produces final invitation list                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Access Point

```
Posted Openings list
    │
    v
HR clicks a posted job → "Screen Resumes" button
    │
    v
Screening interface opens (scoped to that Job ID)
```

---

### Stage 1 — Resume Scorer Skill (External)

| Attribute | Detail |
|-----------|--------|
| **Tool** | "Resume Scorer" skill (run by HR outside the portal) |
| **Input** | All applicant resumes (PDF/DOCX) + the Job Description for the role |
| **Process** | The skill parses resumes, matches them against the JD, scores each candidate on keyword/skill match, experience relevance, and education fit |
| **Scoring Scale** | 0–100 for each scoring parameter |
| **Output** | A single Excel file (.xlsx) with a title row, empty row, and then data columns: |

**Excel Output Columns:**

| # | Column | Description |
|---|--------|-------------|
| 1 | Rank | Overall rank among all applicants (1 = best) |
| 2 | Candidate Name | Candidate's full name |
| 3 | Experience (Yrs) | Candidate's years of experience |
| 4 | Education | Candidate's highest qualification |
| 5 | Current Role | Candidate's current job/position |
| 6 | Best Fit Position | The role the candidate is best suited for |
| 7 | Score (/100) | 0–100, composite score |
| 8 | Remarks | Additional notes from the scorer |

**Note:** The Excel file may have a title row (e.g., "THE SAAVIRA – Resume Scoring Report | April 2026") before the headers. The portal auto-detects and skips title rows. The "Rank" column is a global rank — the portal re-ranks candidates **per role** after import (see Stage 2).

---

### Stage 2 — Portal Import & Outreach

#### CSV Import

| Attribute | Detail |
|-----------|--------|
| **Upload** | HR manually imports the CSV produced by the Resume Scorer skill. Drag-and-drop or file picker. |
| **Validation** | Portal validates that all 7 required columns are present. Rejects malformed CSVs with an error message. |
| **Display** | After import, the portal displays the full candidate list as a sortable table with all CSV columns visible. |
| **Multiple Imports** | HR can import additional CSVs for the same opening (e.g., from different batches). Data appends — does not replace previous imports. |

#### Per-Role Ranking

After import, the portal **re-groups and re-ranks candidates by their "Best Fit Role"** column:

- All candidates with the same "Best Fit Role" are grouped together
- Within each role group, candidates are ranked by their scores (highest first)
- A candidate's tier (Top 20%, Top 60%, etc.) is determined **within their role group, not globally**

**Example:**
```
Global CSV has 100 candidates across all roles.
15 candidates have Best Fit Role = "Project Manager".
The top 3 Project Manager candidates (top 20% of 15) = Tier 1.
The top 9 Project Manager candidates (top 60% of 15) = Tier 2.
Candidate ranked #45 globally but #1 among Project Managers → Tier 1 for PM role.
```

#### Communication Tiers

The portal auto-segments candidates into **3 tiers** based on their position within their role group:

| Tier | Criteria | Communication |
|------|----------|---------------|
| **Tier 1 — Top 20%** | Top 20% of candidates within their role group (by score) | WhatsApp message + Automated call |
| **Tier 2 — Top 60%** | Top 60% of candidates within their role group (includes Tier 1) | WhatsApp message only |
| **Tier 3 — Remaining** | Bottom 40% of candidates within their role group | No outreach (held for review or rejection) |
| **Highest Tier — Referral/Recommended** | Candidates matched against a separate referral list uploaded by HR (regardless of score) | WhatsApp message + Automated call + Human call |

**Tier assignment rules:**
- Tiers are calculated per role, not globally
- Referral/Recommended candidates always get the highest tier treatment regardless of their score position
- If a role group has fewer than 5 candidates, all receive at least Tier 2 treatment (WhatsApp message)

#### Referral / Recommended Identification

Referral candidates are identified via a **separate referral list** uploaded by HR:

| Attribute | Detail |
|-----------|--------|
| **Upload** | HR uploads a separate CSV or list containing referral candidate names. This is independent of the Resume Scorer CSV. |
| **Format** | Simple list: Applicant Name (must match the name in the Resume Scorer CSV), Referred By (optional), Notes (optional) |
| **Matching** | Portal auto-matches referral names against the imported candidate list by name. Matched candidates are tagged as "Referral" and upgraded to the Highest Tier. |
| **Unmatched** | If a referral name doesn't match any imported candidate, the portal flags it for HR review ("Referral not found in candidate list"). |
| **Manual Flag** | HR can also manually flag any candidate as referral directly in the portal UI. |

#### Portal Display — Screening Results

| Feature | Detail |
|---------|--------|
| **Default View** | Candidates grouped by Best Fit Role, ranked by score within each group. Each role is a collapsible section. |
| **Columns Shown** | Rank (per role), Applicant Name, Best Fit Role, Exp (Yrs), Education, Keyword/Skill Score, Experience Score, Tier Badge, Communication Status |
| **Tier Badges** | Visual badges: Green "Tier 1" (top 20%), Blue "Tier 2" (top 60%), Gray "Tier 3" (remaining), Gold "Referral" (recommended) |
| **Filters** | Filter by: Role, Tier, Communication Status (Pending / Sent / Confirmed / Declined) |
| **Search** | Search by candidate name or role keyword |
| **Mark as Referral** | HR can manually flag any candidate as "Referral/Recommended" → candidate is upgraded to Highest Tier |
| **Override Tier** | HR can manually move a candidate to a different tier before triggering outreach |

#### Outreach Workflow (Phase 1 — Manual)

In Phase 1, the portal **tells HR what to do** and **tracks the results**, but HR executes the outreach manually (sends WhatsApp messages, makes calls). Automated integration is a Phase 2 upgrade.

```
HR reviews the tiered candidate list on the portal
    │
    v
Portal shows the required action per candidate:
    │
    ├── Tier 1 (Top 20%):  "Send WhatsApp + Make automated call"
    ├── Tier 2 (Top 60%):  "Send WhatsApp message"
    ├── Tier 3 (Bottom):   "No outreach — hold"
    └── Referral:          "Send WhatsApp + Automated call + Human call"
    │
    v
HR manually sends WhatsApp messages and makes calls as indicated
    │
    v
HR updates status in the portal per candidate:
    │
    ├── Confirmed — candidate accepted the invitation
    ├── Declined — candidate declined
    ├── No Response — no reply within deadline
    └── Pending — outreach sent, awaiting response
    │
    v
HR reviews confirmation list → final shortlist
    │
    v
Confirmed candidates proceed to Interview & Test phase (separate phase)
```

**Phase 2 upgrade path:** Replace manual outreach with WhatsApp Business API integration (via Twilio/Gupshup/n8n) and automated calling. The portal's tier logic and status tracking remain the same — only the execution becomes automated.

#### Communication Status Tracking

| Status | Meaning |
|--------|---------|
| **Pending** | Outreach not yet triggered |
| **Sent** | WhatsApp/call sent, awaiting response |
| **Confirmed** | Candidate accepted the invitation |
| **Declined** | Candidate declined |
| **No Response** | No reply within the defined deadline |

HR can view real-time status per candidate. The portal shows aggregate counts: "12 Confirmed, 5 Pending, 3 Declined, 2 No Response" per role.

#### Confirmation List

After the outreach window closes, the portal produces a **Confirmation List** — the final shortlist of candidates who confirmed. This list is:
- Viewable on the portal (per role)
- Exportable as CSV
- The handoff point to the **Interview & Test phase** (a separate phase of the portal, not part of 01_Context)
- Message templates from `05-Message-Templates/` (interview invite, shortlisting notification, etc.) are used during that next phase, not here

---

### Data Storage

| Data | Location |
|------|----------|
| Imported CSVs (from Resume Scorer) | `07-Resume-Screening/{Job-ID}/uploads/` |
| Per-role tiered results | `07-Resume-Screening/{Job-ID}/results/` |
| Confirmation list | `07-Resume-Screening/{Job-ID}/confirmed.csv` |
| Outreach logs | `07-Resume-Screening/{Job-ID}/outreach-log.csv` |
