# Job Portal Opening — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a fully structured Job Portal Opening directory with all templates, formats, mappings, and context files ready for HR to use.

**Architecture:** File-based system — no code. Create folder structure, write all markdown files with complete content, and generate Excel templates. Everything lives under `Job-Portal-Opening/` in the project root.

**Tech Stack:** Markdown files, Excel (.xlsx via Python openpyxl), folder structure on disk.

**Spec:** `docs/superpowers/specs/job-opening-design.md`

---

## File Map

```
Job-Portal-Opening/
|-- 01-JDs-Raw/
|   |-- Word/                            (empty, awaiting HR input)
|   |-- PDF/                             (empty, awaiting HR input)
|-- 02-Master-Data/
|   |-- job-master-sheet.xlsx            (Excel with 2 sheets: Job Master + Screening Questions)
|   |-- job-to-portal-mapping.xlsx       (Excel with mapping matrix)
|-- 03-Portal-Formats/
|   |-- format-linkedin.md
|   |-- format-naukri.md
|   |-- format-iimjobs.md
|   |-- format-indeed.md
|   |-- format-internshala.md
|-- 04-Screening-Questions/
|   |-- (empty, populated per job as HR provides data)
|-- 05-Message-Templates/
|   |-- application-received.md
|   |-- shortlisting-notification.md
|   |-- interview-invite.md
|   |-- selection-offer.md
|   |-- rejection.md
|   |-- on-hold-waitlisted.md
|-- 06-Context/
    |-- job-portal-opening-context.md
```

---

### Task 1: Create Folder Structure

**Files:**
- Create: `Job-Portal-Opening/01-JDs-Raw/Word/` (directory)
- Create: `Job-Portal-Opening/01-JDs-Raw/PDF/` (directory)
- Create: `Job-Portal-Opening/02-Master-Data/` (directory)
- Create: `Job-Portal-Opening/03-Portal-Formats/` (directory)
- Create: `Job-Portal-Opening/04-Screening-Questions/` (directory)
- Create: `Job-Portal-Opening/05-Message-Templates/` (directory)
- Create: `Job-Portal-Opening/06-Context/` (directory)

- [ ] **Step 1: Create all directories**

```bash
cd "c:/Users/Lenovo/OneDrive/Desktop/Work/OG"
mkdir -p Job-Portal-Opening/01-JDs-Raw/Word
mkdir -p Job-Portal-Opening/01-JDs-Raw/PDF
mkdir -p Job-Portal-Opening/02-Master-Data
mkdir -p Job-Portal-Opening/03-Portal-Formats
mkdir -p Job-Portal-Opening/04-Screening-Questions
mkdir -p Job-Portal-Opening/05-Message-Templates
mkdir -p Job-Portal-Opening/06-Context
```

- [ ] **Step 2: Verify structure**

```bash
find Job-Portal-Opening -type d | sort
```

Expected output:
```
Job-Portal-Opening
Job-Portal-Opening/01-JDs-Raw
Job-Portal-Opening/01-JDs-Raw/PDF
Job-Portal-Opening/01-JDs-Raw/Word
Job-Portal-Opening/02-Master-Data
Job-Portal-Opening/03-Portal-Formats
Job-Portal-Opening/04-Screening-Questions
Job-Portal-Opening/05-Message-Templates
Job-Portal-Opening/06-Context
```

---

### Task 2: Create Master Job Excel Sheet

**Files:**
- Create: `Job-Portal-Opening/02-Master-Data/job-master-sheet.xlsx`

- [ ] **Step 1: Install openpyxl if needed**

```bash
pip install openpyxl
```

- [ ] **Step 2: Create the Excel file with both sheets**

Run this Python script:

