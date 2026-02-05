import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme/theme";

export default function PriceBlock({ price, original, meta }) {
  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.price}>â‚¹{price}</Text>
        {original !== undefined && original !== null && (
          <Text style={styles.original}>â‚¹{original}</Text>
        )}
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
