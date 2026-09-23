import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

/**
 * Pill-shaped bottom action bar for screens that need a fixed row of icon
 * actions (Deal Details, Notifications, ...) instead of icons in the top
 * header. Visually matches `BottomTabBar` (same radii/colors/shadow) so a
 * screen-local action row reads as part of the same design language as the
 * app's real tab bar.
 *
 * `items`: [{
 *   key: string,
 *   icon: (color: string) => ReactNode,
 *   label: string,
 *   onPress: () => void,
 *   active?: boolean,
 *   tone?: "danger",
 *   disabled?: boolean,
 *   loading?: boolean,
 * }]
 */
export default function IconActionBar({ items, style }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 16) }, style]}
    >
      {items.filter(Boolean).map((item) => {
        const color =
          item.tone === "danger"
            ? theme.colors.danger
            : item.active
              ? theme.colors.primary
              : theme.colors.textMuted;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.item, item.active && styles.itemActive]}
            activeOpacity={0.75}
            onPress={item.onPress}
            disabled={item.disabled}
          >
            {item.loading ? (
              <ActivityIndicator color={color} size="small" />
            ) : (
              item.icon(color)
            )}
            <Text style={[styles.label, { color }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 14,
      paddingTop: 12,
      ...theme.shadow.card,
    },
    item: {
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
    },
    itemActive: {
      backgroundColor: theme.colors.primaryTintBg,
    },
    label: {
      fontSize: 10,
      fontWeight: "700",
    },
  });