```python
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

wb = openpyxl.Workbook()

# ── Sheet 1: Job Master ──
ws1 = wb.active
ws1.title = "Job Master"

headers = [
    "Job ID", "Job Title", "Department", "Location", "Employment Type",
    "Job Level", "Experience Required", "Salary Range", "Number of Openings",
    "Reporting To", "Required Skills", "Preferred Skills", "Job Description",
    "Screening Questions", "Target Portals", "Posting Status", "Date Created"
]

# Header styling
header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
header_fill = PatternFill(start_color="2F5496", end_color="2F5496", fill_type="solid")
thin_border = Border(
    left=Side(style="thin"),
    right=Side(style="thin"),
    top=Side(style="thin"),
    bottom=Side(style="thin")
)

for col_num, header in enumerate(headers, 1):
    cell = ws1.cell(row=1, column=col_num, value=header)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = thin_border

# Column widths
widths = [14, 25, 18, 20, 18, 15, 18, 16, 16, 20, 30, 30, 40, 20, 25, 15, 14]
for i, w in enumerate(widths, 1):
    ws1.column_dimensions[get_column_letter(i)].width = w

# Data validations (dropdowns)
emp_type_val = DataValidation(type="list", formula1='"Full-time,Part-time,Contract,Internship"', allow_blank=True)
emp_type_val.error = "Please select a valid Employment Type"
emp_type_val.errorTitle = "Invalid Entry"
ws1.add_data_validation(emp_type_val)
emp_type_val.add("E2:E1000")

job_level_val = DataValidation(type="list", formula1='"Leadership,Mid-Level,Entry-Level,Intern"', allow_blank=True)
job_level_val.error = "Please select a valid Job Level"
job_level_val.errorTitle = "Invalid Entry"
ws1.add_data_validation(job_level_val)
job_level_val.add("F2:F1000")

status_val = DataValidation(type="list", formula1='"Draft,Posted,Closed"', allow_blank=True)
status_val.error = "Please select a valid Posting Status"
status_val.errorTitle = "Invalid Entry"
ws1.add_data_validation(status_val)
status_val.add("P2:P1000")

# Sample row
sample = [
    "OG-2026-001", "VP - Operations", "Operations", "Mumbai, India",
    "Full-time", "Leadership", "10-15 years", "30-40 LPA", 2, "CEO",
    "Strategic Planning, P&L Management", "Six Sigma, SAP",
    "See JD document in 01-JDs-Raw folder", "See Sheet 2", "LinkedIn, IIM Jobs",
    "Draft", "2026-04-10"
]
for col_num, value in enumerate(sample, 1):
    cell = ws1.cell(row=2, column=col_num, value=value)
    cell.border = thin_border
    cell.alignment = Alignment(vertical="center", wrap_text=True)

# Freeze top row
ws1.freeze_panes = "A2"
# Auto-filter
ws1.auto_filter.ref = f"A1:Q1"

# ── Sheet 2: Screening Questions ──
ws2 = wb.create_sheet("Screening Questions")

sq_headers = ["Job ID", "Question No.", "Question Text", "Expected Answer Type"]
for col_num, header in enumerate(sq_headers, 1):
    cell = ws2.cell(row=1, column=col_num, value=header)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = thin_border

sq_widths = [14, 14, 50, 22]
for i, w in enumerate(sq_widths, 1):
    ws2.column_dimensions[get_column_letter(i)].width = w

answer_type_val = DataValidation(type="list", formula1='"Text,MCQ,Yes-No"', allow_blank=True)
answer_type_val.error = "Please select Text, MCQ, or Yes-No"
answer_type_val.errorTitle = "Invalid Entry"
ws2.add_data_validation(answer_type_val)
answer_type_val.add("D2:D1000")

# Sample rows
sample_questions = [
    ["OG-2026-001", 1, "How many years of experience do you have in operations management?", "Text"],
    ["OG-2026-001", 2, "Have you managed a P&L of over 50 Cr?", "Yes-No"],
    ["OG-2026-001", 3, "What is your current CTC and expected CTC?", "Text"],
]
for row_num, row_data in enumerate(sample_questions, 2):
    for col_num, value in enumerate(row_data, 1):
        cell = ws2.cell(row=row_num, column=col_num, value=value)
        cell.border = thin_border
        cell.alignment = Alignment(vertical="center", wrap_text=True)

ws2.freeze_panes = "A2"
ws2.auto_filter.ref = f"A1:D1"

wb.save("c:/Users/Lenovo/OneDrive/Desktop/Work/OG/Job-Portal-Opening/02-Master-Data/job-master-sheet.xlsx")
print("job-master-sheet.xlsx created successfully")
```

- [ ] **Step 3: Verify the file exists**

```bash
ls -la "Job-Portal-Opening/02-Master-Data/job-master-sheet.xlsx"
```

---

### Task 3: Create Job-to-Portal Mapping Excel

**Files:**
- Create: `Job-Portal-Opening/02-Master-Data/job-to-portal-mapping.xlsx`

- [ ] **Step 1: Create the mapping Excel**

Run this Python script:

