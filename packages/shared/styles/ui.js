import { theme } from "../theme/theme";

export const ui = {
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardShadow: theme.shadow.card,
  banner: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
  },
  pill: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
  },
};
