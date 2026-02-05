import { theme } from "../theme/theme";
import { statusLabels } from "./statusLabels";

export const statusTokens = {
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
  draft: {
    label: statusLabels.draft,
    color: theme.colors.statusDraft,
    bg: theme.colors.surfaceMuted,
  },
};

export function getStatusToken(status) {
  if (!status) return null;
  return statusTokens[String(status).toLowerCase()] || null;
}
