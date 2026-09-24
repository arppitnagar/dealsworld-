import { englishT } from "../i18n/translator";

// Deals store deliveryMode as one of these English strings (seller's
// CreateDealScreen options); translated only for display. Anything else is
// shown as stored.
const DELIVERY_MODE_KEYS = {
  "free home delivery": "free",
  "paid home delivery": "paid",
  "pick from store": "pickup",
};

export function getDeliveryModeLabel(mode, t = englishT) {
  const text = String(mode || "").trim();
  const key = DELIVERY_MODE_KEYS[text.toLowerCase()];
  return key ? t(`deliveryModes.${key}`) : text;
}
