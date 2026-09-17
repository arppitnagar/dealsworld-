import React, { useRef } from "react";
import { View, Text, StyleSheet, TextInput, TouchableWithoutFeedback } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

// Segmented 6-digit entry field, backed by a single invisible TextInput so
// there's no multi-ref focus-jumping to manage. Tapping any box focuses the
// hidden input; typed digits render into the boxes left-to-right.
export default function OtpInput({
  value = "",
  onChangeText,
  length = 6,
  editable = true,
  autoFocus = false,
}) {
  const { theme } = useTheme();
  const inputRef = useRef(null);
  const digits = value.split("");
  const cells = Array.from({ length });

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flexDirection: "row",
          gap: 8,
          alignSelf: "flex-start",
          position: "relative",
        },
        box: {
          width: 44,
          height: 52,
          borderRadius: 12,
          borderWidth: 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: editable ? theme.colors.surfaceLight : theme.colors.surfaceMuted,
        },
        boxFilled: { borderColor: theme.colors.primary },
        boxEmpty: { borderColor: theme.colors.border },
        digit: { fontSize: 22, fontWeight: "800", color: theme.colors.text },
        hiddenInput: {
          position: "absolute",
          opacity: 0,
          width: "100%",
          height: "100%",
        },
      }),
    [theme, editable],
  );

  return (
    <TouchableWithoutFeedback onPress={() => editable && inputRef.current?.focus()}>
      <View style={styles.wrap}>
        {cells.map((_, index) => (
          <View
            key={index}
            style={[styles.box, digits[index] ? styles.boxFilled : styles.boxEmpty]}
          >
            <Text style={styles.digit}>{digits[index] || ""}</Text>
          </View>
        ))}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(text) => onChangeText?.(text.replace(/[^0-9]/g, "").slice(0, length))}
          keyboardType="number-pad"
          maxLength={length}
          editable={editable}
          autoFocus={autoFocus}
          style={styles.hiddenInput}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}
