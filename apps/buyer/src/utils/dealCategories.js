import { Flame, Zap, Eye, Heart, Users, PackageCheck } from "lucide-react-native";
import { toDate } from "@dealsworld/shared";

// The six ways a buyer can slice the deals feed - shown as pill filters on
// the Deals tab (previously a chip row on Home; moved here so Home stays a
// short, fixed "New Deals" feed and Deals owns full-catalog browsing).
// "orders" is sourced differently from the rest (see DealsScreen.js) - it
// reads from useJoinedDeals(), not the active-only deals list, since its
// whole purpose is to stay reachable after a deal's campaign has ended.
export const STATUS_FILTERS = [
  { key: "new", label: "New", icon: Flame },
  { key: "hot", label: "Hot", icon: Zap },
  { key: "viewed", label: "Viewed", icon: Eye },
  { key: "favourite", label: "Favourite", icon: Heart },
  { key: "my", label: "Joined", icon: Users },
  { key: "orders", label: "My Orders", icon: PackageCheck },
];

export function getExpiryMs(deal) {
  const expiresAtDate = toDate(deal?.expiresAt);
  const expiryTimeDate = toDate(deal?.expiryTime);
  const expiresAtMs =
    expiresAtDate instanceof Date && !Number.isNaN(expiresAtDate.getTime())
      ? expiresAtDate.getTime()
      : null;
  const expiryTimeMs =
    expiryTimeDate instanceof Date && !Number.isNaN(expiryTimeDate.getTime())
      ? expiryTimeDate.getTime()
      : null;

  if (expiresAtMs) return expiresAtMs;
  return expiryTimeMs || null;
}

export function getJoinCount(deal) {
  const joinCountRaw = deal?.currentJoins ?? deal?.joinedUsers ?? 0;
  return Number.isFinite(Number(joinCountRaw)) ? Number(joinCountRaw) : 0;
}

export function getMinGroupSize(deal) {
  const minGroupSizeRaw = deal?.minGroupSize ?? deal?.minThreshold ?? 0;
  return Number.isFinite(Number(minGroupSizeRaw)) ? Number(minGroupSizeRaw) : 0;
}

export function isHotDeal(deal) {
  const minGroupSize = getMinGroupSize(deal);
  if (!minGroupSize) return false;
  const joinCount = getJoinCount(deal);
  return joinCount / minGroupSize >= 0.8;
}

// Pickup deals never enter the payment-hold flow (see apps/backend/src/routes/deals.js
// POST /pay), so they never show a Pay button and never affect Joined/My Orders
// placement through payment - only through the campaign itself ending.
export function isPickupDeal(deal) {
  return /pick/i.test(String(deal?.deliveryMode || ""));
}

// A deal is worth showing anywhere in the buyer app once it's neither
// expired nor marked completed. Persisted terminal states (set by the
// backend - see apps/backend/src/expirySweep.js and the complete/expire-early
// endpoints) are checked first, since a manually-early-expired deal's real
// expiry date can still be in the future.
export function isDealActive(deal, now = Date.now()) {
  const status = String(deal?.status || deal?.lifecycleStatus || "").toLowerCase();
  if (status === "expired" || status === "completed") return false;
  const expiryMs = getExpiryMs(deal);
  const isExpired = typeof expiryMs === "number" ? expiryMs <= now : true;
  return !isExpired;
}

// The flip side of isDealActive - a joined deal belongs in "My Orders" once
// its campaign has ended (completed, or simply expired), which is exactly
// when it drops out of every other tab.
export function isPastCampaign(deal, now = Date.now()) {
  return !isDealActive(deal, now);
}

// True once the buyer has paid (held/released/refunded - anything but the
// default "unpaid"). Paying moves a deal into "My Orders" immediately, even
// while its campaign is still open for other buyers - see isDealOrder below.
export function isDealPaid(dealId, deliveries) {
  const entry = dealId ? deliveries?.[dealId] : null;
  const status = String(entry?.paymentStatus || "unpaid").toLowerCase();
  return status !== "unpaid";
}

// A joined deal belongs in "My Orders" once either its campaign has ended
// (isPastCampaign) or the buyer has paid for it - paying is a stronger,
// earlier signal than the campaign concluding, so it takes the deal out of
// the "still deciding whether to join" Joined tab right away.
export function isDealOrder(deal, deliveries, now = Date.now()) {
  return isPastCampaign(deal, now) || isDealPaid(deal?.id, deliveries);
}

export function isDealThresholdMet(deal) {
  const currentJoins = getJoinCount(deal);
  const minGroupSize = getMinGroupSize(deal);
  return Boolean(deal?.thresholdReachedAt) || (minGroupSize > 0 && currentJoins >= minGroupSize);
}

// A campaign that ended without ever reaching its minimum group size never
// ships - a buyer who joined paid for a deal that won't be fulfilled and
// should expect a refund, which is a different outcome from one that
// reached threshold and is now dispatching or already delivered.
export function isUnsuccessfulDeal(deal, now = Date.now()) {
  return isPastCampaign(deal, now) && !isDealThresholdMet(deal);
}

// categoryKey is one of STATUS_FILTERS' keys, or null/undefined for "All".
// Each category is mutually exclusive with the ones "above" it in
// STATUS_FILTERS (e.g. a joined deal no longer counts as "favourite"), so a
// deal lands in exactly one bucket - matching the buyer's mental model of
// New -> Hot -> Viewed -> Favourite -> Joined.
export function matchesCategory(deal, categoryKey, sets = {}) {
  const { favoriteIds, viewedIds, joinedIds, deliveries } = sets;
  const isViewed = Boolean(viewedIds?.has(deal.id));
  const isSubscribed = Boolean(joinedIds?.has(deal.id));
  const isFavorite = Boolean(favoriteIds?.has(deal.id));

  switch (categoryKey) {
    case "new":
      return !isViewed && !isSubscribed && !isFavorite;
    case "hot":
      return isHotDeal(deal);
    case "viewed":
      return isViewed && !isFavorite && !isSubscribed;
    case "favourite":
      return isFavorite && !isSubscribed;
    case "my":
      // Once paid, the deal belongs in "My Orders" instead, even while the
      // campaign is still open for other buyers.
      return isSubscribed && !isDealPaid(deal?.id, deliveries);
    default:
      return true;
  }
}

export function getCategoryCount(deals, categoryKey, sets, now = Date.now()) {
  if (!deals) return 0;
  return deals.filter(
    (deal) => isDealActive(deal, now) && matchesCategory(deal, categoryKey, sets),
  ).length;
}

export function getAllCategoryCounts(deals, sets, now = Date.now()) {
  return STATUS_FILTERS.reduce((acc, filter) => {
    acc[filter.key] = getCategoryCount(deals, filter.key, sets, now);
    return acc;
  }, {});
}

export function formatEndsIn(expiryMs) {
  if (typeof expiryMs !== "number") return null;
  const diffMs = expiryMs - Date.now();
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

export function getDealAccentColor({ isJoined, isFavorite, isViewed, isHot, theme }) {
  if (!theme?.colors) return null;
  if (isJoined) return theme.colors.success;
  if (isFavorite) return theme.colors.danger;
  if (isViewed) return theme.colors.primary;
  if (isHot) return theme.colors.purple;
  return theme.colors.warningBright;
}
