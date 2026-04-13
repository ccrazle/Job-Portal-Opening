# Job Portal Opening — Phase 1 Design Spec

**Date:** 2026-04-10
**Status:** Approved
**Approach:** Semi-Automated with Templates (Approach 2)

---

## Overview

Design and build the first phase of a job portal opening process. HR provides raw JD documents (Word/PDF), screening questions, and message templates. We structure everything into organized, reusable assets: a master Excel sheet, job-to-portal mapping, portal-specific format references, screening questions, message templates, and a comprehensive context file.

---

## 1. Master Job Excel Sheet

### Sheet 1: Job Master

| Column | Description | Example |
|--------|-------------|---------|
| Job ID | Unique identifier | OG-2026-001 |
| Job Title | Role name | VP - Operations |
| Department | Team/Division | Operations |
| Location | Work location | Mumbai, India |
| Employment Type | Full-time / Part-time / Contract / Internship | Full-time |
| Job Level | Leadership / Mid-Level / Entry-Level / Intern | Leadership |
| Experience Required | Min-Max years | 10-15 years |
| Salary Range | CTC range (optional) | 30-40 LPA |
| Number of Openings | Positions available | 2 |
| Reporting To | Manager/designation | CEO |
| Required Skills | Must-have skills | Strategic Planning, P&L Management |
| Preferred Skills | Nice-to-have skills | Six Sigma, SAP |
| Job Description | Full JD text (or link to file) | See JD document |
| Screening Questions | HR-provided questions for this role | Listed in Sheet 2 |
| Target Portals | Auto-filled from mapping | LinkedIn, IIM Jobs |
| Posting Status | Draft / Posted / Closed | Draft |
| Date Created | When entry was added | 2026-04-10 |

### Sheet 2: Screening Questions

| Column | Description |
|--------|-------------|
| Job ID | Links to Sheet 1 |
| Question No. | Sequential number |
| Question Text | The screening question |
| Expected Answer Type | Text / MCQ / Yes-No |

---

## 2. Job-to-Portal Mapping Matrix

Mapping based on where each job type gets the most traction (real platform trends).

| Job Level | Job Category | LinkedIn | Naukri.com | IIM Jobs | Indeed | Internshala |
|-----------|-------------|----------|------------|----------|--------|-------------|
| Leadership | Corporate (VP, Director, CXO) | **Primary** | Secondary | **Primary** | - | - |
| Mid-Level | Corporate (Manager, Lead) | **Primary** | **Primary** | Secondary | Secondary | - |
| Mid-Level | Technical (Engineer, Developer) | Secondary | **Primary** | - | **Primary** | - |
| Mid-Level | Field/Site (Supervisor, Foreman) | - | **Primary** | - | **Primary** | - |
| Entry-Level | Corporate (Executive, Associate) | Secondary | **Primary** | - | **Primary** | - |
| Entry-Level | Technical/Skilled (Electrician, Technician) | - | **Primary** | - | **Primary** | - |
| Intern | Any domain | - | - | - | - | **Primary** |

**Legend:**
- **Primary** — must post here, highest traction for this category
- **Secondary** — optional, good to have for extra reach
- **-** — not relevant for this category

---

## 3. Job Portal Formats & Best Practices

### LinkedIn

**Required Fields:**
- Job Title, Company Name, Job Location (even for remote — list base city), Workplace Type (On-site/Remote/Hybrid), Employment Type (Full-time/Part-time/Contract), Seniority Level, Industry, Job Function, Description (supports HTML — bold, bullets, lists), Skills tags, Apply method (Easy Apply / External URL)

**Best Practices:**
- Keep description **300-600 words** — concise but detailed
- Use **bullet points** for responsibilities and requirements — LinkedIn renders them well
- Include **salary range** — posts with pay info get up to 31% more applications
- Use **clear, searchable job titles** (avoid internal jargon like "Rockstar Developer")
- Highlight **company culture and values** — LinkedIn candidates care about this
- Add **industry-specific keywords** naturally for search visibility
- Promoted listings reach **3.8x more qualified candidates** — consider for critical hires

### Naukri.com

**Required Fields:**
- Job Title, Location, Industry Type, Functional Area, Role Category, Key Skills (comma-separated), Work Experience (min-max years), Salary Bracket (CTC range), Educational Qualifications, Job Description, Candidate Profile, Roles & Responsibilities

**Optional Fields:**
- Additional Benefits, Questionnaire (screening questions)

**Best Practices:**
- **Always show salary** — posts with visible CTC get significantly more views
- Select **Functional Area and Role Category accurately** — this is how Naukri's search engine matches candidates
- Add **maximum relevant keywords** in the Key Skills field — use the auto-suggestions
- Keep description **concise and informative** — avoid being too wordy
- Screening questionnaire should have **no more than 5 questions**, mix of mandatory and optional
- **Character limit: 254 characters** for descriptive fields (company profile, candidate profile)
- Jobs stay active for **31 days** — give at least 4-5 days for sufficient responses
- Post regularly to **boost recruiter search ranking**

### IIM Jobs

