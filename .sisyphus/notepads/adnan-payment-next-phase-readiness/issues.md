
## 2026-05-14 - Task 1 local SQL validation limitation
- Supabase CLI is installed (2.90.0), but local DB lint could not connect to 127.0.0.1:54322 and psql is not installed, so live migration application/error-path insert checks were not executable in this environment.
