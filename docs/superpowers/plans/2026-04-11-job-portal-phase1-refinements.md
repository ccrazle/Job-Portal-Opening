# Job Portal Phase 1 Refinements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the 5-step wizard to 2 pages, fix broken edit/delete/status actions, add two-layer outreach navigation, unify the screening table, and fix select zoom — without breaking existing drafts or data flow.

**Architecture:** All changes are confined to [frontend/index.html](../../../frontend/index.html). The 2000-line single-file app uses Tailwind via CDN, a global `formData` object, and `localStorage`-backed `drafts`/`posted` arrays. Strategy: keep the existing `card1`…`card5` DOM and their per-card `render*` functions (`renderPlatforms`, `renderQuestions`, `renderReview`) intact so their logic continues to work; modify only the *wizard shell* (`renderStep`, `goToStep`, `nextStep`, `validateStep`) to show **two** visual steps — Step 0 = `card1` (Select+Details), Step 1 = `card2`+`card3`+`card4`+`card5` stacked and all visible at once. This minimizes blast radius.

**Tech Stack:** HTML, Tailwind CDN, vanilla JS, mammoth.js (new — for .docx parsing), SheetJS/xlsx (existing), localStorage.

**Testing approach:** This is a single static HTML file with no test runner. Each task ends with a **manual smoke test in the browser** — specific click steps and expected outcomes. Commit after each task passes its smoke test.

---

## File Structure

Only one file is touched:

- **Modify:** [frontend/index.html](../../../frontend/index.html)
  - Head: add mammoth.js CDN + zoom-fix CSS rule
  - State + wizard shell (lines ~505-820): collapse step labels, progress bar, `renderStep`, `validateStep`, `nextStep`, `goToStep`
  - `renderReview` (lines ~929-981): remove `goToStep(n)` Edit buttons (no-op since all sections are now visible inline)
  - `card2` markup (JD card): add "Upload Requirements (.docx)" block + `handleReqDocxUpload` function
  - `renderPlatforms` / after platform tiles: add Portal-Ready Format panel + copy handlers + per-platform template table
  - `editPosted` flow: add status toggle persistence + Delete button wiring
  - `openOutreachPage` / `renderOutreachPage`: add Layer 1 openings list before candidate table
  - Outreach candidate table: add Applied Role column
  - `rerenderResults` (screening, lines ~1519-1580): replace per-role accordions with one unified table, add Applied Role + Best Fit columns
  - Near `formData.status` writes: make sure status changes from the landing edit sheet round-trip into `posted[]` and `localStorage`

No new files. No backend changes. Draft schema (`formData`) is preserved — only additive fields.

---

## Task 1: Add mammoth.js + global CSS fixes

**Files:**
- Modify: [frontend/index.html](../../../frontend/index.html) — `<head>` block (around line 7-44)

- [ ] **Step 1: Add mammoth.js CDN**

In the `<head>` section after the existing xlsx script tag (around line 7), add:

```html
<script src="https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js"></script>
```

- [ ] **Step 2: Add select-zoom fix + focus CSS**

At the bottom of the existing `<style>` block (around line 108, just before `</style>`), append:

```css
    /* Select dropdown zoom fix — native <select> popups ignore page zoom
       below ~14px on Windows, so floor the font-size at 14px in data-heavy views. */
    #screeningView select,
    #outreachView select {
      font-size: max(14px, 0.875rem);
      line-height: 1.4;
    }
    #screeningView select option,
    #outreachView select option {
      font-size: 14px;
    }
```

- [ ] **Step 3: Smoke test**

Open `frontend/index.html` in a browser. In DevTools console type:

```js
typeof mammoth
```

Expected: `"object"` (not `"undefined"`).

Zoom browser to 150% and open the Outreach page — the status dropdown text should scale.

- [ ] **Step 4: Commit**

```bash
git add frontend/index.html
git commit -m "feat(portal): add mammoth.js CDN and select zoom fix"
```

---

## Task 2: Collapse 5-step wizard to 2 steps (Select + Review-All)

**Files:**
- Modify: [frontend/index.html](../../../frontend/index.html)
  - Progress bar markup (~lines 107-135 inside `#wizardView`)
  - `renderStep()` function (~line 753)
  - `validateStep()` function (~line 820)
  - `nextStep()` / `goToStep()` (~lines 798-816)

**Goal:** Step 0 shows only `card1`. Step 1 shows `card2` + `card3` + `card4` + `card5` **stacked and simultaneously visible**. The five-circle progress bar becomes a two-circle bar: "Select" and "Review & Approve".

- [ ] **Step 1: Replace the 5-step progress bar markup**

Find the progress bar block inside `#wizardView` (starts with `<!-- Progress Bar -->` around line 107). Replace the **entire** `<div class="mb-8">…</div>` progress bar with:

```html
      <!-- Progress Bar (2 steps) -->
      <div class="mb-8">
        <div class="flex items-center justify-between relative max-w-md mx-auto">
          <div id="step1" class="step-item flex flex-col items-center z-10 cursor-pointer" onclick="goToStep(0)">
            <div class="step-circle w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all bg-brand-600 text-white border-brand-600">1</div>
            <span class="text-xs font-medium mt-1.5 text-brand-600">Select</span>
          </div>
          <div class="step-connector flex-1 bg-gray-200 mx-2"></div>
          <div id="step2" class="step-item flex flex-col items-center z-10 cursor-pointer" onclick="goToStep(1)">
            <div class="step-circle w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all bg-white text-gray-400 border-gray-300">2</div>
            <span class="text-xs font-medium mt-1.5 text-gray-400">Review &amp; Approve</span>
          </div>
        </div>
      </div>
```

