# Remove Offline Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the outdated root offline prototype and clean active project guidance so the Next.js app is the only maintained product line.

**Architecture:** This change is a repository-boundary cleanup, not a product refactor. Delete the obsolete prototype files first, then rewrite or remove current-facing docs that still describe a dual-track repo, and finally re-run repository searches and validation commands to confirm the cleanup is internally consistent.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, markdown project docs, git

---

## File structure and responsibility map

### Files to delete

- `index.html`
  - Obsolete root offline prototype entrypoint.
- `deck.test.mjs`
  - Test coverage for the obsolete root offline prototype.
- `docs/index-html-to-nextjs-migration-ledger.md`
  - Migration/boundary document whose premise depends on keeping the offline prototype in active scope.

### Files to modify

- `AGENTS.md`
  - Project index and current source-of-truth guidance. Must stop describing `index.html` as active.
- `docs/README.md`
  - Documentation index. Must stop routing users into dual-line reading paths.
- `docs/current-handoff.md`
  - Current recovery/handoff document. Must stop describing two active implementation lines and remove old validation commands tied to `deck.test.mjs`.
- `docs/deployment-and-demo.md`
  - Runtime and deployment guide. Must stop describing the root prototype as a runnable current reference path.
- `docs/mvp-hardening-checklist.md`
  - Engineering checklist. Must stop treating `index.html` as an active comparison/migration source.

### Files to review during implementation

- `package.json`
  - Confirm no scripts reference the removed prototype files.
- `assets/xkyx-tech-grid.svg`
  - Keep only if still used by the Next.js app; do not delete blindly.
- Search results in current docs and guidance files
  - Use grep-based verification after edits to confirm no active references remain.

---

### Task 1: Remove the obsolete prototype files

**Files:**
- Delete: `index.html`
- Delete: `deck.test.mjs`
- Review: `package.json`
- Review: `assets/xkyx-tech-grid.svg`

- [ ] **Step 1: Verify no package scripts depend on the prototype files**

Read `package.json` and confirm the scripts block does not reference `index.html` or `deck.test.mjs`.

Expected conclusion:

```json
{
  "scripts": {
    "dev": "WATCHPACK_POLLING=true next dev --hostname 127.0.0.1 --port 3001",
    "build": "next build",
    "test": "vitest run"
  }
}
```

No script should reference either removed file.

- [ ] **Step 2: Search for direct code/test references before deleting**

Run:

```bash
grep -RIn "index\.html\|deck\.test\.mjs" /Users/jilanfang/ai-quality \
  --exclude-dir=node_modules \
  --exclude='*.bak-*' \
  --exclude-dir=.git \
  --exclude-dir=.task-archive
```

Expected: matches in current docs plus the two root files themselves.

- [ ] **Step 3: Delete the obsolete prototype entrypoint and test**

Delete these exact files:

```text
/Users/jilanfang/ai-quality/index.html
/Users/jilanfang/ai-quality/deck.test.mjs
```

- [ ] **Step 4: Verify they are gone from the working tree**

Run:

```bash
ls /Users/jilanfang/ai-quality/index.html /Users/jilanfang/ai-quality/deck.test.mjs
```

Expected: both paths report “No such file or directory”.

- [ ] **Step 5: Commit the deletion step**

```bash
git add index.html deck.test.mjs
git commit -m "chore: remove outdated offline prototype files"
```

---

### Task 2: Rewrite the project index and docs index to a single-line repo model

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/README.md`

- [ ] **Step 1: Write the failing documentation expectation as a checklist**

The updated docs must make these statements true:

```md
- The Next.js app is the only maintained product line.
- `app/`, `components/`, and `lib/` are the current source of truth.
- Contributors are not routed to `index.html` or any dual-line workflow.
```

Use this as the acceptance target while editing both files.

- [ ] **Step 2: Update `AGENTS.md` current implementation section**

Replace the current implementation guidance with content equivalent to:

```md
## Current Canonical Implementation

- The product is the single `Next.js App Router + TypeScript` app.
- `app/`, `components/`, and `lib/` are the source of truth for current product behavior.
- `backend/` is migration reference only, not the current shipping path.
```

Also remove this outdated guidance entirely:

```md
- Root `index.html` remains an active offline demo or mockup reference line for comparison and interaction testing.
```

And replace this source-of-truth block:

```md
- `index.html -> Next.js` differences and migration decisions:
  - `docs/index-html-to-nextjs-migration-ledger.md`
