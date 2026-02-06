import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import SkeletonBlock from "./SkeletonBlock";
import { useTheme } from "../theme/ThemeProvider";

export default function SkeletonStatsRow({ count = 3, shimmerDuration }) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.lg,
        },
        card: {
          flex: 1,
          padding: theme.spacing.md,
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        gap: {
          marginTop: 8,
        },
      }),
    [theme],
  );
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <View style={styles.row}>
      {items.map((i) => (
        <View key={i} style={styles.card}>
          <SkeletonBlock
            width="80%"
            height={10}
            shimmer
            shimmerDuration={shimmerDuration}
          />
          <SkeletonBlock
            width="50%"
            height={16}
            style={styles.gap}
            shimmer
            shimmerDuration={shimmerDuration}
          />
        </View>
      ))}
    </View>
  );
}
