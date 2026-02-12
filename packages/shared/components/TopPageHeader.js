import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

export default function TopPageHeader({
  title,
  subtitle,
  onBack,
  hideBackButton = false,
  leftContent = null,
  centerContent = null,
  rightContent = null,
  customRow = null,
  rowStyle,
  titleStyle,
  subtitleStyle,
  rounded = false,
  includeSafeArea = true,
  style,
  children,
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const statusBarHeight =
    Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const topInset = Math.max(insets.top, statusBarHeight, 12);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const defaultLeft = hideBackButton ? (
    <View style={styles.sidePlaceholder} />
  ) : (
    <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={!onBack}>
      <Ionicons name="arrow-back" size={20} color={theme.colors.onPrimary} />
    </TouchableOpacity>
  );

  const defaultCenter = (
    <View style={styles.centerWrap}>
      <Text style={[styles.title, titleStyle]} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  const defaultRight = (
    <View style={styles.rightWrap}>
      {rightContent || <View style={styles.sidePlaceholder} />}
    </View>
  );

  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.purple]}
      style={[
        styles.wrapper,
        rounded ? styles.wrapperRounded : null,
        { paddingTop: includeSafeArea ? topInset : 0 },
        style,
      ]}
    >
      <View style={[styles.row, rowStyle]}>
        {customRow || (
          <>
            {leftContent || defaultLeft}
            {centerContent || defaultCenter}
            {defaultRight}
          </>
        )}
      </View>
      {children ? <View style={styles.childrenWrap}>{children}</View> : null}
    </LinearGradient>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.onPrimarySoft,
    },
    wrapperRounded: {
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.onPrimarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    centerWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      textAlign: "center",
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.onPrimary,
    },
    subtitle: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.onPrimaryMuted,
    },
    rightWrap: {
      width: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    sidePlaceholder: {
      width: 36,
      height: 36,
      opacity: 0,
    },
    childrenWrap: {
      marginTop: 12,
    },
  });
