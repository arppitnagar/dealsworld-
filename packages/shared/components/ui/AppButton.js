import React, { useMemo } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export function AppButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  leftIcon,
  rightIcon,
  style,
  textStyle,
}) {
  const { theme } = useTheme();
  const isPrimary = variant === "primary";
  const backgroundColor = isPrimary
    ? theme.colors.primary
    : theme.colors.background;
  const borderColor = isPrimary ? theme.colors.primary : theme.colors.border;
  const textColor = isPrimary ? theme.colors.onPrimary : theme.colors.text;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          borderWidth: 1,
          borderRadius: theme.radii.lg,
          paddingVertical: 14,
          paddingHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
        },
        buttonDisabled: {
          opacity: 0.6,
        },
        content: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        },
        text: {
          fontSize: 14,
          fontWeight: "700",
        },
        icon: {
          marginHorizontal: 6,
        },
      }),
    [theme],
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor, borderColor },
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <Text style={[styles.text, { color: textColor }, textStyle]}>
            {title}
          </Text>
          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default AppButton;
