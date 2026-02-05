import React from "react";
import { View, Text, StyleSheet } from "react-native";
import InfoCard from "./InfoCard";

export default function StatsGrid({ items, columns = 2, gap = 12, style }) {
  if (!items || items.length === 0) return null;
  const widthPercent = `${Math.floor(100 / columns)}%`;

  return (
    <View style={[styles.grid, { gap }, style]}>
      {items.map((item) => (
        <InfoCard
          key={item.key || item.title}
          title={item.title}
          style={[styles.card, { width: widthPercent }]}
        >
          {item.value ? item.value : null}
          {item.render ? item.render() : null}
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
});
