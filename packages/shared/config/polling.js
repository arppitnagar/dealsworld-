// Temporary kill switch for client-side polling (React Query
// `refetchInterval`s). Every poll tick re-reads Firestore through the
// backend regardless of whether anything changed, and was a real
// contributor to hitting the Firestore free-tier daily read quota (see
// apps/backend/src/expirySweep.js / typesenseSync.js for the backend-side
// half of that same fix). Held off entirely until production - screens
// rely on pull-to-refresh, an explicit refresh button, and the existing
// refetchOnWindowFocus/refetchOnMount/refetchOnReconnect triggers instead,
// which only fire on real app-lifecycle events rather than a fixed timer.
//
// Flip this back to `true` when going to production.
export const POLLING_ENABLED = false;
