import React from "react";
import { View, StyleSheet } from "react-native";
import { cardStyles } from "../styles/cards";
import { theme } from "../theme/theme";
import SkeletonBlock from "./SkeletonBlock";

export default function SkeletonCard({ style, shimmerDuration }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.row}>
        <SkeletonBlock
          width={50}
          height={50}
          style={styles.avatar}
          shimmer
          shimmerDuration={shimmerDuration}
        />
        <View style={styles.texts}>
          <SkeletonBlock
            width={120}
            height={10}
            shimmer
            shimmerDuration={shimmerDuration}
          />
          <SkeletonBlock
            width={180}
            height={12}
            style={styles.spaceSm}
            shimmer
            shimmerDuration={shimmerDuration}
          />
        </View>
      </View>
      <SkeletonBlock
        width="100%"
        height={8}
        style={styles.spaceMd}
        shimmer
        shimmerDuration={shimmerDuration}
      />
      <SkeletonBlock
        width="60%"
        height={8}
        shimmer
        shimmerDuration={shimmerDuration}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    ...cardStyles.base,
    ...cardStyles.shadow,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    borderRadius: theme.radii.md,
  },
  texts: {
    flex: 1,
  },
  spaceSm: {
    marginTop: 6,
  },
  spaceMd: {
    marginTop: 10,
  },
});
