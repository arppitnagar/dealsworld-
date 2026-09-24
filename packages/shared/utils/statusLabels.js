import { englishT } from "../i18n/translator";

export const statusLabels = {
  active: "Active",
  completed: "Completed",
  expired: "Expired",
  rejected: "Rejected",
  scheduled: "Scheduled",
  pending: "Scheduled",
  draft: "Draft",
  dispatched: "Dispatched",
  delivered: "Delivered",
  unsuccessful: "Unsuccessful",
  unpaid: "Unpaid",
  paid_blocked: "Payment Held",
  released_to_seller: "Payment Released",
  refunded_to_buyer: "Refunded",
};

// `t` is useI18n()'s translator; English when omitted.
export const getStatusLabel = (status, t = englishT) => {
  const key = String(status || "").toLowerCase();
  if (!key || !statusLabels[key]) return t("status.unknown");
  return t(`status.${key}`, { defaultValue: statusLabels[key] });
};
