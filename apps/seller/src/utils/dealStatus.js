import { CircleCheck, CheckCheck, Clock, CircleX, TimerOff } from "lucide-react-native";
import { toDate } from "@dealsworld/shared";

// The five ways a seller's deals are grouped - shown as rows in the
// bottom-sheet status picker on the Deals tab (previously a horizontal chip
// row pinned under Dashboard's header).
export const STATUS_FILTERS = [
  { key: "active", label: "Active", icon: CircleCheck },
  { key: "pending", label: "Pending", icon: Clock },
  { key: "completed", label: "Completed", icon: CheckCheck },
  { key: "rejected", label: "Rejected", icon: CircleX },
  { key: "expired", label: "Expired", icon: TimerOff },
];

export function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export function getDealLifecycleStatus(deal) {
  const approvalStatus = String(
    deal?.approvalStatus || deal?.approval?.status || "",
  ).toLowerCase();
  const approved = deal?.approved === true;
  const approvedAt = deal?.approval?.approvedAt || deal?.approvedAt;
  const status = String(deal?.status || "").toLowerCase();
  const lifecycleStatus = String(deal?.lifecycleStatus || "").toLowerCase();
  const isAdminPublished =
    approvalStatus === "approved" || approved || Boolean(approvedAt);

  // Persisted terminal states (set by the backend - see expirySweep.js and
  // the complete/expire-early endpoints) take priority over the date-based
  // computation below, since a manually-early-expired deal's real expiry
  // date can still be in the future.
  if (status === "expired" || lifecycleStatus === "expired") return "expired";
  if (status === "completed") return "completed";
  if (approvalStatus === "rejected" || status === "rejected") {
    return "rejected";
  }
  if (isAdminPublished) return "active";
  return "pending";
}

export function getDealDisplayStatus(deal, nowMs = Date.now()) {
  const lifecycleStatus = getDealLifecycleStatus(deal);
  if (
    lifecycleStatus === "completed" ||
    lifecycleStatus === "rejected" ||
    lifecycleStatus === "expired"
  ) {
    return lifecycleStatus;
  }
  const expiryDate = toDate(deal?.expiresAt);
  const isExpired =
    expiryDate instanceof Date &&
    !Number.isNaN(expiryDate.getTime()) &&
    expiryDate.getTime() <= nowMs;
  if (isExpired) return "expired";
  return lifecycleStatus;
}

export function isDealThresholdMet(deal) {
  const currentJoins = Number(deal?.currentJoins ?? deal?.joinedUsers ?? 0);
  const minGroupSize = Math.max(1, Number(deal?.minGroupSize ?? deal?.minThreshold ?? 1));
  return (
    Boolean(deal?.thresholdReachedAt) ||
    (Number.isFinite(currentJoins) && currentJoins >= minGroupSize)
  );
}

// A campaign that ended (completed early, or simply expired) without ever
// reaching its minimum group size never ships - buyers who joined paid for
// a deal that won't be fulfilled and should be refunded. That's a different
// outcome from a deal that reached threshold and is now dispatching or
// already delivered, so it needs its own distinct status/messaging rather
// than reading as a plain "Completed" deal.
export function isUnsuccessfulDeal(deal, nowMs = Date.now()) {
  const displayStatus = getDealDisplayStatus(deal, nowMs);
  const ended = displayStatus === "completed" || displayStatus === "expired";
  return ended && !isDealThresholdMet(deal);
}

// categoryKey is one of STATUS_FILTERS' keys, or null/undefined for "All".
export function matchesStatusFilter(deal, statusKey, nowMs = Date.now()) {
  if (!statusKey) return true;
  return getDealDisplayStatus(deal, nowMs) === statusKey;
}

export function getStatusCount(deals, statusKey, nowMs = Date.now()) {
  if (!deals) return 0;
  return deals.filter((deal) => matchesStatusFilter(deal, statusKey, nowMs)).length;
}

export function getAllStatusCounts(deals, nowMs = Date.now()) {
  return STATUS_FILTERS.reduce((acc, filter) => {
    acc[filter.key] = getStatusCount(deals, filter.key, nowMs);
    return acc;
  }, {});
}

export function isDealOwnedBySeller(deal, ownership) {
  if (!deal || !ownership) return false;
  const idSet = ownership.ids || new Set();
  const nameSet = ownership.names || new Set();
  if (!idSet.size && !nameSet.size) return false;

  const idFields = [
    deal?.sellerId,
    deal?.vendorId,
    deal?.vendorid,
    deal?.legacySellerId,
    deal?.sellerCode,
    deal?.code,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (idFields.some((value) => idSet.has(value))) {
    return true;
  }

  const nameFields = [deal?.sellerName, deal?.sellerDisplayName, deal?.vendorName]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  return nameFields.some((value) => nameSet.has(value));
}

export function formatEndsIn(expiryMs, nowMs = Date.now()) {
  if (typeof expiryMs !== "number") return null;
  const diffMs = expiryMs - nowMs;
  if (diffMs <= 0) return "Ends soon";
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  if (days > 0) return `Ends in ${days}d`;
  if (hours > 0) return `Ends in ${hours}h`;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `Ends in ${Math.max(minutes, 1)}m`;
}

export function formatCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  if (numeric >= 1000000) {
    return `${(numeric / 1000000).toFixed(1)}m`;
  }
  if (numeric >= 1000) {
    return `${(numeric / 1000).toFixed(numeric >= 10000 ? 0 : 1)}k`;
  }
  return `${numeric}`;
}
