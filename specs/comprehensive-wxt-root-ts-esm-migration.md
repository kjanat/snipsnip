# Comprehensive WXT Root TS ESM Migration

## Type

Feature plan

## Status

Drafted for approval

## Effort

XL

## Problem Definition

The repo is effectively a single extension package, but it is split across a root workspace plus `src/package.json`, custom manifest generation, raw MV3 files, CommonJS/UMD globals, and script-order coupling across popup/options/offscreen/service-worker contexts.

This creates four concrete costs:

1. Tooling split-brain: root owns TypeScript, `src` owns extension build/runtime.
2. Runtime fragility: many features depend on ordered global scripts and `globalThis.snipSnip*` exports.
3. Browser build drift: Chrome and Firefox outputs diverge via custom copy/build logic.
4. Migration drag: WXT, TypeScript, and ESM adoption are blocked by current architecture seams.

## Goals

1. Convert repo to a root-managed single-package project. No workspaces.
2. Adopt WXT as the authoritative extension build system.
3. Migrate authored extension code to TypeScript and ESM.
4. Preserve Chrome and Firefox support throughout migration.
5. Keep test/build mostly green at the end of each phase.
6. Keep vendored libraries initially; replace later only if needed.
7. Keep `src/` temporarily during migration to reduce churn.

## Non-Goals

1. Replacing all vendored libraries with npm packages in this migration.
2. Rebuilding popup/options UI framework.
3. Redesigning HTML/CSS or changing visual behavior.
4. Changing product behavior except where needed for parity/fallback correctness.
5. Fully eliminating every JS file in the first migration phase.

## Constraints Inventory

1. Browser support is non-negotiable: Chrome + Firefox.
2. Test/build health should remain mostly green after each phase.
3. Existing vendored browser/runtime libs must stay for first pass.
4. Current source layout may remain under `src/` temporarily.
5. Firefox offscreen parity cannot be assumed; fallback path required.

## Discovery Summary

### Current architecture

1. `src/service-worker.js` is the main orchestrator for commands, context menus, messaging, downloads, offscreen lifecycle, notifications, and content-script injection.
2. `src/contentScript/contentScript.js` mixes DOM capture, link picker UI, page-prep logic, and page-context script loading.
3. `src/contentScript/pageContext.js` is a page-world bridge for MathJax and must remain injectable into page context.
4. `src/offscreen/offscreen.js` is a conversion engine for DOMParser, Readability, Turndown, clipboard, and blob/download handling.
5. `popup`, `options`, and `guide` pages rely on ordered script tags and global side effects.

### High-risk coupling patterns

1. Many shared files export via `globalThis.snipSnip*` rather than module imports.
2. `service-worker.js` depends on ordered `importScripts(...)` side effects.
3. Popup/options/offscreen HTML depend on strict script-load order.
4. Raw message contracts are stringly-typed and centralized.
5. Chrome/Firefox output differences are implemented via `src/scripts/generate-browser-manifests.js`.

### WXT-specific findings

1. WXT should become the source of truth for manifest/build output.
2. Page-context logic should stay as an explicitly injected unlisted/web-accessible script, not as a `MAIN`-world shortcut.
3. Offscreen should be treated as Chromium-first with explicit Firefox fallback.
4. Firefox MV3 must be explicit in migration validation; do not rely on defaults.

## Solution Space

### Option A: Big-bang rewrite

Flatten repo, adopt WXT, rewrite all JS to TS/ESM, move all files, and replace build system in one pass.

Rejected because:

1. Too much blast radius.
2. High risk of losing browser parity.
3. Violates keep-green-per-phase requirement.

### Option B: Phased parity-first migration

Flatten root ownership first, introduce WXT shell, migrate shared code bottom-up, then migrate runtime entrypoints and pages, then remove old build paths.

Chosen because:

1. Contains risk.
2. Preserves browser/test/build feedback loops.
3. Creates stable checkpoints.

### Option C: Tooling-only migration

Root package + WXT only, leaving most architecture/global patterns intact.

Rejected because:

1. Does not deliver full TS/ESM migration.
2. Leaves current architecture debt in place.
3. Delays the hard part instead of structuring it.

## Recommendation

Use a phased parity-first migration with these hard rules:

1. Root becomes the only package manager/build/test entrypoint first.
2. WXT build parity lands before deleting old build machinery.
3. Shared pure modules migrate to TS/ESM before runtime-heavy pages.
4. Page-context injection remains an explicit injected script.
5. Offscreen gets a browser-gated implementation with Firefox fallback.
6. Delete legacy manifest-generation/build code only after parity verification.

## Target Structure

Short-term target:

```txt
root/
├─ package.json
├─ bunfig.toml
├─ tsconfig.json
├─ wxt.config.ts
├─ public/
├─ src/
│  ├─ entrypoints/
│  │  ├─ background.ts
│  │  ├─ content.ts
│  │  ├─ page-context.ts
│  │  ├─ offscreen.html
│  │  ├─ offscreen.ts
│  │  ├─ popup.html
│  │  ├─ options.html
│  │  └─ guide.html
│  ├─ lib/
│  ├─ popup/
│  ├─ options/
│  ├─ guide/
│  ├─ contentScript/
│  ├─ offscreen/
│  ├─ shared/
│  └─ tests/
└─ specs/
```