- [ ] **Step 2: Rewrite `renderStep()` to show card1 or stacked card2-5**

Replace the entire `renderStep()` function (from `function renderStep() {` through the matching `}` — roughly lines 753-796) with:

```javascript
function renderStep() {
  // Hide all cards first
  for (let i = 1; i <= 5; i++) document.getElementById(`card${i}`).classList.add('hidden');

  if (currentStep === 0) {
    // Step 1: Select + Details
    const c1 = document.getElementById('card1');
    c1.classList.remove('hidden');
    c1.classList.remove('card-enter'); void c1.offsetWidth; c1.classList.add('card-enter');
  } else {
    // Step 2: Everything else stacked (JD + Platforms + Screening + Review)
    ['card2','card3','card4','card5'].forEach(id => {
      const c = document.getElementById(id);
      c.classList.remove('hidden');
    });
    const c2 = document.getElementById('card2');
    c2.classList.remove('card-enter'); void c2.offsetWidth; c2.classList.add('card-enter');
    // Render dynamic content for stacked sections
    renderPlatforms();
    renderQuestions();
    renderReview();
  }

  // Update 2-circle progress bar
  const labels = ['Select', 'Review & Approve'];
  for (let i = 0; i < 2; i++) {
    const el = document.getElementById(`step${i + 1}`);
    const circle = el.querySelector('.step-circle');
    const label = el.querySelector('span');
    if (i <= currentStep) {
      circle.className = 'step-circle w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all bg-brand-600 text-white border-brand-600';
      label.className = 'text-xs font-medium mt-1.5 text-brand-600';
    } else {
      circle.className = 'step-circle w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all bg-white text-gray-400 border-gray-300';
      label.className = 'text-xs font-medium mt-1.5 text-gray-400';
    }
    circle.textContent = i + 1;
    label.textContent = labels[i];
  }
  document.querySelectorAll('.step-connector').forEach((c, i) => {
    c.style.backgroundColor = i < currentStep ? '#762224' : '#e8e6dc';
  });

  // Back/Next button labels
  document.getElementById('btnBack').classList.toggle('hidden', currentStep === 0);
  const btnNext = document.getElementById('btnNext');
  if (currentStep === 1) {
    btnNext.textContent = editingId?.type === 'posted' ? 'Save Changes' : 'Approve & Post';
    btnNext.className = 'bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition shadow-sm';
  } else {
    btnNext.textContent = 'Continue to Review';
    btnNext.className = 'bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition shadow-sm';
  }
}
```

- [ ] **Step 3: Update `nextStep()` and `goToStep()` for 2-step range**

Replace `nextStep()` (~line 805) with:

```javascript
function nextStep() {
  collectFormData();
  if (!validateStep()) return;
  if (currentStep === 1) { approve(); return; }
  currentStep = 1;
  maxReachedStep = 1;
  renderStep();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

Replace `goToStep()` (~line 798) with:

```javascript
function goToStep(step) {
  if (step < 0 || step > 1) return;
  if (step > maxReachedStep) return;
  collectFormData();
  currentStep = step;
  renderStep();
}
```

- [ ] **Step 4: Collapse `validateStep()` to 2 steps**

Replace `validateStep()` (~line 820) with:

```javascript
function validateStep() {
  if (currentStep === 0) {
    if (!formData.department || formData.dbIndex < 0) {
      showToast('Please select a Department and Job Title', 'error');
      return false;
    }
    const req = ['location','empType','jobLevel','experience','openings','reportingTo'];
    for (const f of req) {
      const el = document.getElementById(f);
      if (!el.value.toString().trim()) {
        el.focus();
        el.classList.add('border-red-400');
        setTimeout(() => el.classList.remove('border-red-400'), 2000);
        showToast('Please fill all required fields', 'error');
        return false;
      }
    }
    return true;
  }
  // Step 1 (Review): validate every field across cards 2-4
  if (!formData.jdText && !formData.jdFile) { showToast('Please provide a job description', 'error'); return false; }
  if (!formData.reqSkills) { document.getElementById('reqSkills').focus(); showToast('Required skills is mandatory', 'error'); return false; }
  if (formData.platforms.length === 0) { showToast('Select at least one platform', 'error'); return false; }
  return true;
}
```

- [ ] **Step 5: Remove `goToStep(n)` Edit buttons in `renderReview()`**

In `renderReview()` (~line 929), the innerHTML template has four `<button onclick="goToStep(…)">Edit</button>` elements referencing steps 0, 1, 2, 3. Since all cards are now visible simultaneously on step 1, these are redundant. Replace each of the four `<button…>Edit</button>` elements with empty string `''`. The section headers should still show the section name but drop the Edit button.

Specifically, in the template literal for `reviewContent.innerHTML`, find each occurrence of this pattern:
```html
<button onclick="goToStep(0)" class="text-xs text-brand-600 hover:text-brand-700 font-medium">Edit</button>
```
(and the analogous ones for `goToStep(1)`, `goToStep(2)`, `goToStep(3)`) — delete the `<button>…</button>` tags only. Keep the surrounding header div intact.

- [ ] **Step 6: Handle legacy `_lastStep` when resuming drafts**

In `resumeDraft()` (~line 660), the line `currentStep = formData._lastStep || 0;` can now set currentStep to values ≥ 2. Clamp it. Replace that line with:

```javascript
  currentStep = Math.min(formData._lastStep || 0, 1);
