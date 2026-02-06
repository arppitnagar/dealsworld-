import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export default function HeaderBar({
  title,
  subtitle,
  right,
  style,
  onTitleLongPress,
}) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        title: {
          fontSize: 28,
          fontWeight: "900",
          color: theme.colors.text,
        },
        subtitle: {
          fontSize: 14,
          color: theme.colors.textMuted,
          fontWeight: "500",
          marginTop: 2,
        },
      }),
    [theme],
  );
  return (
    <View style={[styles.header, style]}>
      <View>
        <TouchableOpacity
          disabled={!onTitleLongPress}
          onLongPress={onTitleLongPress}
          activeOpacity={0.8}
        >
          <Text style={styles.title}>{title}</Text>
        </TouchableOpacity>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}
