
- 2026-05-15: Official Digiflazz pages were mirrored through cached extractor fetches because the combined output was too large for one response window. Large pages were re-fetched individually to preserve request, response, and webhook details without truncation.
- 2026-05-15: The fetched `cek-status` page content exposed warnings and request guidance only. No separate response block appeared in the captured official content used for this mirror, so the local page documents that limitation rather than inventing a response shape.

- 2026-05-15: Local shell did not have `rg` available, so duplicate Digiflazz logic search was completed with workspace search tooling limited to backend TypeScript files.
- 2026-05-15: Manual tsx HTTP driver must run from `backend/` or use absolute imports; temp scripts outside the backend cwd cannot resolve relative `./src/*` imports. Top-level await also fails under the current CommonJS tsx transform, so manual drivers should wrap async code in `main()`.

- 2026-05-15: Backend Jest still emits the existing ts-jest TS151002 hybrid module warning during non-silent runs, but focused and full suites pass; no Task 4 blocker.

- 2026-05-15: g remains unavailable in the local PowerShell environment, so repository searches for Task 5 used workspace search tooling instead of ripgrep.

- 2026-05-15: After source branding changes, the only remaining `BayarKu` match is generated deploy output at `deploy-adnanpay/frontend/dist/index.html`; source/frontend tests/docs are clean and deploy output should be regenerated during deployment.
## 2026-05-15 Task 8 deployment blockers
adnanpay-natanetwork MCP still cannot parse encrypted OpenSSH key without passphrase; direct SSH fallback works. Remote Supabase migrations for postpaid/email verification were applied via Supabase MCP and advisors are clean. Public adnanpay.com still serves older BayarKu frontend until GitHub deploy/pull runs.