```

In `editPosted()` (~line 670), replace `maxReachedStep = 4;` with `maxReachedStep = 1;`.

- [ ] **Step 7: Smoke test**

1. Load the page. Click **+ New Opening**.
2. On step 1, select Department = "Construction", Job Title = "Project Manager". Confirm auto-fill still populates the details grid.
3. Click **Continue to Review**. Expect to see cards 2, 3, 4, 5 all visible simultaneously on one scrollable page. Expect the progress bar to show 2 circles with circle 2 highlighted.
4. Scroll through: confirm JD text is pre-filled, platforms have AI picks, questions are pre-loaded, review section renders.
5. Click **Back**. Expect to return to step 0 with all selected values retained.
6. Reload the page. Re-open any previously-saved draft via Resume. Confirm it opens without error (currentStep clamped).

- [ ] **Step 8: Commit**

```bash
git add frontend/index.html
git commit -m "feat(portal): collapse 5-step wizard into 2-page flow"
```

---

## Task 3: JD section — add Requirements .docx upload that parses and merges

**Files:**
- Modify: [frontend/index.html](../../../frontend/index.html)
  - `card2` markup (the JD card — search for `id="card2"`)
  - Add `handleReqDocxUpload()` function near `handleFileUpload()` (~line 1046)

- [ ] **Step 1: Add the upload slot markup to card2**

Inside `card2`, after the existing JD textarea but before the Required Skills / Preferred Skills block, add a new upload zone. Locate the textarea element with `id="jdText"` in the card2 markup. Immediately after its closing tag (and after any existing source badge div), insert:

```html
          <!-- Requirements .docx upload -->
          <div class="mt-4 border border-dashed border-gray-300 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <div>
                <p class="text-sm font-semibold text-gray-700">Additional Requirements (.docx)</p>
                <p class="text-xs text-gray-500">Upload a Word document — the text will be parsed and appended to the JD above.</p>
              </div>
              <label class="cursor-pointer text-xs bg-brand-50 text-brand-700 hover:bg-brand-100 px-3 py-1.5 rounded-md font-medium transition border border-brand-200">
                Choose .docx
                <input id="reqDocxFile" type="file" accept=".docx" class="hidden" onchange="handleReqDocxUpload(this)">
              </label>
            </div>
            <p id="reqDocxStatus" class="text-xs text-gray-400 mt-1">No file uploaded</p>
          </div>
```

- [ ] **Step 2: Add the parse-and-merge handler**

Add this function near `handleFileUpload()` (~line 1046):

```javascript
function handleReqDocxUpload(input) {
  if (!input.files.length) return;
  const file = input.files[0];
  const statusEl = document.getElementById('reqDocxStatus');
  statusEl.textContent = `Parsing ${file.name}…`;
  statusEl.className = 'text-xs text-amber-600 mt-1';

  const reader = new FileReader();
  reader.onload = function(e) {
    mammoth.extractRawText({ arrayBuffer: e.target.result })
      .then(result => {
        const extracted = (result.value || '').trim();
        if (!extracted) {
          statusEl.textContent = 'No text found in file';
          statusEl.className = 'text-xs text-red-500 mt-1';
          return;
        }
        const jdEl = document.getElementById('jdText');
        const divider = '\n\n--- Additional Requirements ---\n\n';
        const existing = jdEl.value.trim();
        jdEl.value = existing ? `${existing}${divider}${extracted}` : extracted;
        formData.jdText = jdEl.value;
        statusEl.textContent = `Appended ${extracted.length} characters from ${file.name}`;
        statusEl.className = 'text-xs text-green-600 mt-1';
        showToast('Requirements merged into JD', 'success');
      })
      .catch(err => {
        console.error(err);
        statusEl.textContent = 'Failed to parse .docx';
        statusEl.className = 'text-xs text-red-500 mt-1';
        showToast('Could not parse the .docx file', 'error');
      });
  };
  reader.readAsArrayBuffer(file);
}
```

- [ ] **Step 3: Smoke test**

1. New opening → select Construction / Project Manager → Continue to Review.
2. Scroll to the JD section. Confirm the "Additional Requirements (.docx)" upload zone is visible.
3. Create a small test.docx in Word with any text (or use any existing .docx from `01_Context/01-JDs-Raw/Word/`).
4. Upload it. Expect the textarea to now contain the original JD + the `--- Additional Requirements ---` divider + the parsed text. Status text shows "Appended N characters".
5. Upload a second .docx. Expect the new content to be appended under another divider.
6. Edit the merged textarea manually — confirm it's still editable.

- [ ] **Step 4: Commit**

```bash
git add frontend/index.html
git commit -m "feat(portal): upload and merge .docx requirements into JD"
```

---

## Task 4: Platforms — add Portal-Ready Format panel with copy-to-clipboard

**Files:**
- Modify: [frontend/index.html](../../../frontend/index.html)
  - `card3` markup (search for `id="card3"`)
  - Add `PORTAL_FORMATS` constant, `renderPortalFormats()`, `copyField()`, and hook into `renderPlatforms()`

- [ ] **Step 1: Add the panel container to card3**

In the `card3` markup, after the platform grid (`<div id="platformGrid">`) and its closing tag, add a new container:

```html
        <!-- Portal-Ready Format panel -->
        <div id="portalFormatsPanel" class="mt-6"></div>
