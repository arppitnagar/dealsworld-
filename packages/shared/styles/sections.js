import { theme } from "../theme/theme";

export const sectionStyles = {
  container: {
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
};
