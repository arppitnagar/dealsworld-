import { theme } from "../theme/theme";

export const cardStyles = {
  base: {
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  shadow: theme.shadow.card,
  padded: {
    padding: 16,
  },
  tight: {
    padding: 12,
  },
};