Notes:

1. `src/` stays temporarily.
2. Existing assets can remain in place until consumed through WXT entrypoints/public assets.
3. `shared/` may later be folded into `lib/`, but not during first structure cut.

## Entrypoint Mapping

| Current                                                       | Target                                                            |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| `src/service-worker.js`                                       | `src/entrypoints/background.ts`                                   |
| `src/contentScript/contentScript.js`                          | `src/entrypoints/content.ts`                                      |
| `src/contentScript/pageContext.js`                            | `src/entrypoints/page-context.ts`                                 |
| `src/offscreen/offscreen.html` + `src/offscreen/offscreen.js` | `src/entrypoints/offscreen.html` + `src/entrypoints/offscreen.ts` |
| `src/popup/popup.html` + `src/popup/popup.js`                 | `src/entrypoints/popup.html` + popup bootstrap module             |
| `src/options/options.html` + `src/options/options.js`         | `src/entrypoints/options.html` + options bootstrap module         |
| `src/guide/guide.html` + `src/guide/guide.js`                 | `src/entrypoints/guide.html` + guide bootstrap module             |

## Detailed Deliverables

### D1. Root package flattening

Effort: M
Depends on: -

Tasks:

1. Merge `src/package.json` into root `package.json`.
2. Remove root `workspaces` field.
3. Ensure all scripts run from root.
4. Move or retarget config references so Bun, Playwright, ESLint, and tests run from root cleanly.
5. Keep current runtime/build behavior unchanged in this deliverable.

Acceptance criteria:

1. There is only one active `package.json` for project tooling.
2. `bun test` runs from root.
3. Existing non-WXT build/test scripts still work from root.

### D2. WXT scaffold and manifest parity

Effort: L
Depends on: D1

Tasks:

1. Add WXT dependency and `wxt.config.ts`.
2. Configure root-managed WXT build using `src` as working source root.
3. Re-express current manifest fields in WXT config.
4. Preserve current permissions, host permissions, commands, icons, popup/options paths, and WAR behavior.
5. Add browser-conditioned manifest handling for Chrome vs Firefox.
6. Explicitly handle Firefox MV3 target validation.

Acceptance criteria:

1. WXT build emits a Chrome artifact with manifest parity to current build.
2. WXT build emits a Firefox artifact with equivalent behavior and required manifest differences.
3. `contentScript/pageContext.js` equivalent output is web-accessible and injectable.

### D3. Shared module TS/ESM conversion foundation

Effort: XL
Depends on: D2

Tasks:

1. Convert pure shared modules first to TS/ESM:
   - `count-utils`
   - `search-core`
   - `site-rules`
   - `popup-batch-utils`
   - `notifications`
   - `obsidian-utils`
   - `download-tracker`
2. Convert mostly pure modules next by replacing runtime `require` and global fallbacks with explicit imports or injected dependencies:
   - `template-utils`
   - `url-utils`
   - `library-export`
   - `options-state`
   - `library-state`
   - `agent-bridge-state`
   - `markdown-options`
3. Define core types for:
   - extension options
   - article/content payloads
   - download tracking state
   - agent bridge state
   - library state/export payloads
4. Remove `globalThis.snipSnip*` exports from converted modules.

Acceptance criteria:

1. Converted modules use `import`/`export` only.
2. No converted module requires `globalThis.snipSnip*` for normal operation.
3. Unit tests for converted modules still pass.

### D4. Background and messaging migration

Effort: XL
Depends on: D3

Tasks:

1. Convert `service-worker.js` into `background.ts`.
2. Move all extension API calls inside WXT-compatible runtime initialization.
3. Replace `importScripts(...)` ordering with explicit imported modules.
4. Extract message handling into typed message contracts and handlers.
5. Keep listener registration synchronous at module startup boundary.
6. Preserve current command, context-menu, notification, and download behavior.

Acceptance criteria:

1. Background entrypoint registers all listeners synchronously.
2. No behavior depends on `importScripts(...)` order.
3. Command handling and context menu flows work in Chrome and Firefox builds.

### D5. Content script and page-context migration

Effort: L
Depends on: D4

Tasks:

1. Convert content script into WXT content entrypoint.
2. Wrap runtime logic in a WXT-safe main flow.
3. Convert page-context bridge into explicit injectable script entrypoint.
4. Preserve MathJax/custom-event bridge behavior.
5. Preserve current DOM capture and link picker behavior.
6. Keep browser-aware injection strategy and error handling.

Acceptance criteria:

1. Content script loads on supported pages with existing behavior.
2. Page-context bridge injects successfully and remains web-accessible.
3. DOM capture and MathJax tagging still work end-to-end.

### D6. Offscreen migration with fallback

Effort: L
Depends on: D4

Tasks:

