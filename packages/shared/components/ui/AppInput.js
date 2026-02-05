import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { theme } from "../../theme/theme";

export function AppInput({
  label,
  error,
  editable = true,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  multiline,
  ...props
}) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, error && styles.labelError, labelStyle]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          !editable && styles.inputDisabled,
          error && styles.inputError,
          inputStyle,
        ]}
        editable={editable}
        placeholderTextColor={theme.colors.textMuted}
        multiline={multiline}
        {...props}
      />
      {error ? (
        <Text style={[styles.error, errorStyle]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.label.fontSize,
    fontWeight: theme.typography.label.fontWeight,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  labelError: {
    color: theme.colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  inputDisabled: {
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.textMuted,
    borderColor: theme.colors.border,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  error: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
  },
});
