const favoriteDeals = new Set();

export function hasFavoritedDeal(dealId) {
  if (!dealId) return false;
  return favoriteDeals.has(dealId);
}

export function markFavoritedDeal(dealId) {
  if (!dealId) return;
  favoriteDeals.add(dealId);
}

export function unmarkFavoritedDeal(dealId) {
  if (!dealId) return;
  favoriteDeals.delete(dealId);
}

export function toggleFavoritedDeal(dealId) {
  if (!dealId) return false;
  if (favoriteDeals.has(dealId)) {
    favoriteDeals.delete(dealId);
    return false;
  }
  favoriteDeals.add(dealId);
  return true;
}

export function getFavoritedDealIds() {
  return new Set(favoriteDeals);
}

export function resetFavoritedDeals() {
  favoriteDeals.clear();
}
