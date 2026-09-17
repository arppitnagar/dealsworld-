import { theme as defaultTheme } from "../theme/theme";

export const getStatusColors = (theme = defaultTheme) => ({
  active: theme.colors.statusActive,
  completed: theme.colors.success,
  expired: theme.colors.statusExpired,
  rejected: theme.colors.error,
  scheduled: theme.colors.statusScheduled,
  pending: theme.colors.statusScheduled,
  draft: theme.colors.statusDraft,
  dispatched: theme.colors.primary,
  delivered: theme.colors.success,
  unsuccessful: theme.colors.error,
  unpaid: theme.colors.textMuted,
  paid_blocked: theme.colors.primary,
  released_to_seller: theme.colors.success,
  refunded_to_buyer: theme.colors.textMuted,
});

export const statusColors = getStatusColors(defaultTheme);

export const getStatusColor = (status, theme = defaultTheme) => {
  if (!status) return theme.colors.textMuted;
  const colors = getStatusColors(theme);
  return colors[String(status).toLowerCase()] || theme.colors.textMuted;
};