**Required Fields:**
- Job Title, Company Name, Job Description, Working Mode (On-site/Remote/Hybrid), Location, Skills Set, Salary Range, Experience Level

**Best Practices:**
- Targets **premium management candidates from IIMs and top B-schools** — tailor language accordingly
- Emphasize **strategic responsibilities, leadership scope, and growth trajectory**
- Highlight **brand name, company scale, and industry standing** — this audience is brand-conscious
- Salary transparency is expected — always include **CTC range**
- Focus on **consulting, finance, strategy, product, and general management** keywords

### Indeed

**Required Fields:**
- Job Title, Company Name, Location, Job Type (Full-time/Part-time/Contract/Temporary/Internship), Salary (optional but recommended), Job Description, Qualifications, Benefits

**Best Practices:**
- Structure description using the **3 R's: Requirements -> Responsibilities -> Rewards**
- Put **requirements at the top** — candidates scan quickly to check eligibility
- Optimal length: **700-2,000 characters** — posts in this range get up to 30% more applications
- Include **exact job location** — boosts search result ranking
- Including **pay range and benefits** increases applications by up to 31%
- Use **plain text** — Indeed strips most formatting, so avoid relying on rich text
- Keep job titles **standard and searchable** — avoid creative titles

### Internshala

**Required Fields:**
- Profile Name (job/internship title), Organization Name, Location (or Work From Home), Duration (1-6 months for internships), Stipend/CTC, Start Date, Skills Required, Number of Openings, Job Description, Perks

**Stipend Minimums:**
- WFH internships: min Rs.1,000/month
- In-office internships: min Rs.2,000/month
- Fresher jobs: min 2 LPA CTC

**Best Practices:**
- **Always post paid internships** unless for NGOs or niche profiles (Law/Legal)
- **Optimal duration: 2-3 months** — gets more interest from candidates
- Include **"what candidates will learn"** section — this audience is learning-oriented
- Avoid bulk hiring (>20 per listing) — keep it focused
- Description max **2,500 characters**
- Postings go through **review (up to 48 hours)** — plan posting timeline accordingly
- Consider **premium listing** (Rs.4,999 for jobs) for extra visibility and smart database access
- Use a **professional tone** — avoid casual language or requesting personal social media promotion

---

## 4. Message Templates

### 4.1 Application Received

> **Subject:** Application Received — {Job Title} at {Company Name}
>
> Dear {Candidate Name},
>
> Thank you for applying for the position of **{Job Title}** at **{Company Name}**. We have successfully received your application.
>
> Our hiring team is currently reviewing all applications. If your profile matches our requirements, we will reach out to you within **{Timeline, e.g., 7-10 working days}** with the next steps.
>
> In the meantime, please feel free to reach out to us at {HR Email} for any queries.
>
> Best regards,
> {HR Name}
> {Designation}
> {Company Name}

### 4.2 Shortlisting Notification

> **Subject:** You've Been Shortlisted — {Job Title} at {Company Name}
>
> Dear {Candidate Name},
>
> We are pleased to inform you that your application for the position of **{Job Title}** has been shortlisted for the next stage of our selection process.
>
> We were impressed by your background and believe your skills could be a strong fit for this role. Our team will contact you shortly with details regarding the next round.
>
> Please ensure your contact details are up to date and you are available for communication over the coming days.
>
> Best regards,
> {HR Name}
> {Designation}
> {Company Name}

### 4.3 Interview Invite

> **Subject:** Interview Invitation — {Job Title} at {Company Name}
>
> Dear {Candidate Name},
>
> Congratulations! We would like to invite you for an interview for the position of **{Job Title}** at **{Company Name}**.
>
> **Interview Details:**
> - **Round:** {Interview Round, e.g., Technical Round 1 / HR Round}
> - **Date:** {Date}
> - **Time:** {Time} IST
> - **Mode:** {Online / In-Person}
> - **Location/Link:** {Office Address / Meeting Link}
> - **Duration:** Approximately {Duration, e.g., 30-45 minutes}
> - **Panel:** {Interviewer Name(s) and Designation(s)}
>
> **Please carry/keep ready:**
> - Updated resume
> - Government-issued photo ID
> - {Any additional documents}
>
> Kindly confirm your availability by replying to this email by **{Confirmation Deadline}**.
>
> If you have any questions or need to reschedule, please contact us at {HR Email} or {HR Phone}.
>
> Best regards,
> {HR Name}
> {Designation}
> {Company Name}

### 4.4 Selection / Offer

> **Subject:** Congratulations! Job Offer — {Job Title} at {Company Name}
>
> Dear {Candidate Name},
>
> We are delighted to inform you that you have been **selected** for the position of **{Job Title}** at **{Company Name}**.
>
> After careful evaluation, we believe your skills and experience make you an excellent fit for our team.
>
> **Offer Details:**
> - **Position:** {Job Title}
> - **Department:** {Department}
> - **CTC:** {CTC Offered}
> - **Joining Date:** {Expected Joining Date}
> - **Reporting To:** {Manager Name, Designation}
> - **Work Location:** {Location}
>
> A formal offer letter with complete terms and conditions will be shared with you shortly. Please confirm your acceptance by replying to this email by **{Acceptance Deadline}**.
>
> We look forward to welcoming you to the team!
>
> Best regards,
> {HR Name}
> {Designation}
> {Company Name}

