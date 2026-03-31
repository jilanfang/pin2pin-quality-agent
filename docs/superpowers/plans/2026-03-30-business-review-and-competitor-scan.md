# Business Review and Competitor Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a journey-first business review that evaluates whether Pin2pin Fireline currently satisfies its target user journeys and how that maturity compares to Vantage 8D.

**Architecture:** The work is split into three evidence streams that converge into one final review artifact: internal journey extraction, hands-on Fireline product evaluation, and authenticated Vantage 8D competitor scanning. The final report joins those streams into an executive conclusion, journey-by-journey assessment, and competitor appendix rather than keeping them as separate notes.

**Tech Stack:** Markdown docs, Next.js app walkthroughs, existing repo tests/fixtures, browser-based product review, authenticated competitor research

---

## File structure and responsibility map

### Files to create

- `docs/business-review/2026-03-30-fireline-vs-vantage8d-review.md`
  - Final combined business review with executive summary, journey assessment, and competitor findings.
- `docs/business-review/2026-03-30-vantage8d-scan-notes.md`
  - Structured raw competitor scan notes, screenshots inventory, module observations, and workflow findings.
- `docs/business-review/2026-03-30-fireline-journey-assessment.md`
  - Internal Fireline assessment against selected priority journeys before competitor comparison.

### Files to read and use as source of truth

- `docs/journeys/fireline-hybrid-user-journey-ledger.md`
  - Authoritative journey source.
- `docs/journeys/fireline-structured-scenarios.sample.json`
  - Machine-consumable journey-derived scenarios.
- `docs/product-line-positioning.md`
  - Product boundary and product-line intent.
- `docs/current-handoff.md`
  - Current implementation and verification context.
- `tests/user-journey-regression.test.ts`
  - Existing regression journeys that show what the product currently proves.
- `tests/journey-scenario-api.test.ts`
  - API-level journey handling coverage.
- `tests/browser-smoke-script.test.ts`
  - Browser smoke behavior for current flow confidence.
- `tests/e2e/full-journey.e2e.test.ts`
  - Full-journey automation, if still current and runnable.

### Files to update only if needed during execution

- `docs/superpowers/specs/2026-03-30-business-review-and-competitor-scan-design.md`
  - Only if the agreed design changes.

---

### Task 1: Extract the review frame from Fireline’s journey source of truth

**Files:**
- Read: `docs/journeys/fireline-hybrid-user-journey-ledger.md`
- Read: `docs/journeys/fireline-structured-scenarios.sample.json`
- Read: `docs/product-line-positioning.md`
- Create: `docs/business-review/2026-03-30-fireline-journey-assessment.md`

- [ ] **Step 1: Write the initial review scaffold**

Create `docs/business-review/2026-03-30-fireline-journey-assessment.md` with this exact starting structure:

```md
# Fireline Journey Assessment

## Review frame
- Product: Pin2pin Fireline
- Source of truth: `docs/journeys/fireline-hybrid-user-journey-ledger.md`
- Method: journey-first business review

## Selected priority journeys

## Journey assessments

## Preliminary gap summary
```

- [ ] **Step 2: Select the priority journeys from the ledger**

Read the journey ledger and fill `## Selected priority journeys` with exactly 4–6 journeys in this format:

```md
- `CQ-01` 客户停线冒烟客诉 — critical complaint intake, containment, preliminary analysis, final 8D closure
- `CQ-02` 客户间歇功能异常 — fragmented evidence, case-boundary ambiguity, long-tail verification
- `QE-01` 产线桥连批量异常 — production-line abnormality, containment, owner tracking, D6/D7 closure
- `SQE-01` 来料 MLCC 微裂 — supplier-quality coordination, evidence dispute, external closure pressure
```

Only keep journeys that meaningfully test the business viability bar.

- [ ] **Step 3: Write the evaluation rubric into the assessment file**

Add this exact rubric section under `## Review frame`:

```md
## Evaluation rubric
- Journey completion: can the user reach the intended business outcome?
- Progression efficiency: does the product reduce sorting and coordination burden?
- Output credibility: are outputs usable for real internal or external work?
- Workflow closure: can the user push the case toward closure, not just generate text?
- Competitive substitutability: would a serious buyer believe this covers the core job?
```

- [ ] **Step 4: Run a source-truth sanity check**

Run:

```bash
cd /Users/jilanfang/ai-quality && grep -n "当前产品 gap\|CQ-01\|CQ-02\|QE-01\|SQE-01" docs/journeys/fireline-hybrid-user-journey-ledger.md | head -40
```

Expected: visible journey IDs and explicit gap language from the ledger, proving the selected journeys are grounded in the source of truth.

- [ ] **Step 5: Commit the review-frame extraction**

```bash
git add docs/business-review/2026-03-30-fireline-journey-assessment.md
git commit -m "docs: scaffold fireline journey assessment"
```

---

### Task 2: Gather Fireline evidence against the selected journeys

