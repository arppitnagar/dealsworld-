export const statusLabels = {
  active: "Active",
  completed: "Completed",
  expired: "Expired",
  scheduled: "Scheduled",
  pending: "Scheduled",
  draft: "Draft",
};

export const getStatusLabel = (status) => {
  if (!status) return "Unknown";
  return statusLabels[String(status).toLowerCase()] || "Unknown";
};
