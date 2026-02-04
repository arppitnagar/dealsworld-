const viewedDeals = new Set();

export function hasViewedDeal(dealId) {
  if (!dealId) return false;
  return viewedDeals.has(dealId);
}

export function markViewedDeal(dealId) {
  if (!dealId) return;
  viewedDeals.add(dealId);
}

export function resetViewedDeals() {
  viewedDeals.clear();
}
