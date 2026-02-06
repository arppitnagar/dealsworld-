import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { formatINR } from "../utils/formatters";

export default function PriceBlock({ price, original, meta }) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        },
        price: {
          fontSize: 24,
          fontWeight: "800",
          color: theme.colors.text,
        },
        original: {
          fontSize: 12,
          color: theme.colors.textMuted,
          textDecorationLine: "line-through",
          marginLeft: 8,
        },
        meta: {
          fontSize: 12,
          color: theme.colors.textMuted,
        },
      }),
    [theme],
  );
  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.price}>{formatINR(price)}</Text>
        {original !== undefined && original !== null && (
          <Text style={styles.original}>{formatINR(original)}</Text>
        )}
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}
