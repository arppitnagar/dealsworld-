import { toDate } from "./dateTime";

export const DEAL_SORT_FIELDS = [
  { key: "title", label: "Deal title" },
  { key: "price", label: "Deal price" },
  { key: "location", label: "Location" },
  { key: "vendor", label: "Vendor" },
  { key: "category", label: "Deal category" },
  { key: "deliveryMode", label: "Delivery mode" },
  { key: "expiration", label: "Expiration" },
  { key: "joinedUsers", label: "Joined users" },
  { key: "requiredUsers", label: "Required users" },
];

export const DEAL_FILTER_FIELDS = [
  ...DEAL_SORT_FIELDS,
  { key: "status", label: "Status" },
];

export function normalizeDealFilterText(value) {
  return String(value || "").toLowerCase().trim();
}

function toNumeric(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeNumericQuery(query) {
  return String(query || "")
    .trim()
    .replace(/[,\s₹$]/g, "");
}

function parseNumericRule(query) {
  const normalized = normalizeNumericQuery(query);
  if (!normalized) return null;

  let match = normalized.match(/^(-?\d+(?:\.\d+)?)\-(-?\d+(?:\.\d+)?)$/);
  if (match) {
    const min = Number(match[1]);
    const max = Number(match[2]);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { type: "range", min: Math.min(min, max), max: Math.max(min, max) };
    }
  }

  match = normalized.match(/^(-?\d+(?:\.\d+)?)\+$/);
  if (match) {
    const min = Number(match[1]);
    if (Number.isFinite(min)) return { type: "gte", value: min };
  }

  match = normalized.match(/^(<=|>=|<|>)(-?\d+(?:\.\d+)?)$/);
  if (match) {
    const operator = match[1];
    const value = Number(match[2]);
    if (Number.isFinite(value)) return { type: operator, value };
  }

  return null;
}

function matchesNumericQuery(value, query, mode = "contains") {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return false;

  const parsedRule = parseNumericRule(query);
  if (parsedRule) {
    switch (parsedRule.type) {
      case "range":
        return numericValue >= parsedRule.min && numericValue <= parsedRule.max;
      case "gte":
      case ">=":
        return numericValue >= parsedRule.value;
      case "<=":
        return numericValue <= parsedRule.value;
      case ">":
        return numericValue > parsedRule.value;
      case "<":
        return numericValue < parsedRule.value;
      default:
        break;
    }
  }

  const normalizedQuery = normalizeDealFilterText(query);
  const numericQuery = Number(normalizedQuery);
  if (Number.isFinite(numericQuery) && mode === "equals") {
    return numericValue === numericQuery;
  }
  return String(numericValue).includes(normalizedQuery);
}

function getExpiryMs(deal) {
  const date = toDate(deal?.expiresAt ?? deal?.expiryTime);
  return date instanceof Date && !Number.isNaN(date.getTime())
    ? date.getTime()
    : 0;
}

function getJoinedUsers(deal) {
  return toNumeric(deal?.currentJoins ?? deal?.joinedUsers);
}

function getRequiredUsers(deal) {
  return toNumeric(deal?.minGroupSize ?? deal?.minThreshold);
}

export function getDealFieldLabel(fieldKey, fields = DEAL_FILTER_FIELDS) {
  return fields.find((field) => field.key === fieldKey)?.label || fieldKey;
}

export function getDealFieldValue(deal, field, options = {}) {
  const { getStatusValue } = options;
  switch (field) {
    case "title":
      return normalizeDealFilterText(deal?.title);
    case "price":
      return toNumeric(deal?.discountPrice ?? deal?.price);
    case "location":
      return normalizeDealFilterText(deal?.location);
    case "vendor":
      return normalizeDealFilterText(
        deal?.vendorName || deal?.sellerId || deal?.vendorId || deal?.vendorid,
      );
    case "category":
      return normalizeDealFilterText(deal?.category);
    case "deliveryMode":
      return normalizeDealFilterText(deal?.deliveryMode);
    case "expiration":
      return getExpiryMs(deal);
    case "joinedUsers":
      return getJoinedUsers(deal);
    case "requiredUsers":
      return getRequiredUsers(deal);
    case "status": {
      const statusValue =
        typeof getStatusValue === "function" ? getStatusValue(deal) : deal?.status;
      return normalizeDealFilterText(statusValue);
    }
    default:
      return null;
  }
}

export function compareDealsByField(
  a,
  b,
  field,
  order = "asc",
  options = {},
) {
  const direction = order === "desc" ? -1 : 1;
  const aValue = getDealFieldValue(a, field, options);
  const bValue = getDealFieldValue(b, field, options);
  if (typeof aValue === "number" || typeof bValue === "number") {
    return (toNumeric(aValue) - toNumeric(bValue)) * direction;
  }
  return (
    normalizeDealFilterText(aValue).localeCompare(normalizeDealFilterText(bValue)) *
    direction
  );
}

export function passesDealFieldFilter(
  deal,
  field,
  query,
  mode = "contains",
  options = {},
) {
  if (!field) return true;
  const normalizedQuery = normalizeDealFilterText(query);
  if (!normalizedQuery) return true;
  const value = getDealFieldValue(deal, field, options);
  if (value === null || value === undefined) return false;

  if (typeof value === "number") {
    return matchesNumericQuery(value, query, mode);
  }

  const textValue = normalizeDealFilterText(value);
  if (mode === "equals") return textValue === normalizedQuery;
  return textValue.includes(normalizedQuery);
}

export function applyDealFieldFilters(deals, rules = [], options = {}) {
  if (!Array.isArray(deals) || deals.length === 0) return deals || [];
  if (!Array.isArray(rules) || rules.length === 0) return deals;
  return deals.filter((deal) =>
    rules.every((rule) =>
      passesDealFieldFilter(
        deal,
        rule?.field,
        rule?.query,
        rule?.mode || "contains",
        options,
      ),
    ),
  );
}

export function sortDealsByField(deals, field, order = "asc", options = {}) {
  if (!Array.isArray(deals) || deals.length === 0) return deals || [];
  if (!field) return deals;
  const list = [...deals];
  list.sort((a, b) => compareDealsByField(a, b, field, order, options));
  return list;
}