```

with nothing, unless another still-live doc is needed there.

- [ ] **Step 3: Update `docs/README.md` so it no longer describes two current lines**

Rewrite the opening and “按场景阅读” guidance so it reflects a single maintained product line. The resulting sections should communicate content equivalent to:

```md
当前项目的正式产品实现是 `Next.js App Router + TypeScript` 主应用。
根目录 `index.html` 离线原型已移除，不再作为当前维护线路。
```

And remove or rewrite all reading guidance that currently says things like:

```md
- 一条是 `Next.js App Router + TypeScript` 主应用
- 一条是根目录 `index.html` 的离线原型
```

and:

```md
### 如果你继续维护 `index.html` 离线原型
```

The revised reading paths should route users only into current Next.js docs and current product guidance.

- [ ] **Step 4: Verify the updated docs no longer route readers to the old line**

Run:

```bash
grep -n "index\.html\|离线原型" /Users/jilanfang/ai-quality/AGENTS.md /Users/jilanfang/ai-quality/docs/README.md
```

Expected: no matches, or only explicitly historical wording that does not describe the prototype as current.

- [ ] **Step 5: Commit the doc index cleanup**

```bash
git add AGENTS.md docs/README.md
git commit -m "docs: remove offline prototype from project guidance"
```

---

### Task 3: Rewrite the active handoff and deployment docs

**Files:**
- Modify: `docs/current-handoff.md`
- Modify: `docs/deployment-and-demo.md`

- [ ] **Step 1: Replace the dual-track handoff framing with single-line guidance**

In `docs/current-handoff.md`, replace the opening sections so they communicate the current state as:

```md
> 目的：给新线程一个与当前代码一致的恢复点。当前项目的唯一维护实现是 `Next.js App Router + TypeScript` 主应用。
```

Remove or rewrite content equivalent to:

```md
当前代码库里同时存在两条可运行线路：
1. Next.js ...
2. 根目录 index.html ...
```

and remove any instruction that routes some work to `index.html`.

- [ ] **Step 2: Remove obsolete validation commands and results from handoff**

Delete references to `deck.test.mjs` in `docs/current-handoff.md`, including command examples and result bullets such as:

```md
node --test deck.test.mjs
- `deck.test.mjs`：`30 passed`
```

Keep the Next.js validation guidance and fresh verification framing.

- [ ] **Step 3: Remove sections whose premise depends on the offline prototype still existing**

Delete or substantially rewrite sections in `docs/current-handoff.md` that describe:

```md
### A. `index.html` 离线演示线路
### 4.1 `index.html` 已有，但 Next.js 主应用未对齐的能力
### 4.2 Next.js 主应用已有，但 `index.html` 未对齐的能力
### 5. 当前推荐的判断原则
```

The rewritten doc should focus on the current Next.js implementation, current gaps, and current validation truth only.

- [ ] **Step 4: Update `docs/deployment-and-demo.md` to remove runnable prototype wording**

Delete or rewrite language equivalent to:

```md
根目录 `index.html` 仍保留为可运行的离线原型 / 演示参考线
```

and:

```md
根目录 `index.html` 仍可运行，适合作离线演示、交互试验和报告展示对照
```

The document should present the Next.js app as the only runtime/deployment target.

- [ ] **Step 5: Verify both docs now describe only the maintained product line**

Run:

```bash
grep -n "index\.html\|deck\.test\.mjs\|离线原型" /Users/jilanfang/ai-quality/docs/current-handoff.md /Users/jilanfang/ai-quality/docs/deployment-and-demo.md
```

Expected: no matches, or only clearly historical wording that does not present the old prototype as active.

- [ ] **Step 6: Commit the handoff/deployment cleanup**

```bash
git add docs/current-handoff.md docs/deployment-and-demo.md
git commit -m "docs: drop offline prototype from handoff and deployment docs"
```

---

### Task 4: Remove obsolete migration guidance and hardening references

**Files:**
- Delete: `docs/index-html-to-nextjs-migration-ledger.md`
- Modify: `docs/mvp-hardening-checklist.md`

- [ ] **Step 1: Delete the obsolete migration ledger**

Delete this exact file because its premise depends on an active offline prototype comparison path:

```text
/Users/jilanfang/ai-quality/docs/index-html-to-nextjs-migration-ledger.md
```

- [ ] **Step 2: Remove checklist items that depend on the ledger or the old comparison model**

In `docs/mvp-hardening-checklist.md`, remove or rewrite this block so it no longer instructs the team to maintain an `index.html -> Next.js` migration ledger:

```md
### 2.3 建立离线原型回灌账本
...
- [x] 写一份 `index.html -> Next.js` 的迁移清单
...
- [x] 迁移账本已落在 [`index-html-to-nextjs-migration-ledger.md`](./index-html-to-nextjs-migration-ledger.md)
```

Replace it with a shorter rule consistent with the new repo boundary, for example:

```md
### 2.3 保持单一产品线边界

