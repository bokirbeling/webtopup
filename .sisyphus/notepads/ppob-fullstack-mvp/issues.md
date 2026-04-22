# Issues

- `npm run typecheck` initially failed due TS6 deprecation (`moduleResolution=node10` via legacy `Node` alias). Resolved by switching to `NodeNext` module settings.
- `npm run lint` initially scanned generated `dist/` output and reported `no-undef` on `exports`. Resolved by scoping lint script to `src/**/*.ts`.
- Task 2 lint initially failed on `no-useless-escape` in `backend/src/config/env.ts` startup error string; fixed by removing unnecessary escaped quotes.
- Task 2 build initially failed because strict typing treated `process.env` keys as `string | undefined`; fixed with explicit undefined guards before NODE_ENV/PORT parsing.
