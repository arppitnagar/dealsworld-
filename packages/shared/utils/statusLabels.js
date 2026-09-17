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

export const getStatusLabel = (status) => {
  if (!status) return "Unknown";
  return statusLabels[String(status).toLowerCase()] || "Unknown";
};