```python
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Portal Mapping"

headers = ["Job Level", "Job Category", "LinkedIn", "Naukri.com", "IIM Jobs", "Indeed", "Internshala"]

header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
header_fill = PatternFill(start_color="2F5496", end_color="2F5496", fill_type="solid")
primary_fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
secondary_fill = PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid")
na_fill = PatternFill(start_color="D9D9D9", end_color="D9D9D9", fill_type="solid")
thin_border = Border(
    left=Side(style="thin"), right=Side(style="thin"),
    top=Side(style="thin"), bottom=Side(style="thin")
)

for col_num, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col_num, value=header)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = thin_border

widths = [16, 35, 14, 14, 14, 14, 14]
for i, w in enumerate(widths, 1):
    ws.column_dimensions[get_column_letter(i)].width = w

# Mapping data: [Level, Category, LinkedIn, Naukri, IIM Jobs, Indeed, Internshala]
data = [
    ["Leadership", "Corporate (VP, Director, CXO)", "Primary", "Secondary", "Primary", "-", "-"],
    ["Mid-Level", "Corporate (Manager, Lead)", "Primary", "Primary", "Secondary", "Secondary", "-"],
    ["Mid-Level", "Technical (Engineer, Developer)", "Secondary", "Primary", "-", "Primary", "-"],
    ["Mid-Level", "Field/Site (Supervisor, Foreman)", "-", "Primary", "-", "Primary", "-"],
    ["Entry-Level", "Corporate (Executive, Associate)", "Secondary", "Primary", "-", "Primary", "-"],
    ["Entry-Level", "Technical/Skilled (Electrician, Technician)", "-", "Primary", "-", "Primary", "-"],
    ["Intern", "Any domain", "-", "-", "-", "-", "Primary"],
]

for row_num, row_data in enumerate(data, 2):
    for col_num, value in enumerate(row_data, 1):
        cell = ws.cell(row=row_num, column=col_num, value=value)
        cell.border = thin_border
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        if col_num >= 3:  # portal columns
            if value == "Primary":
                cell.fill = primary_fill
                cell.font = Font(bold=True, color="006100")
            elif value == "Secondary":
                cell.fill = secondary_fill
                cell.font = Font(color="9C5700")
            elif value == "-":
                cell.fill = na_fill
                cell.font = Font(color="808080")

# Legend
legend_row = len(data) + 3
ws.cell(row=legend_row, column=1, value="Legend:").font = Font(bold=True)
ws.cell(row=legend_row + 1, column=1, value="Primary")
ws.cell(row=legend_row + 1, column=2, value="Must post here — highest traction for this category")
ws.cell(row=legend_row + 1, column=1).fill = primary_fill
ws.cell(row=legend_row + 2, column=1, value="Secondary")
ws.cell(row=legend_row + 2, column=2, value="Optional — good to have for extra reach")
ws.cell(row=legend_row + 2, column=1).fill = secondary_fill
ws.cell(row=legend_row + 3, column=1, value="-")
ws.cell(row=legend_row + 3, column=2, value="Not relevant for this category")
ws.cell(row=legend_row + 3, column=1).fill = na_fill

ws.freeze_panes = "A2"

wb.save("c:/Users/Lenovo/OneDrive/Desktop/Work/OG/Job-Portal-Opening/02-Master-Data/job-to-portal-mapping.xlsx")
print("job-to-portal-mapping.xlsx created successfully")
```

- [ ] **Step 2: Verify the file exists**

```bash
ls -la "Job-Portal-Opening/02-Master-Data/job-to-portal-mapping.xlsx"
```

---

### Task 4: Create Portal Format Files

**Files:**
- Create: `Job-Portal-Opening/03-Portal-Formats/format-linkedin.md`
- Create: `Job-Portal-Opening/03-Portal-Formats/format-naukri.md`
- Create: `Job-Portal-Opening/03-Portal-Formats/format-iimjobs.md`
- Create: `Job-Portal-Opening/03-Portal-Formats/format-indeed.md`
- Create: `Job-Portal-Opening/03-Portal-Formats/format-internshala.md`

- [ ] **Step 1: Create format-linkedin.md**

Write to `Job-Portal-Opening/03-Portal-Formats/format-linkedin.md`:

```markdown
# LinkedIn — Job Posting Format & Best Practices

## Required Fields

| Field | Description | Notes |
|-------|-------------|-------|
| Job Title | Clear, searchable role name | Avoid jargon (e.g., use "Software Engineer" not "Code Ninja") |
| Company Name | Organization name | Auto-filled from company page |
| Job Location | City, State/Country | List base city even for remote roles |
| Workplace Type | On-site / Remote / Hybrid | Select one |
| Employment Type | Full-time / Part-time / Contract | Select one |
| Seniority Level | Internship / Entry / Associate / Mid-Senior / Director / Executive | Maps to job level |
| Industry | Company's industry sector | Select from LinkedIn's list |
| Job Function | Department/function of the role | Select from LinkedIn's list |
| Description | Full job description | Supports HTML: bold, bullets, lists |
| Skills | Relevant skill tags | Add up to 10 skills for better matching |
| Apply Method | Easy Apply / External URL | Easy Apply gets more applications |

## Best Practices

1. **Description length: 300-600 words** — concise but comprehensive
2. **Use bullet points** for responsibilities and requirements — LinkedIn renders them cleanly
3. **Include salary range** — posts with pay info get up to 31% more applications
4. **Searchable job titles** — use standard titles candidates actually search for
5. **Highlight company culture and values** — LinkedIn candidates evaluate employer brand heavily
6. **Add industry-specific keywords** naturally throughout for search visibility
7. **Promoted listings reach 3.8x more qualified candidates** — consider for leadership/critical hires
8. **Easy Apply** generates higher application volume than external redirect
9. **Post timing** — Tuesday to Thursday mornings get highest visibility
10. **Company page** should be complete and active — candidates check it before applying

## Description Template

```
About {Company Name}
[2-3 sentences about the company, mission, scale]

Role Overview
[1 paragraph about the position and its impact]

Key Responsibilities
- [Bullet 1]
- [Bullet 2]
- [Bullet 3]
- [Bullet 4]
- [Bullet 5]

Requirements
- [Must-have 1]
- [Must-have 2]
- [Must-have 3]

Good to Have
- [Nice-to-have 1]
- [Nice-to-have 2]

What We Offer
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

CTC Range: {Range}
Location: {Location}
```
```

- [ ] **Step 2: Create format-naukri.md**

Write to `Job-Portal-Opening/03-Portal-Formats/format-naukri.md`:

