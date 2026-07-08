# EWP Quote App Developer Guide

## Required Release Checks

Run these before every deploy:

```powershell
npm test -- --run
npm run build
git diff --check
```

For Supabase changes, also verify:

```powershell
npm exec --yes supabase@latest -- functions deploy validate-quote
```

Apply `supabase/hardening.sql` in Supabase SQL Editor whenever it changes.

## Core Rules

- Quote calculations must receive an explicit pricing table. Do not reintroduce mutable module-level pricing state.
- Saved quotes must keep their pricing snapshot unless the user explicitly chooses to update pricing.
- Authenticated quote saves and client emails must pass `validate-quote` server validation.
- Key business actions should write to `audit_logs` through `recordAuditEvent`.
- Timer starts must check for an existing running `time_entries` row and resume it rather than creating a duplicate.
- Keep generated PDF samples and local Supabase temp files out of git.

## Important Files

- `src/appUtils.js`: calculation helpers and shared quote utilities.
- `src/pricingSnapshots.js`: snapshot capture, restoration, and price-change detection.
- `src/quoteIntegrity.js`: client payload builder and Edge Function validation wrapper.
- `src/quoteValidation.js`: local quote payload validation.
- `src/auditLog.js`: fail-open audit logging helper.
- `src/TimeTracker.jsx` and `src/timeTrackerUtils.js`: time tracking UI and tested timer helpers.
- `supabase/functions/validate-quote/index.ts`: server-side quote total validation.
- `supabase/hardening.sql`: RLS, audit logs, reporting columns, and timer uniqueness.

## Architecture Notes

The app still stores deep quote details in `projects.data` JSON. Frequently queried fields such as total amount, bid date, contact name, and contractor name are also written to dedicated columns for reporting. Future normalization should be incremental: keep the JSON payload until equivalent relational tables are fully populated and tested.

The app is JavaScript-first. Use JSDoc or TypeScript for new complex utility modules where possible, but do not rename large React files to TypeScript without a planned migration and regression coverage.

## PR Checklist

- Pricing changes include tests.
- Quote save/email changes include server validation.
- Admin/security changes include RLS or Edge Function review.
- Documentation is updated when architecture or deployment steps change.
- No sample PDFs, local `.env`, `dist`, or `supabase/.temp` files are committed.
