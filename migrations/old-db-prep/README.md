# Prepare the OLD database to back the new app

This makes the **old peps_affiliate database** able to also serve the new app,
so both share one live dataset (the app reads/writes the same `User` /
`DiscountCode` / `Order` / `OrderCommission` / `CommissionSplit` / `Payout`
tables the old system uses).

`01_prepare_old_db.sql` is **additive and idempotent** — it does not alter or
drop anything the old system depends on, so the old backend keeps running
unchanged. It:

1. Adds the columns the app needs to `"User"` (username, names, account status,
   email-verified, password-reset / OTP / 2FA fields, consent timestamps).
2. Backfills a unique `username` for existing users (from the email local-part).
3. Creates the app-only tables: `sessions`, `vendor_profiles` (merchants),
   `audit_logs`, `notifications`, and the redesigned `reviews` /
   `conversations` / `messages` (attached to creator↔merchant, since offers and
   applications are being removed).

All new ids are `text` and all foreign keys reference `"User"(id)` /
`vendor_profiles(id)`, matching the old DB's text-id convention.

## Notes
- **Role values are mapped in app code, not here.** The old `"User".role` enum
  (`AFFILIATE` / `ADMIN` / `SUPER_ADMIN`) stays as-is; the app treats
  `AFFILIATE` as the affiliate/creator role so shared data stays consistent.
- `passwordHash` and `active` are reused by the app (mapped to `password` and
  `accountStatus`); no duplicate columns are added.
- Run it against the old DB once before pointing the app's `DATABASE_URL` there.

## Validation
Verified locally against a fresh load of the production dump (the 6 old tables):
the script applies cleanly, is safe to re-run, and yields all 13 tables with
usernames backfilled (69 users → 69 unique usernames, 0 null).
