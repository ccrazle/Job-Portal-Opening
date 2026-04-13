# Job Portal — Phase 1 Refinements Design Spec

**Date:** 2026-04-11
**Status:** Draft — awaiting user review
**Scope:** [frontend/index.html](../../../frontend/index.html) only
**Target:** Internal department deployment + feedback gathering

---

## Goal

Collapse the 5-step job opening wizard into a two-page flow, fix broken status/delete actions, add a two-layer outreach navigation, unify the screening table, and fix select-dropdown zoom behavior — all without breaking existing data flows or draft loading.

---

## 1. Creation Flow — 5 Steps → 2 Pages

### Page 1 — Select
Department + Job Title dropdowns only (current `card1` top section). On Job Title change, load the backend `JOB_DATABASE` record into `formData` (existing `onJobTitleChange()` logic reused). "Continue" button jumps straight to Page 2.

### Page 2 — Review & Approve
Single scrollable page with four sections, all pre-filled and editable inline:

1. **Details** — location, empType, level, experience, salary, openings, reportingTo, reqSkills, prefSkills. Rule: fields without backend data stay empty; do not fabricate defaults.
2. **JD** — textarea pre-filled from `job.jd`. Below: `.docx` upload slot that parses and appends extracted text under a `--- Additional Requirements ---` divider. Uses [mammoth.js](https://cdn.jsdelivr.net/npm/mammoth) via CDN (same pattern as existing xlsx lib).
3. **Platforms** — existing tile grid reused verbatim with AI recommendation badges. Below the grid, a new **"Portal-Ready Format"** panel that shows one accordion per currently-selected platform. Each accordion renders the platform's field layout (sourced from [01_Context/03-Portal-Formats/](../../../01_Context/03-Portal-Formats/)) with values pre-filled from `formData` and a **Copy** button next to each field. No file download.
4. **Screening Questions** — existing question builder reused, pre-filled from `job.questions`.

**Bottom action bar:** `Save Draft` | `Approve & Post` — same handlers as current `saveDraft()` / `approve()`.

### Code changes
- Remove the 5-step state machine: `currentStep`, `goToStep()`, step-circle progress bar markup (`step1`…`step5`), `card2`…`card5` wrappers.
- Keep `formData` shape unchanged so existing saved drafts continue to load.
- `renderStep()` replaced by `renderSelectPage()` + `renderReviewPage()`.
- Wizard validation (`validateStep()`) collapses to a single `validateReview()` run before `approve()`.

---

## 2. Landing Page — Fix Status + Delete

**Current bug:** The edit sheet for a Posted opening has a status dropdown that visually changes but does not persist — `draftsList[idx].status` is never written.

### Fix
- Wire the status select's `onchange` to update `formData.status` and the underlying `draftsList[idx].status`, then re-render both `draftsList` and `postedList`.
- Posted→Draft flips the status flag only. Does not re-open the creation flow.

### New: Delete button
- Red destructive button on the edit sheet, visible only when `opening.status === 'posted'`.
- Click → `confirm()` dialog → `draftsList.splice(idx, 1)` → re-render.
- Hard delete, no undo, no soft-delete bucket.

---

## 3. Outreach — Two-Layer Navigation

**Current:** `openOutreachPage()` dumps the user directly into a flat candidate list.

### New Layer 1 — Openings
Grid of cards listing openings where `status === 'posted'` AND at least one screened candidate has `status === 'confirmed'`. Each card:
- Title, location, confirmed count, "View Candidates" button.

Openings with no confirmed candidates are hidden (not greyed out).

### New Layer 2 — Candidates
Click a card → existing outreach candidate table, filtered to that opening's confirmed candidates only. Top of page shows a `← Back to Openings` breadcrumb.

### Column change
Add **Applied Role** column immediately before **Best Fit** in the candidate table. Value = `opening.jobTitle` (identical for all rows inside one opening, because Layer 2 is always scoped to a single opening).

---

## 4. Screening Page — Unified Table

**Current:** `rerenderResults()` groups candidates by `bestFitRole` and renders one accordion per role.

### Fix
- Render a single table for the opening. Heading = opening title.
- Remove the `Object.entries(groups).map(...)` block in [frontend/index.html:1546](../../../frontend/index.html#L1546).
- Columns (in order): `# | Candidate | Exp | Education | Current Role | Applied Role | Best Fit | Score | Remarks | Tier | Action | Status`
- `Applied Role` = `window._currentScreeningJob.job.jobTitle` (constant per view).
- `Best Fit` = existing `c.bestFitRole` rendered as a text cell.
- Role filter dropdown (`filterRole`) is repurposed to filter by Best Fit — rename label to "Filter by Best Fit".

---

## 5. Select Dropdown Zoom Fix

**Symptom:** On the screening page, browser zoom does not scale the `<select>` text.

**Root cause:** Many selects use `text-xs` or inline `text-[10px]`. Native Windows `<select>` popups use OS font metrics below a threshold, and very small font sizes round down to a fixed pixel size that ignores page zoom.

### Fix
- Minimum font-size for selects inside `#screeningView`: `14px` (`text-sm`).
- Add targeted CSS rule:
  ```css
  #screeningView select,
  #outreachView select {
    font-size: max(14px, 0.875rem);
    line-height: 1.4;
  }
  ```
- Apply the same rule to `#outreachView` since the outreach table inherits similar markup.

---

## Out of Scope (Phase 2+)

- Interview & Test view changes
- Real backend persistence (drafts remain in-memory/localStorage as today)
- Multi-user draft sync
- Server-side .docx parsing
- Audit log for deletions

---

## Data Model — No Schema Changes

`formData` shape is preserved. The only implicit addition is that `formData.status` must be *actually read* on the landing list render (it is stored today but not always honored on edit-sheet toggle).

---

## Testing Plan

Manual smoke test after implementation:

1. **Create flow:** Select Department → Job Title → lands on review page → all fields pre-filled → Save Draft → appears in drafts list.
2. **JD merge:** Upload a sample `.docx` → extracted text appended below divider → editable.
3. **Platform copy:** Select LinkedIn → expand Portal-Ready Format → copy Title → paste → value matches.
4. **Status flip:** Post an opening → edit → change to Draft → reopen edit → status is still Draft.
5. **Delete:** Edit a posted opening → Delete → confirm → opening gone from list.
6. **Outreach layers:** Click Outreach → see openings layer → click one → candidates shown → breadcrumb returns to layer 1.
7. **Applied Role column:** Column visible in both outreach and screening, matches opening title.
8. **Unified screening:** No per-role accordions, one flat table.
9. **Zoom:** Ctrl+Plus three times on screening page → select text scales proportionally.
10. **Existing drafts load:** Any draft saved under old schema still opens on the new review page without error.
