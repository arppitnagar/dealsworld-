import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { getCardStyles } from "../styles/cards";
import { useTheme } from "../theme/ThemeProvider";

export default function InfoCard({
  title,
  subtitle,
  children,
  style,
}) {
  const { theme } = useTheme();
  const cardStyles = useMemo(() => getCardStyles(theme), [theme]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          ...cardStyles.base,
          ...cardStyles.shadow,
          ...cardStyles.padded,
        },
        title: {
          fontSize: 14,
          fontWeight: "700",
          color: theme.colors.text,
          marginBottom: 6,
        },
        subtitle: {
          fontSize: 12,
          color: theme.colors.textMuted,
          marginBottom: 8,
        },
        body: {
          gap: 8,
        },
      }),
    [cardStyles, theme],
  );

  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}
