# Remove outdated offline prototype design

## Context

Pin2pin Fireline has already converged on the Next.js application under `app/` and `components/` as the real product line. The root offline prototype (`index.html` and related references) is now outdated, but the repository still contains code, tests, and documentation that describe it as active or co-equal. That creates avoidable confusion for anyone reading the repo, planning work, or deciding where new changes belong.

This design defines a full removal and repository-wide narrative cleanup so the project presents a single clear truth: the Next.js app is the only maintained product line.

## Goal

Remove the offline prototype and all current-facing references to it so that:

- the repository no longer contains the outdated root prototype path,
- tests and scripts no longer depend on it,
- active docs no longer describe a dual-track product model,
- contributors are guided toward the Next.js app as the only supported implementation.

## Scope

### In scope

1. Delete the offline prototype entrypoint and direct test coverage for it.
2. Delete or rewrite active documentation that still treats the prototype as current.
3. Remove “dual-line” framing where it is no longer true.
4. Keep Next.js product documentation coherent after the cleanup.

### Out of scope

1. Refactoring unrelated Next.js product code.
2. Reworking the design system or product strategy.
3. General-purpose documentation cleanup unrelated to the offline prototype.
4. Broad historical archiving unless a document is still necessary to explain current behavior.

## Recommended approach

### 1. Remove the old implementation path completely

Delete the root offline prototype files that represent the obsolete product line, starting with the root `index.html` and direct test coverage such as `deck.test.mjs`. Also remove any assets that exist only to support that prototype, but only if they are not referenced by the Next.js app.

This avoids a half-removed state where the old line is gone in spirit but still present in the tree.

### 2. Clean active documentation to match reality

Update active project-facing docs so they no longer describe the repository as “Next.js mainline + offline prototype.” In practice, this likely includes at least:

- `docs/README.md`
- `docs/current-handoff.md`
- `AGENTS.md`

and any other current guidance that still points contributors toward `index.html`, `deck.test.mjs`, or a two-track model.

The guiding rule is simple: if a document is meant to guide current work, it must describe the current product truth.

### 3. Remove stale migration/boundary documents if their premise is gone

Some documents appear to exist mainly to explain the coexistence or migration boundary between the prototype and the Next.js app. If that coexistence is no longer real, those docs should be deleted or rewritten so they do not continue to act like active operational guidance.

### 4. Preserve focus on product-line unification only

Do not expand this cleanup into unrelated rewrites. The objective is to remove an obsolete line and unify repo guidance, not to opportunistically improve everything nearby.

## Alternatives considered

### Option A — Full removal and cleanup (recommended)
Delete the old files and clean all active references in the same change.

- Pros: leaves the repo in a clean, truthful state; minimizes future confusion.
- Cons: touches multiple docs in one pass.

### Option B — Delete code only
Delete `index.html` and direct tests, but postpone documentation cleanup.

- Pros: smaller initial change.
- Cons: leaves stale guidance behind and increases confusion.

### Option C — Keep as archive
Move the old prototype into an archive area instead of deleting it.

- Pros: preserves history in-tree.
- Cons: continues to imply relevance, increases maintenance ambiguity, and is unnecessary when git history already preserves the old implementation.

## Architecture and file impact

### Files likely to be deleted

- root `index.html`
- root `deck.test.mjs`
- any prototype-only assets confirmed unused by the Next.js app

### Files likely to be updated

- `docs/README.md`
- `docs/current-handoff.md`
- `AGENTS.md`
- other current docs that still reference `index.html`, `deck.test.mjs`, “offline prototype”, “离线原型”, or a dual-track repo model

### Files likely to be reviewed for dependency validation

- `package.json`
- shell/test scripts
- any documentation index or handoff files
- asset references under `assets/` and app/component code if an asset might still be shared

## Implementation sequence

1. Search for all references to `index.html`, `deck.test.mjs`, `offline prototype`, and `离线原型`.
2. Determine which files are active guidance versus stale snapshots/backups/history artifacts.
3. Verify whether any prototype-era assets are still used by the Next.js app.
4. Delete the obsolete prototype files.
5. Rewrite or remove current-facing documents that still present the old model.
6. Re-run searches to ensure the active repo no longer presents the offline prototype as current.
7. Run validation commands.

## Error handling and decision rules

- If an asset referenced by the prototype is still used by Next.js, keep the asset and only remove the obsolete path-specific wording around it.
- If a document is clearly historical or archived rather than current guidance, it does not need to be rewritten unless it causes active confusion.
- If a migration doc has no remaining operational value after removal, delete it instead of preserving dead process.

## Testing and verification

After implementation:

1. Search the repo again for:
   - `index.html`
   - `deck.test.mjs`
   - `offline prototype`
   - `离线原型`
2. Confirm that active guidance no longer describes a dual-track repository.
3. Confirm that package scripts and test flows do not reference removed files.
4. Run:
   - `npm test`
   - `npm run typecheck`
   - `npm run build` if the cleanup affects documentation-linked build assumptions or surfaces with shared assets

## Success criteria

The cleanup is successful when:

- the offline prototype files are gone,
- there are no active tests or scripts depending on them,
- the main project docs present Next.js as the sole maintained product line,
- a new contributor would no longer be misled into treating the offline prototype as current.
