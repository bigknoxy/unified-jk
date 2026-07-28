# Lessons

- 2026-03-31: Bug - nav did not reflect App Manager enable/disable until reload. Signal - QA showed API Explorer remained hidden after re-enable. Prevention rule - for registry-changing actions, emit cross-app invalidation signal (`manifests:version`) and have shell refetch manifests on shared-state update.
- 2026-04-01: Bug - walkthrough UI stuck on previous step while internal state advanced. Signal - Playwright trace showed repeated "Step 4 of 5" text after multiple next clicks. Prevention rule - subscribe view components to controller/service state changes (`onChange` + `requestUpdate`) whenever state is stored outside Lit reactive fields.
