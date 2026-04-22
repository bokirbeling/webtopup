# Learnings

- Task 1 scaffold uses a minimal `backend/` TypeScript workspace (`src/index.ts`, `tsconfig.json`, `eslint.config.mjs`, package scripts) to unblock Express bootstrap in the next task.
- Security hygiene: root `.env.example` intentionally uses placeholder-only values (`your_value_here`) for Supabase, Midtrans, and Digiflazz keys.
- Existing `.env` and `Frontend/webhook.md` contain sensitive legacy-like values, so verification was done with explicit pattern scans to ensure none were copied into `.env.example`.
- Task 2 bootstrap pattern works cleanly with current NodeNext+strict setup by keeping runtime code under `backend/src/` (`config/env.ts`, `app.ts`, `routes/health.ts`, `index.ts`) and preserving existing script conventions.
- Explicit `REQUIRED_ENV_KEYS` + typed parsing (`NODE_ENV`, `PORT`) gives deterministic fail-fast startup behavior and keeps `/health` independent from business services.
