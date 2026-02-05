import React from "react";
import { View, Text, StyleSheet } from "react-native";
import InfoCard from "./InfoCard";
import { metricsStyles } from "../styles/metrics";

export default function MetricsGrid({ items, columns = 2, gap = 12, style }) {
  if (!items || items.length === 0) return null;
  const widthPercent = `${Math.floor(100 / columns)}%`;

  return (
    <View style={[styles.grid, { gap }, style]}>
      {items.map((item) => (
        <InfoCard key={item.key || item.label} style={[styles.card, { width: widthPercent }]}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value ?? "—"}</Text>
        </InfoCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    marginBottom: 12,
  },
  label: metricsStyles.label,
  value: metricsStyles.value,
});
