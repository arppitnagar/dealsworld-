// Address labels are saved as English values ("Home", "Office", "Other" -
// see AddressFormScreen's LABELS), and a buyer's custom label is saved as
// typed. Only the built-in ones get translated for display.
const BUILT_IN_LABEL_KEYS = {
  home: "addresses.labels.home",
  office: "addresses.labels.office",
  other: "addresses.labels.other",
};

export function getAddressLabel(label, t) {
  if (!label) return t("addresses.labels.address");
  const key = BUILT_IN_LABEL_KEYS[String(label).trim().toLowerCase()];
  return key ? t(key) : label;
}
