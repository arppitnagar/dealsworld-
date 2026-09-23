import React, { useMemo } from "react";
import { View, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  onClear,
  style,
}) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 16,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        input: {
          flex: 1,
          color: theme.colors.text,
          fontSize: 14,
        },
      }),
    [theme],
  );
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
      />
      {value?.length > 0 && (
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close-circle" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
}
