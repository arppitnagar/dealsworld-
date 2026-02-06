import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export default function FormSection({ title, children, style }) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: {
          marginTop: theme.spacing.lg,
        },
        title: {
          fontSize: 14,
          fontWeight: "700",
          color: theme.colors.text,
          marginBottom: theme.spacing.sm,
        },
        body: {
          gap: 12,
        },
      }),
    [theme],
  );

  return (
    <View style={[styles.section, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}