**Files:**
- Modify: `docs/business-review/2026-03-30-fireline-journey-assessment.md`
- Read: `docs/current-handoff.md`
- Read: `tests/user-journey-regression.test.ts`
- Read: `tests/journey-scenario-api.test.ts`
- Read: `tests/browser-smoke-script.test.ts`
- Read: `tests/e2e/full-journey.e2e.test.ts`

- [ ] **Step 1: Add one journey-assessment template block per selected journey**

For each selected journey, add this exact template:

```md
### CQ-01 客户停线冒烟客诉
- Target user:
- Intended job:
- Current Fireline support level:
- Evidence from product/tests:
- Blocking points:
- Gap type:
- Preliminary judgment:
```

Use one block per chosen journey.

- [ ] **Step 2: Read the product evidence sources before making any judgment**

Read these files completely before filling the assessment:

```text
/Users/jilanfang/ai-quality/docs/current-handoff.md
/Users/jilanfang/ai-quality/tests/user-journey-regression.test.ts
/Users/jilanfang/ai-quality/tests/journey-scenario-api.test.ts
/Users/jilanfang/ai-quality/tests/browser-smoke-script.test.ts
/Users/jilanfang/ai-quality/tests/e2e/full-journey.e2e.test.ts
```

- [ ] **Step 3: Record evidence-backed support judgments**

Fill each journey block using concrete phrases like:

```md
- Current Fireline support level: Partially viable
- Evidence from product/tests:
  - `tests/user-journey-regression.test.ts` covers complaint email + reply-guidance question handling
  - `tests/journey-scenario-api.test.ts` covers likely-different-case confirmation logic
  - `tests/browser-smoke-script.test.ts` confirms browser smoke flow can create and continue investigations
- Blocking points:
  - D6/D7 owner tracking is weaker than the journey expectation
  - external-facing reply confidence still depends on workflow interpretation rather than dedicated structure
- Gap type: workflow closure gap + execution maturity gap
- Preliminary judgment: Fireline can carry early-to-mid complaint flow, but not yet with full closure confidence for high-stakes external use
```

Every bullet must tie back to a file, product behavior, or verified flow.

- [ ] **Step 4: Run fresh product verification commands before finalizing support claims**

Run:

```bash
cd /Users/jilanfang/ai-quality && npm test && npm run typecheck && npm run build
```

Expected: all three commands pass, so the journey review references fresh product evidence rather than stale assumptions.

- [ ] **Step 5: Commit the Fireline assessment evidence**

```bash
git add docs/business-review/2026-03-30-fireline-journey-assessment.md
git commit -m "docs: add fireline journey assessment evidence"
```

---

### Task 3: Perform the authenticated Vantage 8D competitor scan

**Files:**
- Create: `docs/business-review/2026-03-30-vantage8d-scan-notes.md`
- Read: `docs/business-review/2026-03-30-fireline-journey-assessment.md`

- [ ] **Step 1: Create the competitor-notes scaffold**

Create `docs/business-review/2026-03-30-vantage8d-scan-notes.md` with this exact structure:

```md
# Vantage 8D Scan Notes

## Access context
- Site: https://www.vantage8d.com
- Scan date: 2026-03-30
- Authenticated: yes

## Information architecture

## Core workflows

## RCA / CAPA / 8D support

## Output and reporting

## Trust / enterprise signals

## Strengths

## Weaknesses

## Lessons for Fireline

## Differences not worth copying
```

- [ ] **Step 2: Log in and capture the main navigation model**

Using the provided credentials, log into `https://www.vantage8d.com` and populate `## Information architecture` with concrete observations in this format:

```md
- Primary nav groups:
- Default landing surface after login:
- Main object model (case / issue / customer / action / report etc.):
- First-time orientation quality:
```

- [ ] **Step 3: Walk at least 4 key workflow surfaces**

Inspect and document at least these four areas if accessible:

```md
- complaint or issue intake flow
- investigation / analysis workspace
- RCA / CAPA / 8D workflow progression
- report / output / handoff surface
```

For each, record:

```md
- what the user is trying to do,
- how the system structures the work,
- what feels mature,
- what feels rigid, weak, or overbuilt.
```

- [ ] **Step 4: Capture trust and enterprise signals explicitly**

In `## Trust / enterprise signals`, write bullets for items like:

```md
- auditability / status tracking signals
- ownership and due-date signals
- formality of outputs
- admin / governance / account-level framing
- cues that make the product feel enterprise-ready
```

- [ ] **Step 5: Verify the scan notes are evidence-based**

Before committing, ensure each section contains direct product observations, not guesses. If a section was inaccessible, write exactly:

```md
- Inaccessible during authenticated scan; not inferred.
```

- [ ] **Step 6: Commit the competitor scan notes**

```bash
git add docs/business-review/2026-03-30-vantage8d-scan-notes.md
git commit -m "docs: add vantage8d competitor scan notes"
```

---

### Task 4: Produce the joined business review

