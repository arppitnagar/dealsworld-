import React, { useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export function AppInput({
  label,
  error,
  editable = true,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  multiline,
  leftElement,
  onLeftPress,
  leftContainerStyle,
  rightElement,
  onRightPress,
  rightContainerStyle,
  ...props
}) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        inputWithLeft: {
          paddingLeft: 44,
        },
        inputWithRight: {
          paddingRight: 44,
        },
        inputWrap: {
          position: "relative",
          justifyContent: "center",
        },
        leftIcon: {
          position: "absolute",
          left: 8,
          top: "50%",
          marginTop: -14,
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
        },
        rightIcon: {
          position: "absolute",
          right: 8,
          top: "50%",
          marginTop: -14,
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.border,
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
      }),
    [theme],
  );
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, error && styles.labelError, labelStyle]}>
          {label}
        </Text>
      ) : null}
      <View style={styles.inputWrap}>
        <TextInput
          style={[
            styles.input,
            leftElement && styles.inputWithLeft,
            rightElement && styles.inputWithRight,
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
        {leftElement ? (
          onLeftPress ? (
            <TouchableOpacity
              onPress={onLeftPress}
              style={[styles.leftIcon, leftContainerStyle]}
              accessibilityRole="button"
            >
              {leftElement}
            </TouchableOpacity>
          ) : (
            <View style={[styles.leftIcon, leftContainerStyle]}>
              {leftElement}
            </View>
          )
        ) : null}
        {rightElement ? (
          onRightPress ? (
            <TouchableOpacity
              onPress={onRightPress}
              style={[styles.rightIcon, rightContainerStyle]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
            >
              {rightElement}
            </TouchableOpacity>
          ) : (
            <View style={[styles.rightIcon, rightContainerStyle]}>
              {rightElement}
            </View>
          )
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.error, errorStyle]}>{error}</Text>
      ) : null}
    </View>
  );
}

export default AppInput;
