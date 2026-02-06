import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import SkeletonBlock from "./SkeletonBlock";

export default function ChatSkeleton({
  count = 6,
  showHeaderText = true,
  shimmerDuration,
}) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          padding: theme.spacing.sm,
        },
        header: {
          marginBottom: theme.spacing.sm,
        },
        headerSub: {
          marginTop: 6,
        },
        headerLoading: {
          marginTop: 6,
        },
        row: {
          flexDirection: "row",
          marginBottom: theme.spacing.sm,
        },
        rowRight: {
          justifyContent: "flex-end",
        },
        rowLeft: {
          justifyContent: "flex-start",
        },
        bubble: {
          borderRadius: 14,
        },
        bubbleRight: {
          alignSelf: "flex-end",
        },
        bubbleLeft: {
          alignSelf: "flex-start",
        },
        inputBar: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          paddingTop: theme.spacing.sm,
        },
        input: {
          borderRadius: 16,
        },
        send: {
          borderRadius: 16,
        },
      }),
    [theme],
  );
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SkeletonBlock width={120} height={12} shimmer shimmerDuration={shimmerDuration} />
        <SkeletonBlock
          width={160}
          height={10}
          style={styles.headerSub}
          shimmer
          shimmerDuration={shimmerDuration}
        />
        {showHeaderText ? (
          <SkeletonBlock
            width={90}
            height={8}
            style={styles.headerLoading}
            shimmer
            shimmerDuration={shimmerDuration}
          />
        ) : null}
      </View>
      {items.map((i) => {
        const isRight = i % 2 === 0;
        return (
          <View
            key={i}
            style={[
              styles.row,
              isRight ? styles.rowRight : styles.rowLeft,
            ]}
          >
            <SkeletonBlock
              width={isRight ? "55%" : "65%"}
              height={18}
              style={[
                styles.bubble,
                isRight ? styles.bubbleRight : styles.bubbleLeft,
              ]}
              shimmer
              shimmerDuration={shimmerDuration}
            />
          </View>
        );
      })}
      <View style={styles.inputBar}>
        <SkeletonBlock
          width="80%"
          height={18}
          style={styles.input}
          shimmer
          shimmerDuration={shimmerDuration}
        />
        <SkeletonBlock
          width={32}
          height={32}
          style={styles.send}
          shimmer
          shimmerDuration={shimmerDuration}
        />
      </View>
    </View>
  );
}
