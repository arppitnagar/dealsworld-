import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";
import { cardStyles } from "../styles/cards";

export default function StatsCard({
  title,
  count,
  color,
  bgColor,
  icon,
  onPress,
  isSelected,
  style,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        { borderColor: color + "20" },
        isSelected && { borderColor: color, borderWidth: 2, elevation: 8 },
        style,
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.value, { color }]}>{count < 10 ? `0${count}` : count}</Text>
      <Text style={styles.label}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardStyles.base,
    ...cardStyles.shadow,
    padding: 16,
    alignItems: "center",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  value: {
    fontSize: 24,
    fontWeight: "900",
  },
  label: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
