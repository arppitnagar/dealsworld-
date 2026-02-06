import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getUi } from "../styles/ui";
import { useTheme } from "../theme/ThemeProvider";

export default function PrimaryBanner({
  title,
  subtitle,
  onPress,
  leftIcon,
  rightIcon,
  style,
}) {
  const { theme } = useTheme();
  const ui = useMemo(() => getUi(theme), [theme]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        banner: {
          ...ui.banner,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        content: {
          flexDirection: "row",
          alignItems: "center",
        },
        iconWrap: {
          width: 42,
          height: 42,
          borderRadius: 14,
          backgroundColor: theme.colors.onPrimarySoft,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 15,
        },
        textWrap: {
          gap: 2,
        },
        title: {
          ...theme.typography.bannerTitle,
        },
        subtitle: {
          ...theme.typography.bannerSubtitle,
        },
      }),
    [theme, ui],
  );
  return (
    <TouchableOpacity
      style={[styles.banner, style]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          {leftIcon ?? (
            <Ionicons name="add" size={22} color={theme.colors.onPrimary} />
          )}
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightIcon ?? (
        <Ionicons
          name="arrow-forward"
          size={20}
          color={theme.colors.onPrimaryMuted}
        />
      )}
    </TouchableOpacity>
  );
}
