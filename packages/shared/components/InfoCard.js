import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { cardStyles } from "../styles/cards";
import { theme } from "../theme/theme";

export default function InfoCard({
  title,
  subtitle,
  children,
  style,
}) {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
