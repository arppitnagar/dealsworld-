const subscribedDeals = new Set();

export function hasSubscribedDeal(dealId) {
  if (!dealId) return false;
  return subscribedDeals.has(dealId);
}

export function markSubscribedDeal(dealId) {
  if (!dealId) return;
  subscribedDeals.add(dealId);
}

export function unmarkSubscribedDeal(dealId) {
  if (!dealId) return;
  subscribedDeals.delete(dealId);
}

export function resetSubscribedDeals() {
  subscribedDeals.clear();
}