### 4.5 Rejection

> **Subject:** Update on Your Application — {Job Title} at {Company Name}
>
> Dear {Candidate Name},
>
> Thank you for taking the time to apply for the position of **{Job Title}** at **{Company Name}** and for your interest in joining our team.
>
> After careful consideration, we regret to inform you that we have decided to move forward with other candidates whose profiles more closely match our current requirements.
>
> This decision does not reflect on your abilities, and we encourage you to apply for future openings that align with your skills and experience.
>
> We wish you all the best in your career journey.
>
> Warm regards,
> {HR Name}
> {Designation}
> {Company Name}

### 4.6 On Hold / Waitlisted

> **Subject:** Application Status Update — {Job Title} at {Company Name}
>
> Dear {Candidate Name},
>
> Thank you for your continued interest in the position of **{Job Title}** at **{Company Name}**.
>
> We wanted to update you that your application is currently **on hold**. This is not a rejection — our hiring process for this role is still ongoing, and we expect to have a final decision by **{Expected Timeline}**.
>
> We appreciate your patience and will keep you informed as soon as there is an update. If you have any questions, please feel free to reach out to us at {HR Email}.
>
> Best regards,
> {HR Name}
> {Designation}
> {Company Name}

### Template Summary

| # | Template | Subject Line | Key Placeholders |
|---|----------|-------------|-----------------|
| 1 | Application Received | Application Received — {Job Title} at {Company Name} | Candidate Name, Job Title, Company Name, Timeline, HR Email |
| 2 | Shortlisting | You've Been Shortlisted — {Job Title} at {Company Name} | Candidate Name, Job Title, Company Name |
| 3 | Interview Invite | Interview Invitation — {Job Title} at {Company Name} | Candidate Name, Job Title, Date, Time, Mode, Location/Link, Round, Panel |
| 4 | Selection/Offer | Congratulations! Job Offer — {Job Title} at {Company Name} | Candidate Name, Job Title, CTC, Joining Date, Reporting To, Department |
| 5 | Rejection | Update on Your Application — {Job Title} at {Company Name} | Candidate Name, Job Title, Company Name |
| 6 | On Hold | Application Status Update — {Job Title} at {Company Name} | Candidate Name, Job Title, Expected Timeline, HR Email |

---

## 5. Folder Structure

```
Job-Portal-Opening/
|
|-- 01-JDs-Raw/                          # Raw JD files from HR
|   |-- Word/                            # .docx files
|   |-- PDF/                             # .pdf files
|
|-- 02-Master-Data/
|   |-- job-master-sheet.xlsx            # Master Excel with all jobs + screening questions
|   |-- job-to-portal-mapping.xlsx       # Mapping matrix (level x category -> portals)
|
|-- 03-Portal-Formats/
|   |-- format-linkedin.md
|   |-- format-naukri.md
|   |-- format-iimjobs.md
|   |-- format-indeed.md
|   |-- format-internshala.md
|
|-- 04-Screening-Questions/
|   |-- (per-job files, named by Job ID)
|       |-- OG-2026-001-questions.md
|       |-- OG-2026-002-questions.md
|       |-- ...
|
|-- 05-Message-Templates/
|   |-- application-received.md
|   |-- shortlisting-notification.md
|   |-- interview-invite.md
|   |-- selection-offer.md
|   |-- rejection.md
|   |-- on-hold-waitlisted.md
|
|-- 06-Context/
    |-- job-portal-opening-context.md    # Full context file (decisions, specs, HR handoff guide)
```

**Naming conventions:**
- Folders numbered for process order (01 -> 06)
- Job-specific files use Job ID prefix (e.g., OG-2026-001)
- Portal format files use format-{portal-name}.md
- All lowercase with hyphens, no spaces

---

## 6. Context File (06-Context/job-portal-opening-context.md)

The context file serves three purposes:

### A. Internal Reference
- All decisions made during this design phase
- Mapping logic rationale (platform trends-based)
- Field definitions and their sources
- Folder structure and naming conventions

### B. HR Handoff Guide
- What HR needs to provide:
  - Raw JD documents (Word/PDF) for each open position
  - Screening questions per job opening (unique per role)
  - Review and approve message templates
  - Confirm job levels and categories for portal mapping
- Format expectations for each deliverable
- Timeline and process for submitting materials

### C. Detailed Spec
- Exact column names and data types for the Excel sheet
- Portal field requirements with character limits
- Template placeholder definitions
- Best practices per portal (researched and verified)

---

## Data Source

- **JDs:** HR provides raw Word/PDF documents
- **Screening Questions:** HR provides unique questions per job opening
- **Message Templates:** Drafted in this spec, HR reviews and customizes
- **Portal Mapping:** Based on platform trend research
- **Portal Formats:** Researched from official portal documentation

## Platforms

1. LinkedIn
2. Naukri.com
3. IIM Jobs
4. Indeed
5. Internshala
