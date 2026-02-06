import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";

export default function DetailRow({
  label,
  value,
  icon,
  color,
  style,
}) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        label: {
          fontSize: 12,
          fontWeight: "600",
        },
        value: {
          fontSize: 13,
          fontWeight: "600",
        },
      }),
    [theme],
  );
  const tint = color || theme.colors.textMuted;
  return (
    <View style={[styles.row, style]}>
      {icon ? <Ionicons name={icon} size={14} color={tint} /> : null}
      {label ? <Text style={[styles.label, { color: tint }]}>{label}</Text> : null}
      <Text style={[styles.value, { color: theme.colors.text }]}>
        {value}
      </Text>
    </View>
  );
}