```

- [ ] **Step 2: Add the PORTAL_FORMATS template constant**

Near the top of the `<script>` section (after `const PLATFORMS = …`, which is around line 350-400), add:

```javascript
// Per-platform field layout for the Portal-Ready Format panel.
// Each field is rendered with a Copy button in the review step.
const PORTAL_FORMATS = {
  linkedin: [
    { label: 'Job Title',       get: f => f.jobTitle },
    { label: 'Company',         get: _ => 'One Group' },
    { label: 'Location',        get: f => f.location },
    { label: 'Workplace Type',  get: _ => 'On-site' },
    { label: 'Employment Type', get: f => f.empType },
    { label: 'Seniority Level', get: f => f.jobLevel },
    { label: 'Description',     get: f => f.jdText, long: true },
    { label: 'Skills',          get: f => f.reqSkills }
  ],
  naukri: [
    { label: 'Job Title',          get: f => f.jobTitle },
    { label: 'Location',           get: f => f.location },
    { label: 'Experience',         get: f => f.experience },
    { label: 'Salary',             get: f => f.salary },
    { label: 'Employment Type',    get: f => f.empType },
    { label: 'Key Skills',         get: f => f.reqSkills },
    { label: 'Role Description',   get: f => f.jdText, long: true }
  ],
  iimjobs: [
    { label: 'Job Title',         get: f => f.jobTitle },
    { label: 'Function',          get: f => f.department },
    { label: 'Location',          get: f => f.location },
    { label: 'Experience Range',  get: f => f.experience },
    { label: 'Compensation',      get: f => f.salary },
    { label: 'Reporting To',      get: f => f.reportingTo },
    { label: 'Job Description',   get: f => f.jdText, long: true }
  ],
  indeed: [
    { label: 'Job Title',       get: f => f.jobTitle },
    { label: 'Location',        get: f => f.location },
    { label: 'Job Type',        get: f => f.empType },
    { label: 'Salary',          get: f => f.salary },
    { label: 'Description',     get: f => f.jdText, long: true },
    { label: 'Qualifications',  get: f => f.reqSkills }
  ],
  internshala: [
    { label: 'Internship Title', get: f => f.jobTitle },
    { label: 'Location',         get: f => f.location },
    { label: 'Stipend',          get: f => f.salary },
    { label: 'Skills Required',  get: f => f.reqSkills },
    { label: 'About Internship', get: f => f.jdText, long: true }
  ],
  apna: [
    { label: 'Job Title',     get: f => f.jobTitle },
    { label: 'Location',      get: f => f.location },
    { label: 'Salary',        get: f => f.salary },
    { label: 'Experience',    get: f => f.experience },
    { label: 'Key Skills',    get: f => f.reqSkills },
    { label: 'Description',   get: f => f.jdText, long: true }
  ],
  classifieds: [
    { label: 'Title',         get: f => f.jobTitle },
    { label: 'Location',      get: f => f.location },
    { label: 'Contact',       get: _ => 'hr@onegroup.example' },
    { label: 'Description',   get: f => f.jdText, long: true }
  ]
};
```

- [ ] **Step 3: Add the renderer and copy handler**

Add these functions just below `togglePlatform()` (~line 876):

```javascript
function renderPortalFormats() {
  const panel = document.getElementById('portalFormatsPanel');
  if (!panel) return;
  collectFormData();

  if (!formData.platforms.length) {
    panel.innerHTML = '';
    return;
  }

  panel.innerHTML = `
    <div class="border-t border-gray-200 pt-5">
      <h3 class="text-sm font-semibold text-gray-800 mb-1">Portal-Ready Format</h3>
      <p class="text-xs text-gray-500 mb-4">Copy each field into the platform's posting form. Values are pulled from the fields above.</p>
      <div class="space-y-3">
        ${formData.platforms.map(pid => {
          const plat = PLATFORMS.find(p => p.id === pid);
          const fields = PORTAL_FORMATS[pid] || [];
          if (!plat || !fields.length) return '';
          return `
            <details class="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <summary class="px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-gray-50 select-none">
                <span class="text-sm font-medium text-gray-800">${plat.name}</span>
                <span class="text-xs text-gray-400">${fields.length} fields</span>
              </summary>
              <div class="px-4 py-3 space-y-2 border-t border-gray-100">
                ${fields.map((f, i) => {
                  const val = (f.get(formData) || '').toString();
                  const id = `pf-${pid}-${i}`;
                  return `
                    <div class="flex items-start gap-3">
                      <div class="flex-1 min-w-0">
                        <p class="text-[11px] uppercase tracking-wide text-gray-400 font-medium">${f.label}</p>
                        <p id="${id}" class="text-sm text-gray-800 ${f.long ? 'whitespace-pre-wrap' : ''} break-words">${val || '<span class="text-gray-400">—</span>'}</p>
                      </div>
                      <button type="button" onclick="copyField('${id}', this)" class="shrink-0 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 px-2.5 py-1 rounded-md transition">Copy</button>
                    </div>
                  `;
                }).join('')}
              </div>
            </details>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function copyField(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = el.innerText.trim();
  if (!text || text === '—') { showToast('Field is empty', 'error'); return; }
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Copied';
    btn.classList.add('bg-green-50', 'text-green-700', 'border-green-300');
    setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove('bg-green-50', 'text-green-700', 'border-green-300');
    }, 1200);
  }).catch(() => showToast('Copy failed', 'error'));
}
```

- [ ] **Step 4: Hook into `renderPlatforms()` and `togglePlatform()`**

At the end of `renderPlatforms()` (after `grid.innerHTML = …` and its close, ~line 869), add:

```javascript
  renderPortalFormats();
