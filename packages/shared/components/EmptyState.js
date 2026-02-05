import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function EmptyState({
  icon = "file-tray-outline",
  title,
  subtitle,
}) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={theme.colors.textMuted} />
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
