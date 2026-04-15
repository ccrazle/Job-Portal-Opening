# Candidate Outreach — Phase 3 Context Document

**Created:** 2026-04-10
**Purpose:** Backend design for the candidate outreach and confirmation process after screening.

---

## Overview

After resume screening produces a list of selected candidates (exported as Excel from the screening page), HR proceeds to the outreach phase. This phase handles:

1. Importing the selected candidates Excel into a dedicated "Outreach" page
2. Displaying all candidate data with an editable status column
3. HR manually reaches out to candidates based on their tier (WhatsApp, calls, etc.)
4. HR updates the status on the portal as responses come in
5. Exporting the confirmed candidates as a new Excel file
6. Proceeding to the Interview & Test phase (separate page)

**The portal does NOT automate outreach.** HR handles all communication manually. The portal is a tracking dashboard.

---

## Flow

```
Screening page → Export selected candidates (.xlsx)
    │
    v
Outreach page → Import that Excel file
    │
    v
Portal displays all candidates with parameters + Status column
    │
    v
HR reaches out manually based on tier:
    ├── Tier 1 (Top 20%):  WhatsApp message + Automated call
    ├── Tier 2 (Top 60%):  WhatsApp message only
    └── Referral:          WhatsApp message + Automated call + Human call
    │
    v
HR updates status per candidate on the portal:
    Pending → On Hold → Confirmed / Not Interested
    │
    v
Export confirmed candidates (.xlsx)
    │
    v
Proceed to Interview & Test page (separate phase)
```

---

## Excel Import Format

The imported Excel file is the same file exported from the screening page's "Export Confirmed" or "Export All" button. Expected columns:

| # | Column | Description |
|---|--------|-------------|
| 1 | Candidate Name | Full name |
| 2 | Best Fit Position | The role they were screened for |
| 3 | Experience (Yrs) | Years of experience |
| 4 | Education | Highest qualification |
| 5 | Current Role | Their current job/position |
| 6 | Score (/100) | Score from Resume Scorer |
| 7 | Tier | Tier 1 (Top 20%) / Tier 2 (Top 60%) / Referral / Tier 3 |

---

## Status Lifecycle

```
Pending ──► On Hold ──► Confirmed
                   └──► Not Interested
```

| Status | Meaning |
|--------|---------|
| **Pending** | Outreach not yet done. HR has not contacted this candidate yet. |
| **On Hold** | Outreach sent (WhatsApp/call/email done). Waiting for candidate's reply. |
| **Confirmed** | Candidate responded with interest. Proceeds to Interview & Test. |
| **Not Interested** | Candidate declined the opportunity. |

Status is updated **manually by HR** on the portal.

---

## Outreach Rules by Tier

These are instructions for HR — the portal displays the tier so HR knows what to do:

| Tier | Contact Method (HR does manually) |
|------|----------------------------------|
| Tier 1 (Top 20%) | WhatsApp message + Automated/manual call |
| Tier 2 (Top 60%) | WhatsApp message only |
| Referral | WhatsApp message + Automated call + Human call |
| Tier 3 | No outreach (should not appear in selected candidates) |

If contact info is missing (e.g., no phone number), HR uses whatever contact source is available from the candidate's resume (email, LinkedIn, etc.).

---

## Page Features

| Feature | Detail |
|---------|--------|
| **Import Excel** | Upload .xlsx file of selected candidates. Parsed and displayed as a table. |
| **Display** | Full table with all 7 imported columns + Status column added by the portal. |
| **Status Update** | Dropdown per candidate: Pending / On Hold / Confirmed / Not Interested. Updated by HR manually. |
| **Persist** | Status changes saved in localStorage. Reloading the page retains all data. |
| **Export Confirmed** | Button to export only candidates with "Confirmed" status as .xlsx file. Includes all 7 columns + Status. |
| **Proceed** | "Proceed to Interview & Test" button — navigates to the Interview & Test page (separate phase, placeholder for now). |
| **Stats** | Summary bar showing: Total candidates, Pending count, On Hold count, Confirmed count, Not Interested count. |

---

## Data Storage

| Data | Location |
|------|----------|
| Context document | `03_Reaching/candidate-outreach-context.md` (this file) |
| Imported candidate data | localStorage (browser) |
| Exported confirmed list | Downloaded as `.xlsx` by HR |
