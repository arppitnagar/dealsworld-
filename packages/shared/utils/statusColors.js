import { theme } from "../theme/theme";

export const statusColors = {
  active: theme.colors.statusActive,
  completed: theme.colors.success,
  expired: theme.colors.statusExpired,
  scheduled: theme.colors.statusScheduled,
  pending: theme.colors.statusScheduled,
  draft: theme.colors.statusDraft,
};

export const getStatusColor = (status) => {
  if (!status) return theme.colors.textMuted;
  return statusColors[String(status).toLowerCase()] || theme.colors.textMuted;
};
