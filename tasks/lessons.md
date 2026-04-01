# Lessons

- 2026-03-31: Bug - nav did not reflect App Manager enable/disable until reload. Signal - QA showed API Explorer remained hidden after re-enable. Prevention rule - for registry-changing actions, emit cross-app invalidation signal (`manifests:version`) and have shell refetch manifests on shared-state update.