```markdown
# Naukri.com — Job Posting Format & Best Practices

## Required Fields

| Field | Description | Notes |
|-------|-------------|-------|
| Job Title | Role designation | Avoid multiple titles or abbreviations |
| Location | City/cities | Can select multiple |
| Industry Type | Employer's sector | Select from Naukri's list |
| Functional Area | Department of the role | Critical for search matching |
| Role Category | Specific role type within functional area | Critical for search matching |
| Key Skills | Comma-separated skill keywords | Use auto-suggestions, add maximum relevant keywords |
| Work Experience | Min-Max years | e.g., 5-8 years |
| Salary Bracket | CTC range in LPA | Always show — improves views significantly |
| Educational Qualifications | Minimum education required | e.g., B.Tech, MBA |
| Job Description | Detailed role description | Keep concise and informative |
| Candidate Profile | Ideal candidate description | Character limit: 254 characters |
| Roles & Responsibilities | Detailed duties | Be specific and clear |

## Optional Fields

| Field | Description | Notes |
|-------|-------------|-------|
| Additional Benefits | Perks beyond CTC | Health insurance, ESOPs, etc. |
| Questionnaire | Screening questions | Max 5 questions recommended |

## Best Practices

1. **Always show salary** — posts with visible CTC get significantly more views and applications
2. **Functional Area and Role Category accuracy is critical** — this is how Naukri's search engine matches candidates to your posting
3. **Maximize keywords** in Key Skills field — use Naukri's auto-suggestions as you type
4. **Concise descriptions** — avoid wordy posts; candidates skim quickly
5. **Screening questionnaire: max 5 questions** — more creates friction; mix mandatory and optional
6. **Character limit: 254 characters** for company profile and candidate profile fields
7. **Jobs stay active 31 days** — allow at least 4-5 days for sufficient responses before evaluating
8. **Post regularly** — frequent posting boosts your recruiter search ranking
9. **CTC should match experience and designation** — unrealistic ranges get flagged or ignored
10. **Tailor for audience** — freshers need different positioning than experienced hires

## Description Template

```
Job Title: {Title}
Experience: {Min}-{Max} years
Location: {City}
CTC: {Range} LPA

Job Description:
[Concise paragraph about the role]

Roles & Responsibilities:
- [Duty 1]
- [Duty 2]
- [Duty 3]
- [Duty 4]

Desired Candidate Profile:
[254 characters max — summarize ideal candidate]

Key Skills:
{Skill 1}, {Skill 2}, {Skill 3}, {Skill 4}, {Skill 5}

Education:
{Qualification} from {Institution type}

Benefits:
- [Benefit 1]
- [Benefit 2]
```
```

- [ ] **Step 3: Create format-iimjobs.md**

Write to `Job-Portal-Opening/03-Portal-Formats/format-iimjobs.md`:

```markdown
# IIM Jobs — Job Posting Format & Best Practices

## Required Fields

| Field | Description | Notes |
|-------|-------------|-------|
| Job Title | Role designation | Use corporate/management titles |
| Company Name | Organization name | Brand recognition matters here |
| Job Description | Full role details | Emphasize strategic scope |
| Working Mode | On-site / Remote / Hybrid | Select one |
| Location | City | Primary work location |
| Skills Set | Required competencies | Focus on management/strategy skills |
| Salary Range | CTC range | Always include — expected at this level |
| Experience Level | Years of experience | Typically 5+ years for this platform |

## Best Practices

1. **Target audience: premium management candidates** from IIMs and top B-schools — tailor language and tone accordingly
2. **Emphasize strategic responsibilities** — leadership scope, P&L ownership, team size, business impact
3. **Highlight growth trajectory** — career path, reporting line, organizational influence
4. **Brand prominence** — company scale, industry standing, and market position matter to this audience
5. **Salary transparency is expected** — always include CTC range; this audience benchmarks aggressively
6. **Focus keywords** on consulting, finance, strategy, product management, and general management domains
7. **Professional, executive tone** — avoid casual language or startup-speak
8. **Include company achievements** — revenue, growth rate, market position, notable clients

## Description Template

```
About {Company Name}
[Company overview emphasizing scale, industry position, and achievements]

The Opportunity
[Strategic overview of the role and its business impact]

Key Responsibilities
- [Strategic responsibility 1]
- [Strategic responsibility 2]
- [Leadership responsibility]
- [P&L or business ownership area]

Ideal Candidate
- {X}+ years in {domain}
- Experience in {specific area}
- Track record of {measurable achievement}
- MBA from a top-tier institution (preferred)

What We Offer
- CTC: {Range} LPA
- [Leadership scope]
- [Growth opportunity]
- Location: {City}
```
```

- [ ] **Step 4: Create format-indeed.md**

Write to `Job-Portal-Opening/03-Portal-Formats/format-indeed.md`:

