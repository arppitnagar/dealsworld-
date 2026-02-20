import React, { useMemo } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme/ThemeProvider";

export function AppButton({
  title,
  subtitle,
  onPress,
  loading,
  disabled,
  variant = "primary",
  compact = false,
  leftIcon,
  rightIcon,
  style,
  contentStyle,
  textStyle,
  subtitleStyle,
  iconWrapStyle,
}) {
  const { theme } = useTheme();
  const isPrimary = variant === "primary";
  const isGhost = variant === "ghost";
  const backgroundColor = isGhost
    ? "transparent"
    : theme.colors.surfaceMuted;
  const borderColor = isGhost ? "transparent" : theme.colors.border;
  const textColor = isGhost ? theme.colors.primary : theme.colors.text;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        buttonWrap: {
          borderRadius: 20,
          overflow: "hidden",
          ...theme.shadow.card,
        },
        buttonBase: {
          borderWidth: 1,
          borderRadius: 20,
          paddingVertical: 14,
          paddingHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 52,
        },
        buttonBaseCompact: {
          paddingVertical: 10,
          minHeight: 44,
        },
        buttonDisabled: {
          opacity: 0.6,
        },
        gradientSurface: {
          borderRadius: 20,
          minHeight: 52,
          paddingVertical: 14,
          paddingHorizontal: 16,
          justifyContent: "center",
        },
        gradientSurfaceCompact: {
          paddingVertical: 10,
          minHeight: 44,
        },
        content: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          gap: 10,
        },
        contentWithSubtitle: {
          justifyContent: "space-between",
        },
        textBlock: {
          flexShrink: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        textBlockStart: {
          alignItems: "flex-start",
          flex: 1,
        },
        text: {
          fontSize: 15,
          fontWeight: "800",
          textAlign: "center",
        },
        subtitle: {
          marginTop: 2,
          fontSize: 12,
          fontWeight: "600",
          color: theme.colors.onPrimaryMuted,
        },
        leadingIconWrap: {
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: theme.colors.onPrimarySoft,
          borderWidth: 1,
          borderColor: theme.colors.onPrimaryMuted,
          alignItems: "center",
          justifyContent: "center",
        },
        icon: {
          marginHorizontal: 2,
        },
      }),
    [theme],
  );

  const renderContent = (resolvedTextColor, isPrimarySurface = false) => {
    if (loading) {
      return <ActivityIndicator color={resolvedTextColor} />;
    }

    return (
      <View
        style={[
          styles.content,
          subtitle ? styles.contentWithSubtitle : null,
          contentStyle,
        ]}
      >
        {leftIcon ? (
          <View
            style={[
              isPrimarySurface ? styles.leadingIconWrap : styles.icon,
              iconWrapStyle,
            ]}
          >
            {leftIcon}
          </View>
        ) : null}
        <View
          style={[
            styles.textBlock,
            subtitle || leftIcon || rightIcon ? styles.textBlockStart : null,
          ]}
        >
          <Text style={[styles.text, { color: resolvedTextColor }, textStyle]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>
          ) : null}
        </View>
        {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.buttonWrap,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.purple]}
          style={[
            styles.gradientSurface,
            compact ? styles.gradientSurfaceCompact : null,
          ]}
        >
          {renderContent(theme.colors.onPrimary, true)}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.buttonBase,
            compact ? styles.buttonBaseCompact : null,
            { backgroundColor, borderColor },
          ]}
        >
          {renderContent(textColor)}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default AppButton;