**Files:**
- Create: `docs/business-review/2026-03-30-fireline-vs-vantage8d-review.md`
- Read: `docs/business-review/2026-03-30-fireline-journey-assessment.md`
- Read: `docs/business-review/2026-03-30-vantage8d-scan-notes.md`

- [ ] **Step 1: Create the final review scaffold**

Create `docs/business-review/2026-03-30-fireline-vs-vantage8d-review.md` with this exact starting structure:

```md
# Fireline vs Vantage 8D Business Review

## Executive conclusion

## Journey-by-journey assessment

## Competitor comparison summary

## Priority gaps

## Differences not worth copying

## Recommendation
```

- [ ] **Step 2: Write the executive conclusion as a concrete business judgment**

Fill `## Executive conclusion` with 4–8 bullets in this format:

```md
- Overall judgment: Fireline is / is not / is only partially ready to carry the core target journeys.
- Strongest area:
- Weakest area:
- Most dangerous gap:
- Most meaningful Vantage advantage:
- Most important thing Fireline gets directionally right:
```

Do not use vague wording like “promising” or “has potential” without a concrete readiness statement.

- [ ] **Step 3: Convert internal and external evidence into a joined journey section**

For each selected journey, write a subsection using this exact template:

```md
### CQ-01 客户停线冒烟客诉
- Fireline current state:
- Vantage 8D comparison:
- What matters here:
- Gap type:
- Judgment:
```

Judgments must explicitly say whether the gap is about:
- missing capability,
- workflow closure,
- trust/output quality,
- execution maturity.

- [ ] **Step 4: Write a priority-ranked gap section**

Under `## Priority gaps`, write exactly 3–5 numbered items in this format:

```md
1. [Gap name]
   - Why it matters:
   - Evidence:
   - Competitor signal:
   - Priority: P0 / P1 / P2
```

Only include gaps that materially affect journey success or competitive substitutability.

- [ ] **Step 5: Write the final recommendation**

In `## Recommendation`, end with a direct statement in this form:

```md
Fireline today should be treated as:
- ready for target journeys,
- ready with significant caveats,
- or not yet ready.

Next product focus should be:
1. ...
2. ...
3. ...
```

- [ ] **Step 6: Commit the final joined review**

```bash
git add docs/business-review/2026-03-30-fireline-vs-vantage8d-review.md
git commit -m "docs: add fireline business review"
```

---

### Task 5: Final verification and packaging

**Files:**
- Review: `docs/business-review/2026-03-30-fireline-journey-assessment.md`
- Review: `docs/business-review/2026-03-30-vantage8d-scan-notes.md`
- Review: `docs/business-review/2026-03-30-fireline-vs-vantage8d-review.md`

- [ ] **Step 1: Run a consistency check across all three review artifacts**

Search for contradictions with:

```bash
cd /Users/jilanfang/ai-quality && grep -n "Overall judgment\|Priority: \|Gap type:\|Inaccessible during authenticated scan" docs/business-review/2026-03-30-*.md
```

Expected: every judgment and priority appears intentionally; inaccessible sections are explicitly marked rather than silently omitted.

- [ ] **Step 2: Verify the final report really reflects the created evidence docs**

Manually check that every major conclusion in `docs/business-review/2026-03-30-fireline-vs-vantage8d-review.md` can be pointed back to one of:

```text
docs/business-review/2026-03-30-fireline-journey-assessment.md
docs/business-review/2026-03-30-vantage8d-scan-notes.md
```

If a conclusion cannot be traced back, rewrite it.

- [ ] **Step 3: Run a markdown placeholder scan**

Run:

```bash
cd /Users/jilanfang/ai-quality && grep -RIn "TODO\|TBD\|implement later\|fill in details" docs/business-review/2026-03-30-*.md
```

Expected: no matches.

- [ ] **Step 4: Commit the final packaging pass**

```bash
git add docs/business-review/2026-03-30-fireline-journey-assessment.md docs/business-review/2026-03-30-vantage8d-scan-notes.md docs/business-review/2026-03-30-fireline-vs-vantage8d-review.md
git commit -m "docs: finalize business review package"
```

---

## Self-review

### Spec coverage

Spec requirements covered by tasks:

- Journey-first framing: Task 1
- Evidence-based Fireline review: Task 2
- Authenticated Vantage 8D scan: Task 3
- Joined business judgment: Task 4
- Final consistency and packaging: Task 5

No major spec requirement is uncovered.

### Placeholder scan

The plan uses exact paths, exact deliverables, exact markdown structures, and explicit commands. No `TODO`, `TBD`, or ambiguous “write tests later” placeholders remain.

### Type and naming consistency

The three generated review artifacts are referred to consistently everywhere:

- `docs/business-review/2026-03-30-fireline-journey-assessment.md`
- `docs/business-review/2026-03-30-vantage8d-scan-notes.md`
- `docs/business-review/2026-03-30-fireline-vs-vantage8d-review.md`

Judgment vocabulary is also consistent across the plan:

- `missing capability`
- `workflow closure gap`
- `trust/output quality gap`
- `execution maturity gap`