```markdown
# Indeed — Job Posting Format & Best Practices

## Required Fields

| Field | Description | Notes |
|-------|-------------|-------|
| Job Title | Standard role title | Keep searchable — avoid creative titles |
| Company Name | Organization name | |
| Location | Exact city/address | Boosts search ranking |
| Job Type | Full-time / Part-time / Contract / Temporary / Internship | Select one |
| Salary | Pay range (optional but recommended) | Including it increases applications by 31% |
| Job Description | Full role details | Plain text — Indeed strips most formatting |
| Qualifications | Required skills and education | Put at the top of description |
| Benefits | Perks and benefits offered | Increases application rate |

## Best Practices

1. **Structure using the 3 R's:** Requirements (top) -> Responsibilities (middle) -> Rewards (bottom)
2. **Put requirements first** — candidates scan quickly to check if they qualify
3. **Optimal length: 700-2,000 characters** — posts in this range get up to 30% more applications
4. **Include exact job location** — specific addresses boost search result ranking
5. **Pay range and benefits** increase applications by up to 31%
6. **Use plain text** — Indeed strips rich formatting, so don't rely on bold/bullets in the editor
7. **Standard, searchable job titles** — "Electrical Engineer" not "Spark Master"
8. **Be specific about qualifications** — vague requirements attract unqualified applicants
9. **Include benefits prominently** — Indeed highlights these in search results
10. **Avoid all-caps or excessive punctuation** — triggers spam filters

## Description Template

```
{Company Name} is hiring a {Job Title} in {Location}.

Requirements:
- {Qualification 1}
- {Qualification 2}
- {Experience} years of experience in {domain}
- {Education requirement}

Responsibilities:
- {Duty 1}
- {Duty 2}
- {Duty 3}
- {Duty 4}

Salary: {Range}
Job Type: {Type}

Benefits:
- {Benefit 1}
- {Benefit 2}
- {Benefit 3}

To apply, submit your resume and cover letter.
```
```

- [ ] **Step 5: Create format-internshala.md**

Write to `Job-Portal-Opening/03-Portal-Formats/format-internshala.md`:

```markdown
# Internshala — Job/Internship Posting Format & Best Practices

## Required Fields

| Field | Description | Notes |
|-------|-------------|-------|
| Profile Name | Job/internship title | Choose precise title to reduce vague applications |
| Organization Name | Company name | |
| Location | City or "Work From Home" | WFH option available |
| Duration | 1-6 months (for internships) | Optimal: 2-3 months |
| Stipend / CTC | Monthly stipend or annual CTC | Minimums apply (see below) |
| Start Date | When the role begins | |
| Skills Required | Key competencies | Be specific |
| Number of Openings | Positions available | Avoid >20 per listing |
| Job Description | Role details and expectations | Max 2,500 characters |
| Perks | Additional benefits | Certificate, letter of rec, flexible hours, etc. |

## Stipend Minimums

| Type | Minimum |
|------|---------|
| WFH Internship | Rs.1,000/month |
| In-office Internship | Rs.2,000/month |
| Fresher Job | 2 LPA CTC |

## Best Practices

1. **Always post paid opportunities** — unpaid only approved for NGOs or niche profiles (Law/Legal)
2. **Optimal duration: 2-3 months** — gets significantly more interest from candidates
3. **Include "What candidates will learn" section** — this audience is learning-oriented and values growth
4. **Avoid bulk hiring (>20 per listing)** — keep postings focused and specific
5. **Description max: 2,500 characters** — be concise and impactful
6. **Postings go through review (up to 48 hours)** — plan your posting timeline accordingly
7. **Premium listing (Rs.4,999 for jobs)** — extra visibility, smart database access, relationship manager
8. **Professional tone** — avoid casual language or requests for personal social media promotion
9. **Competitive stipend** — benchmark against location and industry standards
10. **Highlight perks** — certificate, PPO possibility, flexible hours, mentorship

## Description Template (Internship)

```
About {Company Name}
[1-2 sentences about the company]

About the Internship
[What the intern will work on]

Responsibilities
- [Task 1]
- [Task 2]
- [Task 3]

What You'll Learn
- [Skill/knowledge 1]
- [Skill/knowledge 2]
- [Skill/knowledge 3]

Requirements
- [Skill 1]
- [Skill 2]
- Currently pursuing / recently completed {Degree}

Stipend: Rs.{Amount}/month
Duration: {X} months
Location: {City / Work From Home}
Start Date: {Date}

Perks:
- Certificate
- Letter of recommendation
- {Other perks}
```

## Description Template (Fresher Job)

```
About {Company Name}
[1-2 sentences about the company]

Role Overview
[What the role involves and growth path]

Responsibilities
- [Duty 1]
- [Duty 2]
- [Duty 3]

Requirements
- {Degree} in {Field}
- {Skill 1}, {Skill 2}
- 0-{X} years experience

CTC: {Range} LPA
Location: {City}

Benefits:
- {Benefit 1}
- {Benefit 2}
```
```

- [ ] **Step 6: Verify all 5 format files exist**

```bash
ls -la Job-Portal-Opening/03-Portal-Formats/
```

Expected: 5 files (format-linkedin.md, format-naukri.md, format-iimjobs.md, format-indeed.md, format-internshala.md)

---

### Task 5: Create Message Template Files

