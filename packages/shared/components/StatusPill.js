import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme/theme";
import { getStatusToken } from "../utils/statusTokens";

export default function StatusPill({
  label,
  color = theme.colors.primary,
  status,
}) {
  const token = status ? getStatusToken(status) : null;
  const resolvedLabel = label || token?.label || "Status";
  const resolvedColor = color || token?.color || theme.colors.primary;
  const bg = token?.bg || resolvedColor + "15";
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: resolvedColor }]}>{resolvedLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
