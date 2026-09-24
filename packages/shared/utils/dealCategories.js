import { englishT } from "../i18n/translator";

// Single source of truth for deal categories, shared by the seller app's
// create-deal form and the buyer app's notification preferences screen so
// the two stay in sync.
export const DEAL_CATEGORIES = [
  { label: "Food & Beverages", icon: "🍔" },
  { label: "Fashion", icon: "👕" },
  { label: "Electronics", icon: "📱" },
  { label: "Beauty & Wellness", icon: "💄" },
  { label: "Travel", icon: "✈️" },
  { label: "Services", icon: "🛠️" },
  { label: "Entertainment", icon: "🎬" },
  { label: "Other", icon: "🧩" },
];

export const DEAL_CATEGORY_LABELS = DEAL_CATEGORIES.map((c) => c.label);

// Deals and notification prefs store the English label above, so that
// stays the value everywhere; this only translates it for display. Unknown
// labels (older/free-text categories) are shown as stored.
const CATEGORY_KEYS = {
  "Food & Beverages": "food",
  Fashion: "fashion",
  Electronics: "electronics",
  "Beauty & Wellness": "beauty",
  Travel: "travel",
  Services: "services",
  Entertainment: "entertainment",
  Other: "other",
};

export function getCategoryLabel(label, t = englishT) {
  const key = CATEGORY_KEYS[label];
  return key ? t(`categories.${key}`) : label;
}