```

In `togglePlatform()` (~line 872), after the `renderPlatforms()` call, leave as-is — the above hook will cascade through automatically.

Also ensure that when the JD text / other fields change on the review page, the panel stays in sync. Add a fresh call to `renderPortalFormats()` inside `renderReview()` at the very end, before its closing `}`:

```javascript
  renderPortalFormats();
```

- [ ] **Step 5: Smoke test**

1. New opening → Construction / Project Manager → Continue to Review.
2. Scroll to Platforms section. Confirm AI-picked tiles (LinkedIn, IIM Jobs, etc.) are selected.
3. Below the tiles, confirm the "Portal-Ready Format" section appears with one accordion per selected platform.
4. Expand LinkedIn. Confirm Job Title = "Project Manager", Location = "Mumbai, Maharashtra", Description = the full JD.
5. Click **Copy** next to Job Title. Expect the button to flash green and say "Copied". Paste elsewhere — confirm "Project Manager".
6. Toggle a platform off — its accordion should disappear. Toggle on a new one — it should appear.
7. Edit the JD textarea and add "TEST EDIT". Scroll back down to Portal-Ready Format → LinkedIn → Description. **Expected:** Description reflects the edit (note: this updates on re-render; if stale, scroll up and down or click another platform tile to force `renderPortalFormats()`).

- [ ] **Step 6: Commit**

```bash
git add frontend/index.html
git commit -m "feat(portal): add portal-ready format panel with per-field copy"
```

---

## Task 5: Fix Posted→Draft status toggle + add Delete on edit-posted

**Files:**
- Modify: [frontend/index.html](../../../frontend/index.html)
  - `editPosted()` function (~line 670)
  - The "Wizard footer" action buttons area (search for `btnBack` / `btnNext`)
  - `confirmDelete()` (~line 1036)

**Goal:** When editing a Posted opening, add (a) a "Move to Drafts" button that flips status and moves the opening into the drafts array, and (b) a "Delete Posted" button that permanently removes it.

- [ ] **Step 1: Add action buttons into the wizard footer**

Find the wizard footer that contains `btnBack` / `btnNext` / `Save as Draft` buttons (search for `id="btnBack"`). Inside that footer div, after the existing Save-as-Draft button but before the btnNext div — or wherever makes sense in the flex row — add two buttons that only show when editing a posted opening:

```html
        <button id="btnMoveToDraft" onclick="moveToDraft()" class="hidden bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 px-4 py-2 rounded-lg text-sm font-medium transition">Move to Drafts</button>
        <button id="btnDeletePosted" onclick="deletePostedFromWizard()" class="hidden bg-red-50 border border-red-300 text-red-700 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition">Delete Posted</button>
```

- [ ] **Step 2: Show/hide these buttons based on `editingId`**

In `renderStep()`, at the very end of the function (right before the closing `}`), add:

```javascript
  const isEditingPosted = editingId?.type === 'posted';
  document.getElementById('btnMoveToDraft').classList.toggle('hidden', !isEditingPosted);
  document.getElementById('btnDeletePosted').classList.toggle('hidden', !isEditingPosted);
```

- [ ] **Step 3: Implement `moveToDraft()` and `deletePostedFromWizard()`**

Add these two functions just below `approve()` (~line 1002):

```javascript
function moveToDraft() {
  if (editingId?.type !== 'posted') return;
  collectFormData();
  const idx = editingId.index;
  const item = { ...posted[idx], ...formData, status: 'Draft' };
  posted.splice(idx, 1);
  drafts.push(item);
  localStorage.setItem('jp_drafts', JSON.stringify(drafts));
  localStorage.setItem('jp_posted', JSON.stringify(posted));
  editingId = null;
  showToast('Moved to drafts', 'success');
  renderLanding();
}

function deletePostedFromWizard() {
  if (editingId?.type !== 'posted') return;
  if (!confirm(`Permanently delete "${formData.jobTitle || 'this opening'}"? This cannot be undone.`)) return;
  posted.splice(editingId.index, 1);
  localStorage.setItem('jp_posted', JSON.stringify(posted));
  editingId = null;
  showToast('Posted opening deleted', 'success');
  renderLanding();
}
```

- [ ] **Step 4: Smoke test**

1. Create an opening and approve it so it lands in the Posted list.
2. On the landing page, click **Edit** on the posted opening. The wizard opens, the Move to Drafts and Delete Posted buttons are visible in the footer.
3. Click **Move to Drafts**. Expect the opening to disappear from Posted and appear under Drafts with a Draft badge.
4. Re-approve it → back to Posted → click Edit again → click **Delete Posted** → confirm the native dialog → expect it to disappear entirely, not reappear on reload.
5. Refresh the page. Confirm the deletion persisted (localStorage updated).
6. Create a fresh opening in Draft state → Edit → confirm Move to Drafts / Delete Posted buttons are **hidden**.

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html
git commit -m "feat(portal): add Move to Drafts and Delete actions for posted openings"
```

---

## Task 6: Outreach — add Layer 1 openings list before candidate table

**Files:**
- Modify: [frontend/index.html](../../../frontend/index.html)
  - `openOutreachPage()` (~line 1725)
  - `renderOutreachPage()` (~line 1734)
  - Candidate data model: add `openingJobId` to outreach candidates
  - `handleOutreachImport` / `processOutreachImport` (~line 1864)

