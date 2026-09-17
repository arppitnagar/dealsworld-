// Free-text search matching shared between Home's "New Deals" feed and the
// Deals tab's category-filtered list, so both screens search deals the same
// way.
export function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s]+/g, " ")
    .trim();
}

export function buildSearchHaystack(deal) {
  const parts = [];
  const visited = new Set();

  const visit = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value === "string") {
      parts.push(value);
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      parts.push(String(value));
      return;
    }
    if (value instanceof Date) {
      parts.push(value.toISOString());
      return;
    }
    if (typeof value?.toDate === "function") {
      const date = value.toDate();
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        parts.push(date.toISOString());
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === "object") {
      if (visited.has(value)) return;
      visited.add(value);
      Object.values(value).forEach(visit);
    }
  };

  visit(deal);
  return parts.join(" ");
}

export function searchMatchesDeal(deal, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const haystack = buildSearchHaystack(deal).toLowerCase();
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}