- [x] 明确 Next.js 是唯一维护产品线
- [x] 不再保留或扩展离线原型分支
- [x] 所有新增产品能力默认落在 `app/`、`components/`、`lib/`
```

Also rewrite this sentence if still present:

```md
- 新增产品能力默认继续落在 `Next.js` 主线，不继续让 `index.html` 和主应用隐性分叉
```

so it no longer implies the old line still exists.

- [ ] **Step 3: Verify no active doc still depends on the migration ledger**

Run:

```bash
grep -RIn "index-html-to-nextjs-migration-ledger\.md" /Users/jilanfang/ai-quality/docs /Users/jilanfang/ai-quality/AGENTS.md
```

Expected: no matches in active docs.

- [ ] **Step 4: Commit the obsolete-guidance cleanup**

```bash
git add docs/index-html-to-nextjs-migration-ledger.md docs/mvp-hardening-checklist.md AGENTS.md docs/README.md docs/current-handoff.md docs/deployment-and-demo.md
git commit -m "docs: remove obsolete offline prototype migration guidance"
```

---

### Task 5: Run repository verification and finalize

**Files:**
- Review: repository-wide active files
- Test: project validation commands

- [ ] **Step 1: Search active repo files for leftover current-facing prototype references**

Run these commands:

```bash
grep -RIn "index\.html\|deck\.test\.mjs\|离线原型\|offline prototype" /Users/jilanfang/ai-quality \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=.task-archive \
  --exclude='*.bak-*' \
  --exclude-dir=docs/archive
```

Expected: no matches in active project guidance or runnable paths, except the design spec/plan files you are writing for this cleanup.

- [ ] **Step 2: Run the test suite**

Run:

```bash
cd /Users/jilanfang/ai-quality && npm test
```

Expected: all current Vitest suites pass.

- [ ] **Step 3: Run typecheck**

Run:

```bash
cd /Users/jilanfang/ai-quality && npm run typecheck
```

Expected: TypeScript completes without errors.

- [ ] **Step 4: Run build**

Run:

```bash
cd /Users/jilanfang/ai-quality && npm run build
```

Expected: Next.js production build succeeds.

- [ ] **Step 5: Review the working tree and commit the verification-safe final state**

Run:

```bash
git status --short
```

Expected: only the intended file deletions and doc edits remain.

Then commit:

```bash
git add AGENTS.md docs/README.md docs/current-handoff.md docs/deployment-and-demo.md docs/mvp-hardening-checklist.md docs/index-html-to-nextjs-migration-ledger.md index.html deck.test.mjs
git commit -m "chore: remove outdated offline prototype references"
```

---

## Self-review

### Spec coverage

Spec requirements covered by tasks:

- Delete offline prototype files: Task 1
- Remove current-facing doc references: Tasks 2 and 3
- Remove obsolete migration/boundary docs: Task 4
- Verify repo consistency and runtime health: Task 5

No uncovered spec requirement remains.

### Placeholder scan

The plan uses exact file paths, exact commands, exact deletions, and explicit replacement guidance. No `TODO`, `TBD`, or undefined implementation placeholders remain.

### Type and naming consistency

The same exact target files and search strings are used consistently throughout the plan:

- `index.html`
- `deck.test.mjs`
- `docs/index-html-to-nextjs-migration-ledger.md`
- `离线原型`
- `offline prototype`

No conflicting filenames or command targets remain.
