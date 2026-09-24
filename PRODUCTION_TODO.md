# Production TODO

Temporary decisions made during local development that need a second look
before a real production rollout. Update this list as new temporary
workarounds are added or resolved - don't let it go stale.

## Must revert / flip before production

- **Client-side polling is fully disabled.**
  `packages/shared/config/polling.js` exports `POLLING_ENABLED = false`.
  This was a temporary fix (2026-09-24) to stop the buyer app's 4-10s
  `refetchInterval` polls (deals list, joined deals, deliveries) from
  burning through the Firestore free-tier daily read quota during local
  testing - `GET /api/deals` over-fetches up to 1000 docs per call
  (`fetchLimit = min(limit * 5, 1000)` in `apps/backend/src/routes/deals.js`),
  so polling it every 4s could exhaust the entire 50k/day quota in
  minutes from a single open screen. Flip `POLLING_ENABLED` back to
  `true` once on a plan/scale where that's affordable again (see Blaze
  item below) - or reconsider the polling intervals themselves (e.g.
  much longer, or replaced with real-time listeners) rather than just
  re-enabling the old 4-10s values as-is.
  In the meantime, buyer screens rely on pull-to-refresh, the header
  refresh button, and refetch-on-focus/mount/reconnect instead.

- **Firestore background job intervals were widened**, in
  `apps/backend/.env` (gitignored): `EXPIRY_SWEEP_INTERVAL_MS=600000`
  (10 min, was 2 min) and `TYPESENSE_SYNC_INTERVAL_MS=60000` (1 min, was
  20s). Also a free-tier quota mitigation. Revisit once on Blaze -
  tighter intervals give more accurate expiry/search freshness.

## Known deferrals (not urgent, but tracked)

- **Firebase Spark -> Blaze upgrade**: deferred by explicit choice
  ("we will revisit later"). Estimated cost with the interval fixes in
  place: well under $1/month for solo-dev testing. Needed before real
  multi-user production traffic, since the free daily quota (50k reads)
  will not be enough. Set a Cloud Billing budget alert when upgrading.

- **City filtering uses Google Places / real geocoding**: currently
  city is a locally-sourced dropdown (unique values already used on
  deals), no external API. Planned to swap in Google Places Autocomplete
  for city selection at pan-India rollout - the `city`/`cityLower`
  fields were designed so this is a drop-in swap, not a rework.

- **City filter on `GET /api/deals` is Node-side, not a Firestore
  `.where()`**: avoids needing a new Firestore composite index right
  now. A real `cityLower ==` index + Firestore-side filter is a natural
  perf upgrade once city data is canonical at pan-India scale.

- **Field-projection response (`sanitizeDealForListResponse`) is built
  but not wired into `GET /api/deals`**: blocked on buyer/seller
  client-side search still depending on the full deal document shape.
  Wire in once search moves fully server-side.

- **Real cursor pagination for the buyer Deals screen**: deliberately
  kept full-fetch, since its New/Hot/Viewed/Joined category counts need
  to see every deal to stay accurate.

- **Load testing**: not done yet.

- **`sellerId+createdAt` Firestore index**: added to
  `firestore.indexes.json` for bookkeeping but not yet deployed
  (`firebase deploy --only firestore:indexes`) - low priority, no
  functional impact either way today.