**Goal:** Clicking "Outreach" in the nav lands on a grid of posted openings (that have at least one confirmed screening candidate). Clicking an opening drills into its candidate table.

- [ ] **Step 1: Add state for the current outreach view**

At the top of the outreach section (near `let outreachData =`), add:

```javascript
let currentOutreachOpening = null; // jobId of the opening being viewed, or null for Layer 1
```

- [ ] **Step 2: Rewrite `openOutreachPage()`**

Replace `openOutreachPage()` with:

```javascript
function openOutreachPage() {
  hideAllViews();
  document.getElementById('outreachView').classList.remove('hidden');
  const c = document.getElementById('mainContainer');
  c.classList.remove('max-w-3xl');
  c.classList.add('max-w-7xl');
  currentOutreachOpening = null;
  renderOutreachOpeningsList();
}
```

- [ ] **Step 3: Add `renderOutreachOpeningsList()` (Layer 1)**

Add a new function next to `renderOutreachPage`:

```javascript
function renderOutreachOpeningsList() {
  const view = document.getElementById('outreachView');
  // Find posted openings that have at least one confirmed screening candidate
  const eligible = posted.filter(op => {
    const data = screeningData[op.jobId];
    if (!data || !data.candidates) return false;
    return data.candidates.some(c => c.status === 'confirmed');
  });

  view.innerHTML = `
    <div class="fade-in">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Candidate Outreach</h1>
          <p class="text-gray-500 text-sm mt-1">Pick an opening to reach out to its confirmed candidates</p>
        </div>
        <button onclick="showDrafts()" class="text-sm text-gray-500 hover:text-gray-700">&larr; Back to Openings</button>
      </div>

      ${eligible.length === 0 ? `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p class="text-gray-500 font-medium">No openings have confirmed candidates yet</p>
          <p class="text-gray-400 text-sm mt-1">Post an opening, screen resumes, and mark candidates as Confirmed to enable outreach.</p>
        </div>
      ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${eligible.map(op => {
            const confirmedCount = (screeningData[op.jobId]?.candidates || []).filter(c => c.status === 'confirmed').length;
            return `
              <div class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition cursor-pointer" onclick="openOutreachForOpening('${op.jobId}')">
                <p class="text-xs font-mono text-gray-400">${op.jobId}</p>
                <h3 class="font-semibold text-gray-900 mt-1">${op.jobTitle}</h3>
                <p class="text-sm text-gray-500 mt-0.5">${[op.department, op.location].filter(Boolean).join(' · ')}</p>
                <div class="flex items-center justify-between mt-4">
                  <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">${confirmedCount} confirmed</span>
                  <span class="text-sm text-brand-600 font-medium">View Candidates &rarr;</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

function openOutreachForOpening(jobId) {
  currentOutreachOpening = jobId;
  renderOutreachPage();
}
```

- [ ] **Step 4: Scope `renderOutreachPage()` to the selected opening**

The existing `renderOutreachPage()` renders the whole flat pool. Modify it so that when `currentOutreachOpening` is set, it:
- Shows a "← Back to Openings" breadcrumb that calls `renderOutreachOpeningsList()`
- Pulls candidates from `screeningData[currentOutreachOpening].candidates.filter(c => c.status === 'confirmed')` instead of the import pool
- Maps each screening candidate into the outreach table row model (adapting field names — screening uses `bestFitRole`, outreach template uses `bestFitPosition`)

At the top of `renderOutreachPage()`, replace the first few lines up through `const hasCandidates = …` with:

```javascript
function renderOutreachPage() {
  if (!currentOutreachOpening) { renderOutreachOpeningsList(); return; }
  const opening = posted.find(p => p.jobId === currentOutreachOpening);
  if (!opening) { renderOutreachOpeningsList(); return; }

  // Source confirmed candidates from screening data, map to outreach row shape
  const screen = screeningData[currentOutreachOpening] || { candidates: [] };
  const confirmed = screen.candidates.filter(c => c.status === 'confirmed');
  outreachData = outreachData || { candidates: [] };
  outreachData.candidates = confirmed.map(c => ({
    id: c.id || `${c.name}-${currentOutreachOpening}`,
    name: c.name,
    appliedRole: opening.jobTitle,
    bestFitPosition: c.bestFitRole || opening.jobTitle,
    exp: c.exp,
    education: c.education,
    currentRole: c.currentRole,
    score: c.score,
    tier: c.tier,
    status: c.outreachStatus || 'Pending'
  }));

  const hasCandidates = outreachData.candidates.length > 0;
```

Keep the rest of the function body as-is until you reach the header div. Replace the header section (the `<div class="flex items-center justify-between mb-6">` at the top of the innerHTML template) with:

```html
      <div class="flex items-center justify-between mb-6">
        <div>
          <button onclick="renderOutreachOpeningsList()" class="text-xs text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center gap-1">&larr; Back to Openings</button>
          <h1 class="text-2xl font-bold text-gray-900">${opening.jobTitle}</h1>
          <p class="text-gray-500 text-sm mt-1">${[opening.department, opening.location].filter(Boolean).join(' · ')} — ${outreachData.candidates.length} confirmed candidate${outreachData.candidates.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
```

Remove the existing Import Section block entirely (the `<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">` with `handleOutreachImport`) — it no longer applies since candidates come from the screening data. Leave a placeholder empty string in its place.

- [ ] **Step 5: Add the Applied Role column**

In the outreach table `<thead>` (~line 1820), add a new `<th>` between "Candidate Name" and "Best Fit Position":

```html
              <th class="px-4 py-3 text-left" style="min-width:140px">Applied Role</th>
```

In `renderOutreachTable()` (~line 1919), update the `<tr>` template so that it emits a new `<td>` between the name cell and the best-fit cell:

```html
        <td class="px-4 py-3 text-sm text-gray-700">${c.appliedRole || '—'}</td>
```

Also update the empty-state `<td colspan="9">` to `colspan="10"`.

- [ ] **Step 6: Smoke test**

1. Post an opening. Open Screen Resumes for it. (If no screening data exists, you may need to seed some via the existing demo-data path — see the screening code for how `getScreeningData` generates dummy candidates on first open.)
2. Mark at least one candidate as Confirmed.
3. Click **Outreach** in the nav. Expect Layer 1 — a card for the opening showing "1 confirmed".
4. Click the card. Expect Layer 2 — the candidate table, only showing confirmed candidates, with the Applied Role column filled with the opening's title, and Best Fit Position still showing each candidate's AI-evaluated role.
5. Click **← Back to Openings**. Expect to return to Layer 1.
6. With no confirmed candidates anywhere, click Outreach → expect the empty-state message.

- [ ] **Step 7: Commit**

```bash
git add frontend/index.html
git commit -m "feat(portal): add two-layer outreach navigation with applied role"
```

---

## Task 7: Screening page — unified table + Applied Role + Best Fit columns

**Files:**
- Modify: [frontend/index.html](../../../frontend/index.html)
  - `rerenderResults()` (~line 1519)
  - `renderCandidateRow()` (~line 1582)
  - Screening page filter dropdown label (nearby)

**Goal:** Replace the per-role accordion grouping with a single flat table whose heading is the opening's title, and add an "Applied Role" column (constant = opening title) plus a "Best Fit" column (= candidate's `bestFitRole`).

- [ ] **Step 1: Replace the body of `rerenderResults()`**

Replace the entire function with:

```javascript
function rerenderResults() {
  const jobMeta = window._currentScreeningJob.job;
  const data = getScreeningData(jobMeta.jobId);
  const bestFitFilter = document.getElementById('filterRole')?.value || 'all';
  const tierFilter = document.getElementById('filterTier')?.value || 'all';
  const statusFilter = document.getElementById('filterStatus')?.value || 'all';
  const search = (document.getElementById('searchCandidate')?.value || '').toLowerCase();

  let candidates = [...data.candidates];
  if (bestFitFilter !== 'all') candidates = candidates.filter(c => c.bestFitRole === bestFitFilter);
  if (tierFilter !== 'all') candidates = candidates.filter(c => c.tier === tierFilter);
  if (statusFilter !== 'all') candidates = candidates.filter(c => c.status === statusFilter);
  if (search) candidates = candidates.filter(c =>
    c.name.toLowerCase().includes(search) ||
    (c.bestFitRole || '').toLowerCase().includes(search)
  );

  candidates.sort((a, b) => ((b.skillScore + b.expScore) / 2) - ((a.skillScore + a.expScore) / 2));

  const container = document.getElementById('roleGroupsContainer');
  if (!candidates.length) {
    container.innerHTML = '<p class="text-sm text-gray-400 text-center py-8">No candidates match filters</p>';
    return;
  }

  const stats = {
    t1: candidates.filter(c => c.tier === 'tier1').length,
    t2: candidates.filter(c => c.tier === 'tier2').length,
    ref: candidates.filter(c => c.tier === 'referral').length,
    conf: candidates.filter(c => c.status === 'confirmed').length
  };

  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
        <div class="flex items-center gap-3 flex-wrap">
          <h3 class="text-sm font-semibold text-gray-800">${jobMeta.jobTitle}</h3>
          <span class="text-xs text-gray-500">${candidates.length} candidate${candidates.length !== 1 ? 's' : ''}</span>
          <span class="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">${stats.t1} Tier 1</span>
          <span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">${stats.t2} Tier 2</span>
          ${stats.ref ? `<span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">${stats.ref} Referral</span>` : ''}
          ${stats.conf ? `<span class="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">${stats.conf} Confirmed</span>` : ''}
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-[1100px]">
          <thead><tr class="text-[10px] text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <th class="px-3 py-2 text-left" style="min-width:40px">#</th>
            <th class="px-3 py-2 text-left" style="min-width:150px">Candidate</th>
            <th class="px-3 py-2 text-center" style="min-width:55px">Exp</th>
            <th class="px-3 py-2 text-left" style="min-width:120px">Education</th>
            <th class="px-3 py-2 text-left" style="min-width:130px">Current Role</th>
            <th class="px-3 py-2 text-left" style="min-width:130px">Applied Role</th>
            <th class="px-3 py-2 text-left" style="min-width:130px">Best Fit</th>
            <th class="px-3 py-2 text-center" style="min-width:70px">Score</th>
            <th class="px-3 py-2 text-left" style="min-width:150px">Remarks</th>
            <th class="px-3 py-2 text-center" style="min-width:90px">Tier</th>
            <th class="px-3 py-2 text-center" style="min-width:110px">Action</th>
            <th class="px-3 py-2 text-center" style="min-width:90px">Status</th>
          </tr></thead>
          <tbody>${candidates.map((c, i) => renderCandidateRow(c, i, jobMeta.jobTitle)).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
}
```

- [ ] **Step 2: Update `renderCandidateRow()` signature and cells**

Change the signature from `function renderCandidateRow(c, idx)` to `function renderCandidateRow(c, idx, appliedRole)`. Inside the returned `<tr>` template, after the "Current Role" cell (`<td class="px-3 py-2.5 text-xs text-gray-600">${c.currentRole || '—'}</td>`), insert two new cells:

```html
      <td class="px-3 py-2.5 text-xs text-gray-700">${appliedRole}</td>
      <td class="px-3 py-2.5 text-xs text-gray-600">${c.bestFitRole || '—'}</td>
```

- [ ] **Step 3: Relabel the Best Fit filter dropdown**

Find the `<select id="filterRole"` element in the screening view and update its preceding label (or inline text) from "Filter by Role" (or similar) to "Filter by Best Fit". Also confirm the placeholder option text reads "All Best Fit Roles". If the current text matches, skip.

- [ ] **Step 4: Bump select font-size for zoom fix (already covered in Task 1 CSS, verify)**

Confirm the selects in `#screeningView` pick up the font-size rule from Task 1. Open the page, zoom to 150%, and verify the dropdown text scales. If any inline `text-[10px]` or `text-xs` class on a `<select>` is overriding the rule, change it to `text-sm`.

- [ ] **Step 5: Smoke test**

1. Post an opening (e.g., QC Engineer). Open Screen Resumes.
2. Expect **one** unified table with heading = "QC Engineer" — no per-role accordions.
3. Confirm the columns include, in order: # | Candidate | Exp | Education | Current Role | **Applied Role** | **Best Fit** | Score | Remarks | Tier | Action | Status.
4. Every row's Applied Role column = "QC Engineer". Best Fit column varies per candidate (e.g., "QC Engineer", "Site Supervisor", etc. — whatever the demo data emitted).
5. Use the Tier / Status / Search filters — confirm they still work.
6. Zoom to 150%. Confirm the Action dropdown text scales proportionally and is not truncated.

- [ ] **Step 6: Commit**

```bash
git add frontend/index.html
git commit -m "feat(portal): unify screening table with applied role and best fit columns"
```

---

## Task 8: Final end-to-end smoke test + legacy draft compat check

- [ ] **Step 1: Hard reload and full flow**

1. Open DevTools → Application → Local Storage → clear `jp_drafts`, `jp_posted`, and `screening_*` keys for a clean slate.
2. Reload the page.
3. New Opening → Construction / Project Manager → Continue to Review.
4. Verify all four sections are visible on the single Review page.
5. Upload a .docx for Additional Requirements → confirm it merges.
6. Deselect LinkedIn, select Naukri → confirm the Portal-Ready Format accordions update.
7. Copy a field → paste elsewhere → correct value.
8. Add a custom screening question.
9. Click **Approve & Post**. Lands on the Posted list.
10. Click **Edit** on the posted item → wizard opens → Move to Drafts button visible → click it → moves to Drafts.
11. Resume the draft → Continue to Review → everything is still populated → Approve again.
12. Click Edit → Delete Posted → confirm → it's gone.
13. Post a new opening, Screen Resumes, mark one Confirmed.
14. Click Outreach → Layer 1 shows the opening → click it → Layer 2 shows the candidate with Applied Role filled.
15. Back to Openings → verify navigation works.
16. On the screening page, zoom to 150% and confirm select text scales.

- [ ] **Step 2: Legacy draft compat check**

1. Open DevTools → Local Storage → manually set:

```js
localStorage.setItem('jp_drafts', JSON.stringify([{
  jobId: 'OG-2026-LEGACY', jobTitle: 'Legacy Draft', department: 'Construction',
  dbIndex: 0, location: 'Mumbai', empType: 'Full-time', jobLevel: 'Mid-Level',
  experience: '5 years', salary: '', openings: 1, reportingTo: 'Test',
  jdText: 'legacy', reqSkills: 'x', prefSkills: '', platforms: ['linkedin'],
  questions: [], _lastStep: 3
}]));
```

2. Reload. Click Resume on the Legacy Draft row.
3. Expect no console errors. `currentStep` should clamp to 1 (Review page).
4. Confirm all fields populate.

- [ ] **Step 3: Commit final sweep (if any fixes emerged)**

```bash
git add frontend/index.html
git commit -m "chore(portal): phase 1 refinements smoke-test pass"
```

---

## Spec coverage checklist

| Spec requirement | Implemented in |
|---|---|
| Collapse 5-step wizard → 2 pages | Task 2 |
| Details auto-fill unchanged; empty fields stay empty | Task 2 (existing `onJobTitleChange` preserved) |
| JD prefill from DB | Existing — preserved through Task 2 |
| Requirements .docx upload + parse + merge | Task 3 |
| Platforms recommendation kept | Task 2 (existing `renderPlatforms` reused) |
| Portal-Ready Format with copy-to-clipboard | Task 4 |
| Posted→Draft toggle fix | Task 5 (Move to Drafts button) |
| Delete posted opening | Task 5 (Delete Posted button) |
| Outreach Layer 1 openings list | Task 6 |
| Outreach Applied Role column | Task 6 |
| Screening unified table (no per-role accordions) | Task 7 |
| Screening Applied Role + Best Fit columns | Task 7 |
| Select dropdown zoom fix | Task 1 (CSS) + Task 7 (bump any inline text-xs on selects) |
| Phase 1 scope only (no Interview changes, no backend) | Design spec — out-of-scope section |
