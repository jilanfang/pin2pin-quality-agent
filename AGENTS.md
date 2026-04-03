# AGENTS.md

## Purpose

- This file is the project index for `ai-quality`.
- Keep it lean: canonical implementation, source of truth, verification gates, and routing only.
- Project-specific implementation lessons, model-routing rules, backlog discipline, and design triggers live in `SKILLS.md`.
- Cross-project defaults live in `/Users/jilanfang/.codex/AGENTS.md`, `/Users/jilanfang/.codex/SKILLS.md`, and `/Users/jilanfang/.codex/PORTS.md`.

## Current Canonical Implementation

- The primary product path is the single `Next.js App Router + TypeScript` app.
- `app/`, `components/`, and `lib/` are the main source of truth for current product behavior.
- Root `index.html` remains an active offline demo or mockup reference line for comparison and interaction testing.
- `backend/` is migration reference only, not the current shipping path.

## Source Of Truth

- Documentation index:
  - `docs/README.md`
- Main backlog:
  - `docs/mvp-hardening-checklist.md`
- `index.html -> Next.js` differences and migration decisions:
  - `docs/index-html-to-nextjs-migration-ledger.md`
- Deployment path, auth rollout notes, and production verification:
  - `docs/deployment-and-demo.md`
- Visual system baseline:
  - `DESIGN.md`
- Temporary recovery snapshot only, not long-term truth:
  - `docs/current-handoff.md`
- Default localhost app port comes from the global registry:
  - `3001`

## Verification

- Before claiming the project can run, at least re-run:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
- For production-path verification, also run:
  - `npm start`
  - `curl http://127.0.0.1:3001/api/health`
- For page-path verification, also confirm:
  - homepage loads
  - login succeeds with a real issued account
  - unauthenticated business API returns `401` JSON instead of HTML
  - case creation succeeds
  - case list is readable
  - browser console is clean

## Current Priorities

- Current priority order is:
  - `能跑`
  - `可 demo`
  - `可部署`
- If docs and live code disagree, trust current code plus fresh verification.

## Routing

- Project-specific triggered guidance and lessons: `SKILLS.md`
- Cross-project defaults: `/Users/jilanfang/.codex/AGENTS.md` and `/Users/jilanfang/.codex/SKILLS.md`
- Localhost port registry: `/Users/jilanfang/.codex/PORTS.md`
