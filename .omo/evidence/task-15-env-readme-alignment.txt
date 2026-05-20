Task 15 env/README alignment evidence

Alignment command result:
`ENV_README_ALIGNMENT_PASS groups=App runtime > Supabase > Midtrans > Digiflazz > Frontend keys=NODE_ENV,PORT,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,MIDTRANS_SERVER_KEY,MIDTRANS_API_BASE_URL,DIGIFLAZZ_USERNAME,DIGIFLAZZ_API_KEY,DIGIFLAZZ_API_BASE_URL,VITE_API_BASE_URL`

`.env.example` group order:
1. App runtime
2. Supabase
3. Midtrans
4. Digiflazz
5. Frontend

README environment section order:
1. App runtime
2. Supabase
3. Midtrans
4. Digiflazz
5. Frontend

Documented keys:
- `NODE_ENV`
- `PORT`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MIDTRANS_SERVER_KEY`
- `MIDTRANS_API_BASE_URL`
- `DIGIFLAZZ_USERNAME`
- `DIGIFLAZZ_API_KEY`
- `DIGIFLAZZ_API_BASE_URL`
- `VITE_API_BASE_URL`

Secret scan note:
- README uses placeholders and syntax examples only.
- No legacy secret value, Supabase JWT, Midtrans key, or Digiflazz key was copied into documentation.

Result: PASS.
