import { theme as defaultTheme } from "../theme/theme";
import { statusLabels } from "./statusLabels";

export const getStatusTokens = (theme = defaultTheme) => ({
  active: {
    label: statusLabels.active,
    color: theme.colors.statusActive,
    bg: theme.colors.dangerSoft,
  },
  scheduled: {
    label: statusLabels.scheduled,
    color: theme.colors.statusScheduled,
    bg: theme.colors.purpleSoft,
  },
  pending: {
    label: statusLabels.pending,
    color: theme.colors.statusScheduled,
    bg: theme.colors.purpleSoft,
  },
  completed: {
    label: statusLabels.completed,
    color: theme.colors.success,
    bg: theme.colors.successSoftAlt,
  },
  expired: {
    label: statusLabels.expired,
    color: theme.colors.statusExpired,
    bg: theme.colors.amberSoft,
  },
  rejected: {
    label: statusLabels.rejected,
    color: theme.colors.error,
    bg: theme.colors.dangerSoftAlt,
  },
  draft: {
    label: statusLabels.draft,
    color: theme.colors.statusDraft,
    bg: theme.colors.surfaceMuted,
  },
});

export const statusTokens = getStatusTokens(defaultTheme);

export function getStatusToken(status, theme = defaultTheme) {
  if (!status) return null;
  const tokens = getStatusTokens(theme);
  return tokens[String(status).toLowerCase()] || null;
}
