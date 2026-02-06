export const getFormStyles = (theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  label: {
    marginTop: theme.spacing.md,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  helper: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  error: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
  },
});
