import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import { theme } from "../../theme/theme";

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
  const isPrimary = variant === "primary";
  const backgroundColor = isPrimary ? theme.colors.primary : "#FFFFFF";
  const borderColor = isPrimary ? theme.colors.primary : theme.colors.border;
  const textColor = isPrimary ? theme.colors.onPrimary : theme.colors.text;

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

const styles = StyleSheet.create({
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
});
