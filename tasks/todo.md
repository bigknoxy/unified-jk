# Demo Readiness - Audit + Admin Controls

## Checklist
- [x] Restate goal and acceptance criteria
- [x] Investigate and fix: admin cannot see Audit Dashboard
- [x] Investigate and fix: Sample App and API Explorer render as same app
- [x] Add manifest admin capabilities (update URL/settings, enable/disable app)
- [x] Add/adjust backend validation + authorization for admin manifest writes
- [x] Add/adjust shell + app UX for manifest admin workflow
- [x] Polish UI for professional auditor-facing demo quality
- [x] Run code simplification pass on changed areas
- [x] Run QA pass and fix issues found
- [x] Verify full end-to-end flows and capture evidence
- [x] Update docs for new admin workflow

## Finalization Pass (Requested)
- [x] Restate expanded goal + verification bar (full QA + browse + review + regressions)
- [x] Start all services and keep them running
- [x] Execute full /browse validation across key user workflows
- [x] Execute full /qa pass and collect defects
- [x] Perform code review on current diff and apply fixes
- [x] Define top 5 critical user workflows and add automated tests
- [x] Run full regression suite (tests + builds + lint where available)
- [x] Re-run /qa regression after fixes
- [x] Final sanity check that all services remain running

## Acceptance Criteria
- Admin user can see and open Audit Dashboard in shell navigation.
- Sample App and API Explorer are clearly distinct apps with distinct content and behavior.
- Admin can edit manifest URL/settings and can enable/disable apps through supported API + UI.
- Non-admin cannot perform manifest write operations.
- Audit dashboard and related surfaces look polished and demo-ready on desktop + mobile.
- Full happy-path demo flow is verified: login as admin, manage manifests, open both apps, view audit data.

## Working Notes
- Prior issue likely involved permission/header mismatch in manifest fetch filtering.
- API Explorer manifest currently points to sample index fallback route, likely causing same-app appearance.
- Manifest model currently lacks an enabled/disabled field.
- Top 5 workflows chosen for automation should cover permission gating, manifest writes, workflow correlation, dashboard filtering UX, and navigation integrity.
- Defect found during QA: shell nav did not live-refresh after App Manager enable/disable; fixed by propagating `manifests:version` shared-state signal and refreshing manifests in shell.

## Results
- Implemented manifest admin model + APIs (`enabled`, `settings`, partial `PATCH`) and enforced `admin:write` for manifest writes.
- Fixed app identity bug by pointing `api-explorer` to `sample-app/public/api-explorer.html`.
- Fixed admin dashboard visibility by refreshing manifests after auth/session changes and supporting admin `includeDisabled` fetch.
- Added admin UI in shell for live manifest editing + enable/disable and navigation filtering of disabled apps.
- Upgraded dashboard app UI and data rendering for demo polish and verified responsive behavior.
- Verified E2E flow with Playwright: admin login, manage apps, enable/disable, open Sample App, open API Explorer, open Audit Dashboard with event table data.
- Updated docs in `README.md` and `ADDING_APPS.md` for dashboard app startup, manifest schema, and admin registry endpoints.
- Added shell/app sync for manifest updates via `ShellClient.setState('manifests:version')` in admin manager and shared-state refresh handler in shell container.
- Added automated auth middleware tests in manifest registry to cover includeDisabled/read and write authorization paths.

## Demo Walkthrough Stabilization (In Progress)
- [x] Repro and isolate walkthrough mismatch and click-through failures
- [x] Fix walkthrough progression and app navigation alignment
- [x] Add focused regression tests for walkthrough state transitions
- [x] Run shell test/build/lint verification
- [x] Run end-to-end walkthrough validation in browser automation

### Working Notes (Demo Walkthrough)
- Root cause candidate: walkthrough step with `navigateTo` sets `activeAppId` but never mounts iframe, so user can land on blank content.
- UX mismatch candidate: walkthrough overlay currently lives only inside the demo page, so navigating away drops the guidance and breaks flow continuity.

### Results (Demo Walkthrough)
- Root cause confirmed: walkthrough step advanced internally but shell component was not subscribed to demo-controller state changes, so overlay stalled on Step 4.
- Root cause confirmed: `navigateTo` only set `activeAppId` and never called iframe mount path, causing blank/non-loading behavior.
- Fixed walkthrough by rendering overlay at shell-container level and wiring navigation through shared `handleNavigation` flow.
- Added completion behavior to return users to scenario picker, reset scenario state, and refresh app manifests.
- Added unit tests for demo-controller walkthrough progression and listener notifications.
- Verified flow end-to-end with Playwright script: Scenario launch -> Steps 1-5 -> dashboard iframe mounted -> back to scenarios.
