import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";

export default function EmptyState({
  icon = "file-tray-outline",
  title,
  subtitle,
}) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: "center",
          paddingVertical: 36,
        },
        title: {
          marginTop: 10,
          fontSize: 14,
          fontWeight: "700",
          color: theme.colors.text,
        },
        subtitle: {
          marginTop: 4,
          fontSize: 12,
          color: theme.colors.textMuted,
          textAlign: "center",
        },
      }),
    [theme],
  );
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={theme.colors.textMuted} />
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
