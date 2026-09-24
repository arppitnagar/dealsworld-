import { englishT } from "../i18n/translator";

// Platform fee is a flat 0.25% of the base price, applied the same way to
// every deal - not seller-editable, unlike GST and delivery charges.
export const PLATFORM_FEE_PERCENT = 0.25;

export const PAID_DELIVERY_MODE = "Paid Home Delivery";

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Computes the itemized price breakup a seller configures on a deal and a
 * buyer sees (read-only) before paying. `basePrice` is the deal price the
 * buyer pays (deal.discountPrice) - GST and the platform fee are both
 * percentages of that base price, delivery is only charged when the deal's
 * delivery mode is paid home delivery.
 */
export function calculatePriceBreakup({
  basePrice,
  gstPercent,
  deliveryMode,
  deliveryCharge,
} = {}) {
  const base = Math.max(0, Number(basePrice) || 0);
  const gstPct = Math.max(0, Number(gstPercent) || 0);
  const gstAmount = round2((base * gstPct) / 100);
  const isPaidDelivery = String(deliveryMode || "").trim() === PAID_DELIVERY_MODE;
  const deliveryAmount = isPaidDelivery ? Math.max(0, Number(deliveryCharge) || 0) : 0;
  const platformFee = round2((base * PLATFORM_FEE_PERCENT) / 100);
  const total = round2(base + gstAmount + deliveryAmount + platformFee);

  return {
    basePrice: base,
    gstPercent: gstPct,
    gstAmount,
    isPaidDelivery,
    deliveryCharge: deliveryAmount,
    platformFeePercent: PLATFORM_FEE_PERCENT,
    platformFee,
    total,
  };
}

// A deal opts into dynamic group pricing by setting `pricingTiers` - an
// ordered, contiguous list of { minBuyers, maxBuyers, price }, where only the
// last tier may leave maxBuyers null (open-ended). A deal with no tiers (or
// an empty list) just uses its flat discountPrice, so every caller of
// resolveTierPrice works unchanged for deals that never touch this feature.
export const MAX_PRICING_TIERS = 5;

function normalizeTierList(tiers) {
  return Array.isArray(tiers) && tiers.length ? tiers : null;
}

// Index of the tier active at `count` buyers - a plain 0 (nobody joined
// yet) sits below every tier's minBuyers (tier 1 always starts at 1), so it
// resolves to tier 1 rather than an unmatched -1; anything else always
// matches exactly one tier since the list is contiguous and the last tier
// is open-ended.
function tierIndexAt(tiers, count) {
  const matched = tiers.findIndex((t) => {
    const min = Number(t?.minBuyers);
    const max = t?.maxBuyers === null || t?.maxBuyers === undefined ? null : Number(t.maxBuyers);
    return count >= min && (max === null || count <= max);
  });
  return matched !== -1 ? matched : 0;
}

/** The live price for a deal at a given headcount. */
export function resolveTierPrice(deal, joinCount) {
  const tiers = normalizeTierList(deal?.pricingTiers);
  const basePrice = Math.max(0, Number(deal?.discountPrice) || 0);
  if (!tiers) return basePrice;
  const count = Math.max(0, Number(joinCount) || 0);
  const tier = tiers[tierIndexAt(tiers, count)];
  const price = Number(tier?.price);
  return Number.isFinite(price) && price > 0 ? price : basePrice;
}

/**
 * The next cheaper tier a buyer would unlock by bringing in more people, and
 * how many more are needed - the data behind a "Join 3 more to unlock ₹X"
 * nudge. Returns null once there's no cheaper tier left to reach (already at
 * the last tier, or the deal isn't tiered at all).
 */
export function getNextTierInfo(deal, joinCount) {
  const tiers = normalizeTierList(deal?.pricingTiers);
  if (!tiers || tiers.length < 2) return null;
  const count = Math.max(0, Number(joinCount) || 0);
  const nextTier = tiers[tierIndexAt(tiers, count) + 1];
  if (!nextTier) return null;
  const nextPrice = Number(nextTier.price);
  if (!Number.isFinite(nextPrice)) return null;
  return {
    nextPrice,
    buyersNeeded: Math.max(0, Number(nextTier.minBuyers) - count),
  };
}

/**
 * Shape rules for a seller-submitted tier list, mirrored by the
 * isValidPricingTiers check in firestore.rules (that's the actual
 * enforcement for direct client writes - this is for immediate form
 * feedback). Returns null when valid, otherwise a user-facing message
 * naming the first problem found.
 */
// `t` is useI18n()'s translator; English when omitted.
export function validatePricingTiers(tiers, t = englishT) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return t("tierErrors.required");
  }
  if (tiers.length > MAX_PRICING_TIERS) {
    return t("tierErrors.tooMany", { max: MAX_PRICING_TIERS });
  }
  if (Number(tiers[0]?.minBuyers) !== 1) {
    return t("tierErrors.firstStart");
  }
  for (let i = 0; i < tiers.length; i += 1) {
    const tier = tiers[i];
    const min = Number(tier?.minBuyers);
    const max =
      tier?.maxBuyers === null || tier?.maxBuyers === undefined
        ? null
        : Number(tier.maxBuyers);
    const price = Number(tier?.price);
    if (!Number.isFinite(min) || min < 1) {
      return t("tierErrors.minPositive", { tier: i + 1 });
    }
    if (max !== null && (!Number.isFinite(max) || max < min)) {
      return t("tierErrors.maxGteMin", { tier: i + 1 });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return t("tierErrors.pricePositive", { tier: i + 1 });
    }
    if (i < tiers.length - 1) {
      if (max === null) {
        return t("tierErrors.onlyLastOpen", { tier: i + 1 });
      }
      const next = tiers[i + 1];
      if (Number(next?.minBuyers) !== max + 1) {
        return t("tierErrors.contiguous", { next: i + 2, tier: i + 1, start: max + 1 });
      }
      if (Number(next?.price) > price) {
        return t("tierErrors.nonIncreasing", { next: i + 2, tier: i + 1 });
      }
    }
  }
  return null;
}