**Files:**
- Create: `Job-Portal-Opening/05-Message-Templates/application-received.md`
- Create: `Job-Portal-Opening/05-Message-Templates/shortlisting-notification.md`
- Create: `Job-Portal-Opening/05-Message-Templates/interview-invite.md`
- Create: `Job-Portal-Opening/05-Message-Templates/selection-offer.md`
- Create: `Job-Portal-Opening/05-Message-Templates/rejection.md`
- Create: `Job-Portal-Opening/05-Message-Templates/on-hold-waitlisted.md`

- [ ] **Step 1: Create application-received.md**

Write to `Job-Portal-Opening/05-Message-Templates/application-received.md`:

```markdown
# Application Received

**When to use:** Immediately after a candidate submits an application.

---

**Subject:** Application Received — {Job Title} at {Company Name}

---

Dear {Candidate Name},

Thank you for applying for the position of **{Job Title}** at **{Company Name}**. We have successfully received your application.

Our hiring team is currently reviewing all applications. If your profile matches our requirements, we will reach out to you within **{Timeline, e.g., 7-10 working days}** with the next steps.

In the meantime, please feel free to reach out to us at {HR Email} for any queries.

Best regards,
{HR Name}
{Designation}
{Company Name}

---

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| {Candidate Name} | Applicant's full name | Rahul Sharma |
| {Job Title} | Position applied for | VP - Operations |
| {Company Name} | Organization name | OG Corp |
| {Timeline} | Expected response time | 7-10 working days |
| {HR Email} | HR contact email | hr@ogcorp.com |
| {HR Name} | HR person's name | Priya Mehta |
| {Designation} | HR person's title | Senior HR Executive |
```

- [ ] **Step 2: Create shortlisting-notification.md**

Write to `Job-Portal-Opening/05-Message-Templates/shortlisting-notification.md`:

```markdown
# Shortlisting Notification

**When to use:** When a candidate's profile is shortlisted for the next selection stage.

---

**Subject:** You've Been Shortlisted — {Job Title} at {Company Name}

---

Dear {Candidate Name},

We are pleased to inform you that your application for the position of **{Job Title}** has been shortlisted for the next stage of our selection process.

We were impressed by your background and believe your skills could be a strong fit for this role. Our team will contact you shortly with details regarding the next round.

Please ensure your contact details are up to date and you are available for communication over the coming days.

Best regards,
{HR Name}
{Designation}
{Company Name}

---

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| {Candidate Name} | Applicant's full name | Rahul Sharma |
| {Job Title} | Position applied for | VP - Operations |
| {Company Name} | Organization name | OG Corp |
| {HR Name} | HR person's name | Priya Mehta |
| {Designation} | HR person's title | Senior HR Executive |
```

- [ ] **Step 3: Create interview-invite.md**

Write to `Job-Portal-Opening/05-Message-Templates/interview-invite.md`:

```markdown
# Interview Invite

**When to use:** When scheduling an interview with a shortlisted candidate.

---

**Subject:** Interview Invitation — {Job Title} at {Company Name}

---

Dear {Candidate Name},

Congratulations! We would like to invite you for an interview for the position of **{Job Title}** at **{Company Name}**.

**Interview Details:**
- **Round:** {Interview Round, e.g., Technical Round 1 / HR Round}
- **Date:** {Date}
- **Time:** {Time} IST
- **Mode:** {Online / In-Person}
- **Location/Link:** {Office Address / Meeting Link}
- **Duration:** Approximately {Duration, e.g., 30-45 minutes}
- **Panel:** {Interviewer Name(s) and Designation(s)}

**Please carry/keep ready:**
- Updated resume
- Government-issued photo ID
- {Any additional documents}

Kindly confirm your availability by replying to this email by **{Confirmation Deadline}**.

If you have any questions or need to reschedule, please contact us at {HR Email} or {HR Phone}.

Best regards,
{HR Name}
{Designation}
{Company Name}

---

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| {Candidate Name} | Applicant's full name | Rahul Sharma |
| {Job Title} | Position applied for | VP - Operations |
| {Company Name} | Organization name | OG Corp |
| {Interview Round} | Which round | Technical Round 1 |
| {Date} | Interview date | 2026-04-20 |
| {Time} | Interview time | 11:00 AM |
| {Mode} | Online or In-Person | Online |
| {Location/Link} | Address or meeting URL | https://meet.google.com/xyz |
| {Duration} | Expected length | 30-45 minutes |
| {Panel} | Interviewer names and titles | Mr. Verma, CTO |
| {Confirmation Deadline} | Reply-by date | 2026-04-18 |
| {HR Email} | HR contact email | hr@ogcorp.com |
| {HR Phone} | HR contact phone | +91-XXXXXXXXXX |
| {HR Name} | HR person's name | Priya Mehta |
| {Designation} | HR person's title | Senior HR Executive |
```

- [ ] **Step 4: Create selection-offer.md**

Write to `Job-Portal-Opening/05-Message-Templates/selection-offer.md`:

