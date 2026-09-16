import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { getStatusToken } from "../utils/statusTokens";

export default function StatusPill({
  label,
  color,
  status,
}) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        pill: {
          alignSelf: "flex-start",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 999,
        },
        text: {
          fontSize: 10,
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 1,
        },
      }),
    [theme],
  );
  const token = status ? getStatusToken(status, theme) : null;
  const resolvedLabel = label || token?.label || "Status";
  const resolvedColor = color || token?.color || theme.colors.primary;
  const bg = token?.bg || resolvedColor + "15";
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: resolvedColor }]}>{resolvedLabel}</Text>
    </View>
  );
}