1. Convert offscreen doc to WXT entrypoint.
2. Gate Chromium offscreen behavior behind capability checks.
3. Preserve Firefox fallback path for environments without offscreen support.
4. Convert offscreen internals to ESM/TS incrementally while preserving vendored library wrappers.

Acceptance criteria:

1. Chromium build uses offscreen successfully.
2. Firefox build uses fallback path without crashing.
3. HTML-to-Markdown conversion behavior remains unchanged in regression tests.

### D7. Popup, options, and guide page migration

Effort: XL
Depends on: D3, D4, D5

Tasks:

1. Convert popup/options/guide bootstraps to TS/ESM entrypoint modules.
2. Preserve current HTML/CSS structure initially.
3. Replace script-order dependencies with explicit module imports.
4. Remove duplicate popup-local defaults in favor of shared typed source.
5. Convert options-search integration to imported modules instead of global bootstrap order.

Acceptance criteria:

1. Popup works with existing clipping, preview, batch, and agent flows.
2. Options page loads, restores, searches, imports, and exports correctly.
3. Guide page loads and theme/search features behave as before.

### D8. Legacy build-path removal

Effort: M
Depends on: D2, D4, D5, D6, D7

Tasks:

1. Delete custom manifest-generation/copy scripts once WXT parity is confirmed.
2. Remove raw-manifest build assumptions.
3. Remove obsolete workspace/build artifacts.
4. Update release/build scripts to use WXT outputs only.

Acceptance criteria:

1. WXT is the only extension packaging/build path.
2. No release flow depends on `generate-browser-manifests.js` or equivalent legacy copy logic.

### D9. Test and typecheck stabilization

Effort: L
Depends on: D3, D4, D5, D6, D7

Tasks:

1. Convert affected Bun tests from CommonJS assumptions to ESM/TS-compatible imports as needed.
2. Update path assumptions to WXT/root-managed layout.
3. Update Playwright to target WXT outputs.
4. Make root `typecheck` meaningful for migrated TS/ESM code.

Acceptance criteria:

1. `bun test` passes from root.
2. Playwright passes against WXT output or approved equivalent test target.
3. `bun run typecheck` passes for migrated code paths included in the active TS project.

## Ordering Summary

1. D1 Root flattening
2. D2 WXT scaffold and manifest parity
3. D3 Shared module TS/ESM conversion
4. D4 Background and messaging migration
5. D5 Content script and page-context migration
6. D6 Offscreen migration with fallback
7. D7 Popup/options/guide migration
8. D8 Legacy build-path removal
9. D9 Test and typecheck stabilization

## Trade-offs

### Chosen trade-offs

1. Keep `src/` temporarily instead of immediate file relocation.
   - Pros: less churn, easier diff review, lower risk.
   - Cons: slightly less idiomatic WXT structure short-term.

2. Keep vendored libs initially instead of replacing them during migration.
   - Pros: fewer moving parts, preserves behavior.
   - Cons: wrappers may be awkward; full modernization deferred.

3. Treat Firefox offscreen parity as fallback-based, not feature-identical.
   - Pros: realistic, cross-browser safe.
   - Cons: two runtime paths must be maintained.

4. Preserve HTML/CSS structure during entrypoint migration.
   - Pros: lowers UI regression risk.
   - Cons: page code may remain somewhat legacy until later cleanup.

## Risks and Mitigations

### Risk 1: Global/script-order breakage during page migration

Why it matters:

Popup, options, and offscreen currently depend on ordered globals and side-effect scripts.

Mitigation:

1. Convert shared modules first.
2. Convert page bootstraps last.
3. Keep page HTML largely unchanged during first module cut.

### Risk 2: Browser parity drift under WXT

Why it matters:

Current build encodes Chrome/Firefox differences manually, especially background/offscreen behavior.

Mitigation:

1. Diff generated manifests early.
2. Explicitly model browser-conditioned config in `wxt.config.ts`.
3. Validate Firefox MV3 explicitly.

### Risk 3: Test instability from CommonJS and path assumptions

Why it matters:

Tests currently rely on `require`, globals, and old file layout.

Mitigation:

1. Defer widespread test refactors until shared modules are stabilized.
2. Keep root-run Bun tests green at each phase.
3. Update test helpers incrementally alongside migrated modules.

### Risk 4: Vendored libraries resist ESM integration

Why it matters:

Turndown, Readability, highlight, moment, and browser polyfill are currently side-effect/global oriented.

Mitigation:

1. Wrap vendored libs rather than rewriting immediately.
2. Keep replacement of vendored libs out of scope for this spec.

## Acceptance Matrix

The migration is complete when all are true:

1. Root is the only project package/tooling owner.
2. WXT is the only build/package path.
3. Authored extension runtime code is TS/ESM-based.
4. Chrome and Firefox builds preserve current core behavior.
5. Page-context injection still works.
6. Offscreen has a supported Chrome path and a functioning Firefox fallback.
7. Bun tests pass from root.
8. Typecheck passes for the migrated active codebase.

## Open Questions

None for this spec draft. Future scope expansions should be treated separately:

1. Vendored library replacement.
2. UI framework adoption.
3. Post-migration structural cleanup beyond `src/` retention.
