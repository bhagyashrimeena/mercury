# Navigation and confirmation resilience

## Scope

Additive patch for `bhagyashrimeena/mercury`, based on the reviewed game-day and My Games changes for `codex/mercury-mumbai-ux-2026-11-05` (original remote base `a607481849edd63c0fdf3f286fe582c9b6cd874a`). This patch does not change authentication configuration, infrastructure, data models or live services.

## What changed

- Every route visit receives its own generation. A delayed API response from an older visit cannot replace the latest event page, even after returning to the same URL or refreshing it without changing the path.
- Back, Forward and other route transitions dismiss open dialogs before rendering the new page. Stale route completions do not move focus or scroll.
- A superseded public-page session request cannot overwrite a current signed-in session with the guest fallback.
- Superseded request results do not display a misleading navigation-error toast or focus a detached form.
- Dismissed or replaced confirmation buttons cannot submit. Rapid confirmation repeats send only one request. An older success or failure cannot close or write into a newer dialog.

The request guard ignores obsolete UI results. It does **not** undo a mutation already submitted to the server. Closing a dialog after confirmation does not cancel that submitted operation.

## Verification

- Reproduced four navigation failures against the baseline before applying the fix.
- Seven new Node regression tests exercise the real application modules using controlled DOM/network fixtures.
- Passed 68 tests across domain, events, catalogue, API, event details, game-day, My Games, navigation and site-config suites.
- Passed the repository's aggregate `npm run check` syntax check and the new test's syntax check.
- Independent review found no blocking or important findings; the reviewer reran 23 relevant tests and syntax checks. A final formatting-only cleanup was followed by the full 68-test focused run.
- Patch application was checked against a copy of the exact reviewed My Games baseline, with byte-for-byte comparison after applying.

## Remaining release gates

- The full `npm test` attempt ran 68 passing tests but could not load the PostgreSQL schema test because `@electric-sql/pglite` is not installed in this source snapshot. This is not a full test pass.
- Lint, typecheck and build were attempted but could not run: `eslint`, `tsc` and `next` are absent. A dependency-equipped complete checkout is required.
- Browser launch was attempted with the existing synthetic local game-day fixture. Chromium failed before opening a page because its process socket operation is not permitted in this executor; an approved outside-sandbox retry failed at the same operation. No visual, responsive, login or end-to-end browser pass is claimed.
- Integration with the separate authentication patch, hosted sign-in, exact remote CI and final browser QA remain to be completed in an authorized environment.

No commit, push, deployment, live Supabase access or credential changes were performed. Apply the narrow patch after the reviewed game-day and My Games patches; do not replace unrelated files from this source snapshot.
