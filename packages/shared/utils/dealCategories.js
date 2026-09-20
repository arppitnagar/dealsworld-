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
