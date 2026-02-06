import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export default function CardHeader({ title, right, style }) {
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
          fontSize: 16,
          fontWeight: "800",
          color: theme.colors.text,
        },
      }),
    [theme],
  );

  return (
    <View style={[styles.header, style]}>
      <Text style={styles.title}>{title}</Text>
      {right ? <View>{right}</View> : null}
    </View>
  );
}