```markdown
# Selection / Offer

**When to use:** When a candidate is selected and you are extending the offer.

---

**Subject:** Congratulations! Job Offer — {Job Title} at {Company Name}

---

Dear {Candidate Name},

We are delighted to inform you that you have been **selected** for the position of **{Job Title}** at **{Company Name}**.

After careful evaluation, we believe your skills and experience make you an excellent fit for our team.

**Offer Details:**
- **Position:** {Job Title}
- **Department:** {Department}
- **CTC:** {CTC Offered}
- **Joining Date:** {Expected Joining Date}
- **Reporting To:** {Manager Name, Designation}
- **Work Location:** {Location}

A formal offer letter with complete terms and conditions will be shared with you shortly. Please confirm your acceptance by replying to this email by **{Acceptance Deadline}**.

We look forward to welcoming you to the team!

Best regards,
{HR Name}
{Designation}
{Company Name}

---

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| {Candidate Name} | Applicant's full name | Rahul Sharma |
| {Job Title} | Position offered | VP - Operations |
| {Company Name} | Organization name | OG Corp |
| {Department} | Team/division | Operations |
| {CTC Offered} | Compensation package | 35 LPA |
| {Expected Joining Date} | Start date | 2026-05-15 |
| {Manager Name, Designation} | Reporting manager | Mr. Kapoor, CEO |
| {Location} | Work location | Mumbai, India |
| {Acceptance Deadline} | Reply-by date | 2026-04-25 |
| {HR Name} | HR person's name | Priya Mehta |
| {Designation} | HR person's title | Senior HR Executive |
```

- [ ] **Step 5: Create rejection.md**

Write to `Job-Portal-Opening/05-Message-Templates/rejection.md`:

```markdown
# Rejection

**When to use:** When a candidate is not selected after evaluation.

---

**Subject:** Update on Your Application — {Job Title} at {Company Name}

---

Dear {Candidate Name},

Thank you for taking the time to apply for the position of **{Job Title}** at **{Company Name}** and for your interest in joining our team.

After careful consideration, we regret to inform you that we have decided to move forward with other candidates whose profiles more closely match our current requirements.

This decision does not reflect on your abilities, and we encourage you to apply for future openings that align with your skills and experience.

We wish you all the best in your career journey.

Warm regards,
{HR Name}
{Designation}
{Company Name}

---

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| {Candidate Name} | Applicant's full name | Rahul Sharma |
| {Job Title} | Position applied for | VP - Operations |
| {Company Name} | Organization name | OG Corp |
| {HR Name} | HR person's name | Priya Mehta |
| {Designation} | HR person's title | Senior HR Executive |
```

- [ ] **Step 6: Create on-hold-waitlisted.md**

Write to `Job-Portal-Opening/05-Message-Templates/on-hold-waitlisted.md`:

```markdown
# On Hold / Waitlisted

**When to use:** When the hiring decision is pending and the candidate needs a status update.

---

**Subject:** Application Status Update — {Job Title} at {Company Name}

---

Dear {Candidate Name},

Thank you for your continued interest in the position of **{Job Title}** at **{Company Name}**.

We wanted to update you that your application is currently **on hold**. This is not a rejection — our hiring process for this role is still ongoing, and we expect to have a final decision by **{Expected Timeline}**.

We appreciate your patience and will keep you informed as soon as there is an update. If you have any questions, please feel free to reach out to us at {HR Email}.

Best regards,
{HR Name}
{Designation}
{Company Name}

---

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| {Candidate Name} | Applicant's full name | Rahul Sharma |
| {Job Title} | Position applied for | VP - Operations |
| {Company Name} | Organization name | OG Corp |
| {Expected Timeline} | When to expect a decision | end of April 2026 |
| {HR Email} | HR contact email | hr@ogcorp.com |
| {HR Name} | HR person's name | Priya Mehta |
| {Designation} | HR person's title | Senior HR Executive |
```

- [ ] **Step 7: Verify all 6 template files exist**

```bash
ls -la Job-Portal-Opening/05-Message-Templates/
```

Expected: 6 files

---

### Task 6: Create Context File

**Files:**
- Create: `Job-Portal-Opening/06-Context/job-portal-opening-context.md`

- [ ] **Step 1: Create the comprehensive context file**

Write to `Job-Portal-Opening/06-Context/job-portal-opening-context.md`:

