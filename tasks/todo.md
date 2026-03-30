# Shell Handshake Bug Fix

## Checklist
- [x] Restate goal and acceptance criteria
- [x] Inspect `sdk/shell-client.js` handshake path for root cause
- [x] Implement minimal fix for `this._handleShellInit is not a function`
- [x] Harden `_waitForShellInit` only if tiny and safe
- [x] Run focused verification checks
- [x] Record results and resolution status
- [x] Extend this plan with iframe-load and ACK-timeout requirements
- [x] Remove stale ACK-on-ACK timeout paths in SDK/shell messaging
- [x] Fix shell `sendNack` target-origin handling
- [x] Reduce noisy false ACK timeout behavior while keeping minimal architecture changes
- [x] Add SDK cache-busting update for sample app and API explorer
- [x] Verify in-browser flow: login as Dave, open Sample App and API Explorer in shell iframe, interact in both
- [x] Collect console evidence and confirm no `_handleShellInit is not a function`, `Timeout waiting for SHELL_INIT`, `Message ACK timeout`, or uncaught shell-client promise errors
- [x] Run targeted verification commands and capture outcomes

## Acceptance Criteria
- Browser message handler no longer calls instance methods through incorrect `this` context.
- `SHELL_INIT` handling completes reliably without false timeout when init payload user is null/empty.
- Changes are limited to minimal required files.
- Verification commands and outcomes are captured below.
- Shell can open both Sample App and API Explorer with correct content inside the shell iframe.
- No repeated SDK ACK-timeout noise appears during the required login + app-switch + interaction flow.

## Working Notes
- Reported errors: `Uncaught TypeError this._handleShellInit is not a function` then `Timeout waiting for SHELL_INIT`.
- Root cause confirmed: message event listener uses `function` callback but switch dispatch called instance methods via `this` instead of captured `self`.
- Fragility confirmed: `_waitForShellInit` used `this.user !== null` as init completion signal, which fails for valid unauthenticated/null user init payloads.

## Results
- Files changed: `sdk/shell-client.js`, `tasks/todo.md`.
- Verification commands run:
  - `node --check sdk/shell-client.js` (pass)
  - `npm run --silent lint` in `shell/` (failed: no ESLint config file found)
  - `npm run --silent test -- --run` in `shell/` (no test files; exits 1)
- Resolution status: expected to resolve reported handshake failure by fixing handler context and waiting on explicit shell-init receipt rather than user-null heuristics.
- Additional files changed: `shell/src/services/message-handler.ts`, `sample-app/public/index.html`, `sample-app/public/api-explorer.html`.
- Additional handshake fixes:
  - Removed SDK ACK-on-ACK path for incoming `SHELL_INIT` to prevent stale ACK chatter.
  - Fixed `sendNack` to use computed `targetOrigin` (`*` for sandboxed null origin) instead of raw origin.
  - Increased SDK ACK timeout window from 500ms to 2000ms and hardened pending ACK cleanup to avoid false timeout/retry noise.
  - Bumped SDK script cache-busting query in both Sample App and API Explorer to `v=10`.
- Browser flow verification (gstack browse, `http://localhost:8888`):
  - Cleared session storage, clicked Sign in, selected Dave (Developer).
  - Opened Sample App from shell nav; iframe context confirmed at `http://localhost:8886/index.html`.
  - In Sample App, executed shared-state interaction and saw `✅ Saved: "verifyKey" = "verifyValue"`.
  - Opened API Explorer from shell nav; iframe context confirmed at `http://localhost:8886/api-explorer.html`.
  - In API Explorer, executed endpoint test and saw manifest JSON response with `sample-app` and `api-explorer` entries.
  - Confirmed shell iframe state after flow: `app-api-explorer` visible, `app-sample-app` hidden, both with expected src URLs.
- Console evidence for required error checks:
  - No occurrences of `_handleShellInit is not a function`.
  - No occurrences of `Timeout waiting for SHELL_INIT`.
  - No occurrences of `Message ACK timeout`.
  - No uncaught promise errors from shell-client during the verified flow.
- Additional targeted verification commands run:
  - `npm run --silent build` in `shell/` (failed due to pre-existing TypeScript issues unrelated to these edits).
