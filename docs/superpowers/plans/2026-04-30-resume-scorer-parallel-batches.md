# Resume Scorer Parallel Batch Processing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Speed up resume scoring by processing AI batches concurrently instead of sequentially, with a configurable concurrency limit to respect API rate limits.

**Architecture:** Replace the sequential `for` loop over batches with a concurrency-limited `Promise.all` approach. Each batch of 5 resumes becomes an independent AI API call that runs in parallel (up to a concurrency cap). The frontend gets a progress indicator showing batch-by-batch completion. No new dependencies — pure Node.js concurrency.

**Tech Stack:** Express.js backend (server.js), vanilla JS frontend (index.html), OpenRouter API (DeepSeek model), no new libraries.

---

## Current State

- **File:** `backend/server.js:551-611`
- Resumes are split into batches of 5 (`BATCH_SIZE = 5`)
- Batches processed sequentially: `for (let b = 0; b < totalBatches; b++) { await fetch(...) }`
- 50 resumes = 10 sequential API calls × ~10s each = ~100s wall-clock time
- Each batch is fully independent — same system prompt, same JD, different resumes

## After This Plan

- Batches fire concurrently up to `MAX_CONCURRENT_BATCHES` (default: 3)
- 50 resumes = 10 batches, processed 3 at a time = ~4 rounds × ~10s = ~40s wall-clock time
- Frontend shows real-time progress: "Batch 3/10 complete..."
- Quality unchanged — each individual batch prompt is identical to today

---

### Task 1: Add concurrency-limited batch runner (backend)

**Files:**
- Modify: `backend/server.js:551-611` (the batch loop inside `/api/run-skill`)

**Why concurrency-limited, not full `Promise.all`:**
OpenRouter rate limits vary by account tier. Firing 10+ requests simultaneously risks 429 errors. A concurrency cap of 3 gives ~3× speedup while staying well within typical rate limits. The cap is easy to tune.

- [ ] **Step 1: Extract the single-batch scoring logic into a helper function**

Inside `server.js`, directly above the line `const BATCH_SIZE = 5;` (line 551), add this helper function. This is the existing fetch logic extracted verbatim — no behavior change:

```javascript
      async function scoreBatch(batch, batchIndex, totalBatches, jdBlock, apiKey) {
        console.log(`  Batch ${batchIndex + 1}/${totalBatches}: scoring ${batch.length} resumes...`);
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
          console.error(`  Batch ${batchIndex + 1} failed: ${response.status}`);
          return batch.map(r => ({
            "Rank": 0, "Candidate Name": r.name.replace(/\.pdf$/i, ''),
            "Experience (Yrs)": 0, "Education": "Unknown", "Current Role": "Unknown",
            "Best Fit Position": "Unknown", "Score (/100)": 0,
            "Remarks": `Rejected — API error: ${errData.error?.message || response.status}`,
            "Contact": r.phone || '',
            "Mobile Number": r.phone || '',
            "All Mobile Numbers": r.phones || [],
            "Resume ID": r.resumeId || '',
            "Resume URL": r.resumeUrl || '',
            "Resume File Name": r.name,
            "Resume MIME Type": r.mimeType || 'application/pdf',
            "resumePreview": {
              id: r.resumeId || '',
              url: r.resumeUrl || '',
              fileName: r.name,
              mimeType: r.mimeType || 'application/pdf'
            }
          }));
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || '[]';
        console.log(`  Batch ${batchIndex + 1} response: ${reply.length} chars`);
        return attachResumeMetadata(parseAiReply(reply, batch), batch);
      }
```

- [ ] **Step 2: Replace the sequential `for` loop with concurrency-limited parallel execution**

Replace the entire block from `const BATCH_SIZE = 5;` through the line `allCandidates.push(...attachResumeMetadata(parseAiReply(reply, batch), batch));` and the closing `}` of the for loop (lines 551–611) with:

```javascript
      const BATCH_SIZE = 5;
      const MAX_CONCURRENT = 3;
      const totalBatches = Math.ceil(resumeTexts.length / BATCH_SIZE);
      const jdBlock = `=== JOB DESCRIPTION ===\nTitle: ${jobTitle || 'Not specified'}\nDepartment: ${department || 'Not specified'}\n\n${jdText}`;

      const batches = [];
      for (let b = 0; b < totalBatches; b++) {
        batches.push({
          items: resumeTexts.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE),
          index: b
        });
      }

      console.log(`  Processing ${totalBatches} batches (concurrency: ${MAX_CONCURRENT})...`);

      const allCandidates = [];
      for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
        const chunk = batches.slice(i, i + MAX_CONCURRENT);
        const results = await Promise.all(
          chunk.map(({ items, index }) => scoreBatch(items, index, totalBatches, jdBlock, apiKey))
        );
        results.forEach(r => allCandidates.push(...r));
      }
```

- [ ] **Step 3: Test locally with a small set (2-3 resumes) to verify identical output**

Run the local server:
```bash
cd backend && node server.js
```

Upload 2-3 test resumes via the UI. Compare the scoring output against the previous sequential version — scores, names, remarks, and metadata should be identical since the prompt per batch is unchanged.

- [ ] **Step 4: Test with a larger set (10-15 resumes) to verify parallel speedup**

Upload 10-15 resumes. Observe the server console logs:
- **Before:** Batches appear one after another with ~10s gaps
- **After:** Groups of 3 batches start together, then next group of 3

Expected speedup: ~2-3× for 10+ resumes.

- [ ] **Step 5: Commit**

```bash
git add backend/server.js
git commit -m "feat: parallelize resume scoring batches (3 concurrent)"
```

---

### Task 2: Add real-time progress feedback (frontend)

**Files:**
- Modify: `backend/server.js` (add SSE or progress response)
- Modify: `frontend/index.html:2548-2640` (runSkill function + UI)

**Why:** With sequential processing, the spinner just spins. With parallel processing, batches complete faster but the user still sees nothing until 100% done. Adding batch-level progress ("4 of 10 batches done") gives confidence the system is working and provides a rough ETA.

**Approach:** Use Server-Sent Events (SSE) to stream progress from backend to frontend in real-time. The final event contains the full results JSON. This avoids polling and works with the existing `fetch` API via `EventSource` or `getReader()`.

- [ ] **Step 1: Convert the `/api/run-skill` response to SSE streaming**

In `backend/server.js`, modify the response handling inside the route handler. After the line that builds the `batches` array and before the parallel processing loop, set SSE headers:

```javascript
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      function sendProgress(completed, total) {
        res.write(`data: ${JSON.stringify({ type: 'progress', completed, total })}\n\n`);
      }
```

Then update the parallel loop to send progress after each chunk completes:

```javascript
      let completedBatches = 0;
      const allCandidates = [];
      for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
        const chunk = batches.slice(i, i + MAX_CONCURRENT);
        const results = await Promise.all(
          chunk.map(({ items, index }) => scoreBatch(items, index, totalBatches, jdBlock, apiKey))
        );
        results.forEach(r => allCandidates.push(...r));
        completedBatches += chunk.length;
        sendProgress(completedBatches, totalBatches);
      }
```

After the post-processing (experience gate, sorting, ranking), send the final result and close:

```javascript
      res.write(`data: ${JSON.stringify({ type: 'result', success: true, result: JSON.stringify(allCandidates) })}\n\n`);
      res.end();
```

Replace the existing `res.json({ success: true, result: ... })` line with the SSE write above.

Also wrap the catch block to handle SSE error responses:

```javascript
    } catch (err) {
      console.error('Skill API error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: err.message });
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
        res.end();
      }
    }
```

- [ ] **Step 2: Update the frontend `runSkill()` function to consume the SSE stream**

