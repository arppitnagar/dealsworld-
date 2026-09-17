import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";

// Small segmented control for switching a deals feed between a stacked
// "list" layout and a 2-per-row "grid" layout. Kept generic (just emits
// the new mode) so each app's Home screen owns the persistence.
export default function ViewModeToggle({ mode, onChange }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.btn, mode === "list" && styles.btnActive]}
        onPress={() => onChange("list")}
        activeOpacity={0.85}
      >
        <Ionicons
          name="reorder-three-outline"
          size={16}
          color={mode === "list" ? theme.colors.onPrimary : theme.colors.textMuted}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, mode === "grid" && styles.btnActive]}
        onPress={() => onChange("grid")}
        activeOpacity={0.85}
      >
        <Ionicons
          name="grid-outline"
          size={16}
          color={mode === "grid" ? theme.colors.onPrimary : theme.colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      backgroundColor: theme.colors.surfaceLight,
      borderRadius: 10,
      padding: 3,
      gap: 3,
    },
    btn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    btnActive: {
      backgroundColor: theme.colors.primary,
    },
  });
