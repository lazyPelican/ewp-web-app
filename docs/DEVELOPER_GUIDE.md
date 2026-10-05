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

### Installation Pricing

Fresh quotes carry `project.installationPricingVersion: 2`. New rooms use `install.method: "per_lf"`, with a category name in `install.type`. The admin-managed `pricing.installPerLF` table contains `{ name, rate }` rows in dollars per LF. An unconfigured table starts with Euro Style and Paint Grade categories, with blank rates for an admin to enter. Existing configured tables retain their categories. New quotes also allow `hourly` and `none`. Missing method/version fields retain legacy percentage/hourly behavior, including rooms added to existing quotes and duplicates.

Installation uses the sum of entered finishing LF when finishing is enabled, otherwise the cabinetry-derived finishing estimate. Apply the installation percentage adjustment and round up to $5. Browser and Edge Function use `supabase/functions/_shared/installation.js` for the same formula. Rate/category/footage requirements block quote completion and PDF issuance, but incomplete drafts can be saved.

Snapshots include `installPerLF` rates and `woodworkFinLF` factors for new per-LF rooms. Saved installation categories are reconstructed even if deleted from the current table. Deleted categories require keeping saved pricing or choosing a replacement before updating. No existing quotes are migrated.

Deploy `validate-quote` before releasing the frontend. The shared function directory also triggers the Edge Function deployment workflow. An admin must configure the new LF table before issuing per-LF quotes.

### QuickBooks Summary PDF

The Save/Send/Print Quote page includes a separate Summary for QuickBooks preview/download. It aggregates all rooms into Wood Products (cabinetry, upgrades and countertops), Finishing, Installation and Delivery. It shows subtotal, applicable tax and grand total, using the active saved pricing and the same installation/delivery/tax rules as the quote. This is a standalone PDF for manual entry, not a QuickBooks API integration or import file.

The app still stores deep quote details in `projects.data` JSON. Frequently queried fields such as total amount, bid date, contact name, and contractor name are also written to dedicated columns for reporting. Future normalization should be incremental: keep the JSON payload until equivalent relational tables are fully populated and tested.

The app is JavaScript-first. Use JSDoc or TypeScript for new complex utility modules where possible, but do not rename large React files to TypeScript without a planned migration and regression coverage.

## PR Checklist

- Pricing changes include tests.
- Quote save/email changes include server validation.
- Admin/security changes include RLS or Edge Function review.
- Documentation is updated when architecture or deployment steps change.
- No sample PDFs, local `.env`, `dist`, or `supabase/.temp` files are committed.
