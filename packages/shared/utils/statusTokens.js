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
    // AA text-on-tint: the brighter `success` token fails 4.5:1 on this bg.
    color: theme.colors.textOnSuccessTint,
    bg: theme.colors.successSoftAlt,
  },
  expired: {
    label: statusLabels.expired,
    color: theme.colors.statusExpired,
    bg: theme.colors.amberSoft,
  },
  rejected: {
    label: statusLabels.rejected,
    // AA text-on-tint: the brighter `error` token fails 4.5:1 on this bg.
    color: theme.colors.textOnDangerTint,
    bg: theme.colors.dangerSoftAlt,
  },
  draft: {
    label: statusLabels.draft,
    color: theme.colors.statusDraft,
    bg: theme.colors.surfaceMuted,
  },
  dispatched: {
    label: statusLabels.dispatched,
    color: theme.colors.primary,
    bg: theme.colors.infoSoft,
  },
  delivered: {
    label: statusLabels.delivered,
    color: theme.colors.success,
    bg: theme.colors.successSoft,
  },
  // Distinct from `rejected` (never admin-approved) - this is a campaign
  // that ran its course but never reached its minimum group size, so it
  // never ships and joined buyers need a refund.
  unsuccessful: {
    label: statusLabels.unsuccessful,
    color: theme.colors.error,
    bg: theme.colors.dangerSoftLight,
  },
  // Payment-hold flags (temporary Firestore scaffolding until a real
  // payment gateway is wired in - see dealJoins.paymentStatus).
  unpaid: {
    label: statusLabels.unpaid,
    color: theme.colors.textMuted,
    bg: theme.colors.surfaceMuted,
  },
  paid_blocked: {
    label: statusLabels.paid_blocked,
    color: theme.colors.primary,
    bg: theme.colors.infoSoft,
  },
  released_to_seller: {
    label: statusLabels.released_to_seller,
    color: theme.colors.textOnSuccessTint,
    bg: theme.colors.successSoftAlt,
  },
  refunded_to_buyer: {
    label: statusLabels.refunded_to_buyer,
    color: theme.colors.textMuted,
    bg: theme.colors.surfaceMuted,
  },
});

export const statusTokens = getStatusTokens(defaultTheme);

export function getStatusToken(status, theme = defaultTheme) {
  if (!status) return null;
  const tokens = getStatusTokens(theme);
  return tokens[String(status).toLowerCase()] || null;
}