```markdown
# Job Portal Opening — Phase 1 Context Document

**Created:** 2026-04-10
**Purpose:** Internal reference, HR handoff guide, and detailed specification for the Job Portal Opening process.

---

## A. Internal Reference — Decisions Made

### Approach
Semi-Automated with Templates (Approach 2). We create structured templates, Excel sheets, and organized folders. HR provides raw data, we structure it. No automation tooling in Phase 1 — focus is on getting the process right.

### Mapping Logic
Job-to-portal mapping is based on **platform trends** — which portal gets the most traction for each job type. Not based on arbitrary rules but on where each category of job actually performs best.

### Platforms Selected
1. **LinkedIn** — Corporate, leadership, and mid-level professional roles
2. **Naukri.com** — Broadest reach across all levels in India
3. **IIM Jobs** — Premium management roles, leadership positions
4. **Indeed** — Technical, field/site, and entry-level roles
5. **Internshala** — Internships and fresher positions only

### Folder Structure Rationale
Numbered folders (01-06) for process order. Hybrid organization — top-level by category, job-specific files within where applicable. All lowercase with hyphens, no spaces.

### Field Definitions
Master Excel has 17 columns covering: identification (Job ID), role details (title, department, location, type, level), compensation (salary, experience), team (reporting to, openings), skills (required, preferred), content (JD, screening questions), process (target portals, status, date).

---

## B. HR Handoff Guide — What HR Needs to Provide

### 1. Raw JD Documents
- **Format:** Word (.docx) or PDF (.pdf)
- **Where to place:** `01-JDs-Raw/Word/` or `01-JDs-Raw/PDF/`
- **Naming:** Use job title and department, e.g., `VP-Operations.docx`, `Site-Supervisor-Mumbai.pdf`
- **Content needed:** Full job description including responsibilities, qualifications, experience, and any special requirements

### 2. Job Details for Master Sheet
For each job opening, HR must provide:

| Field | Required? | Notes |
|-------|-----------|-------|
| Job Title | Yes | Official designation |
| Department | Yes | Team or division |
| Location | Yes | City and state |
| Employment Type | Yes | Full-time / Part-time / Contract / Internship |
| Job Level | Yes | Leadership / Mid-Level / Entry-Level / Intern |
| Experience Required | Yes | Range (e.g., 5-8 years) |
| Salary Range | Recommended | CTC range in LPA |
| Number of Openings | Yes | How many positions |
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
- Review the mapping matrix in `02-Master-Data/job-to-portal-mapping.xlsx`
- Confirm or adjust which job categories map to which portals
- Flag any jobs that need exceptions to the default mapping

---

## C. Detailed Spec

### Excel Column Specifications

**Sheet 1 — Job Master:**
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
HR provides JDs (Word/PDF)
    |
    v
We parse JDs -> populate Master Excel (Sheet 1)
    |
    v
HR provides screening questions per job
    |
    v
We add to Sheet 2 + individual files in 04-Screening-Questions/
    |
    v
We apply mapping matrix -> fill Target Portals column
    |
    v
HR reviews message templates in 05-Message-Templates/
    |
    v
Jobs posted to respective portals using 03-Portal-Formats/ as reference
    |
    v
Message templates used throughout hiring lifecycle
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
| `04-Screening-Questions/` | Per-job screening question files (by Job ID) |
| `05-Message-Templates/application-received.md` | Auto-acknowledgment template |
| `05-Message-Templates/shortlisting-notification.md` | Shortlist notification template |
| `05-Message-Templates/interview-invite.md` | Interview scheduling template |
| `05-Message-Templates/selection-offer.md` | Offer extension template |
| `05-Message-Templates/rejection.md` | Rejection communication template |
| `05-Message-Templates/on-hold-waitlisted.md` | Waitlist status update template |
| `06-Context/job-portal-opening-context.md` | This file |
```

- [ ] **Step 2: Verify the context file exists**

```bash
ls -la Job-Portal-Opening/06-Context/
```

---

### Task 7: Final Verification

- [ ] **Step 1: Verify complete directory structure**

```bash
find Job-Portal-Opening -type f | sort
```

Expected output:
```
Job-Portal-Opening/02-Master-Data/job-master-sheet.xlsx
Job-Portal-Opening/02-Master-Data/job-to-portal-mapping.xlsx
Job-Portal-Opening/03-Portal-Formats/format-iimjobs.md
Job-Portal-Opening/03-Portal-Formats/format-indeed.md
Job-Portal-Opening/03-Portal-Formats/format-internshala.md
Job-Portal-Opening/03-Portal-Formats/format-linkedin.md
Job-Portal-Opening/03-Portal-Formats/format-naukri.md
Job-Portal-Opening/05-Message-Templates/application-received.md
Job-Portal-Opening/05-Message-Templates/interview-invite.md
Job-Portal-Opening/05-Message-Templates/on-hold-waitlisted.md
Job-Portal-Opening/05-Message-Templates/rejection.md
Job-Portal-Opening/05-Message-Templates/selection-offer.md
Job-Portal-Opening/05-Message-Templates/shortlisting-notification.md
Job-Portal-Opening/06-Context/job-portal-opening-context.md
```

- [ ] **Step 2: Verify Excel files are valid**

```python
import openpyxl
wb1 = openpyxl.load_workbook("c:/Users/Lenovo/OneDrive/Desktop/Work/OG/Job-Portal-Opening/02-Master-Data/job-master-sheet.xlsx")
print(f"job-master-sheet.xlsx sheets: {wb1.sheetnames}")
print(f"Job Master headers: {[cell.value for cell in wb1['Job Master'][1]]}")
print(f"Screening Questions headers: {[cell.value for cell in wb1['Screening Questions'][1]]}")

wb2 = openpyxl.load_workbook("c:/Users/Lenovo/OneDrive/Desktop/Work/OG/Job-Portal-Opening/02-Master-Data/job-to-portal-mapping.xlsx")
print(f"job-to-portal-mapping.xlsx sheets: {wb2.sheetnames}")
print(f"Mapping headers: {[cell.value for cell in wb2['Portal Mapping'][1]]}")
print("All Excel files valid!")
```

- [ ] **Step 3: Confirm task complete**

All files created, structure verified, ready for HR handoff.