In `frontend/index.html`, replace the `fetch` + `res.json()` block (lines 2587-2601) with a streaming reader:

```javascript
    const res = await fetch('/api/run-skill', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + authToken },
      body: formData
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let apiData = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const event = JSON.parse(line.slice(6));

        if (event.type === 'progress') {
          btn.innerHTML = `<svg class="w-4 h-4 animate-spin inline mr-1" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Batch ${event.completed}/${event.total} done...`;
        } else if (event.type === 'error') {
          throw new Error(event.error);
        } else if (event.type === 'result') {
          apiData = event;
        }
      }
    }

    if (!apiData || !apiData.success) {
      showToast('AI scoring failed: ' + (apiData?.error || 'Unknown error'), 'error');
      resultDiv.textContent = 'Error: ' + (apiData?.error || 'Unknown error');
      resultDiv.classList.remove('hidden');
      resetSkillBtn();
      return;
    }
```

The rest of the function (JSON parsing of `apiData.result`, candidate processing, etc.) stays the same — just change `apiData.result` references to use the SSE-delivered `apiData.result`.

- [ ] **Step 3: Test progress display with 10+ resumes**

Upload 10-15 resumes and observe:
- Button text updates: "Batch 1/3 done..." → "Batch 2/3 done..." → "Batch 3/3 done..."
- Final results appear and import into the screening table as before
- No regressions in candidate data, scores, or resume preview links

- [ ] **Step 4: Test edge cases**

Test these scenarios:
1. **Single resume** — should work as before, 1 batch, no progress intermediate
2. **API error on one batch** — error candidates should appear with score 0, other batches succeed
3. **Network disconnect mid-stream** — frontend should show error toast, not hang

- [ ] **Step 5: Commit**

```bash
git add backend/server.js frontend/index.html
git commit -m "feat: add SSE progress streaming for resume scorer"
```

---

### Task 3: Add configurable concurrency via environment variable

**Files:**
- Modify: `backend/server.js` (read from env)
- Modify: `backend/.env.example` (if it exists, add the variable)

**Why:** Different OpenRouter account tiers have different rate limits. Making concurrency configurable lets operators tune it without code changes.

- [ ] **Step 1: Replace hardcoded `MAX_CONCURRENT` with env-backed default**

In `backend/server.js`, change the `MAX_CONCURRENT` declaration:

```javascript
      const MAX_CONCURRENT = Math.max(1, Math.min(10, parseInt(process.env.SCORER_CONCURRENCY, 10) || 3));
```

This reads `SCORER_CONCURRENCY` from env, defaults to 3, and clamps between 1 and 10.

- [ ] **Step 2: Add to `.env.example` (if it exists)**

```
# Resume scorer: max parallel AI batches (1-10, default 3)
SCORER_CONCURRENCY=3
```

- [ ] **Step 3: Test with `SCORER_CONCURRENCY=1` to verify it falls back to sequential**

Start the server with `SCORER_CONCURRENCY=1` and confirm batches process one at a time (matching original behavior).

- [ ] **Step 4: Commit**

```bash
git add backend/server.js
git commit -m "feat: make scorer concurrency configurable via SCORER_CONCURRENCY env var"
```

---

## Summary of Impact

| Metric | Before | After (default concurrency=3) |
|--------|--------|-------------------------------|
| 10 resumes (2 batches) | ~20s | ~10s (2 batches parallel) |
| 25 resumes (5 batches) | ~50s | ~20s (2 rounds of 3+2) |
| 50 resumes (10 batches) | ~100s | ~40s (4 rounds of 3+3+3+1) |
| Quality | Baseline | Identical (same prompts) |
| Progress feedback | Spinner only | "Batch X/Y done..." |

**Zero new dependencies.** Same AI model, same prompts, same scoring logic. The only change is *when* batches fire (concurrently vs sequentially) and how progress is reported (SSE stream vs silent wait).
