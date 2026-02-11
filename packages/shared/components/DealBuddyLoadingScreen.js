import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import DealBuddyLoader from "./DealBuddyLoader";

export default function DealBuddyLoadingScreen({
  label = "Loading...",
  style,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.screen, style]}>
      <View style={styles.meshBackground}>
        <View style={styles.meshOrbPrimary} />
        <View style={styles.meshOrbAccent} />
        <View style={styles.meshOrbSoft} />
      </View>
      <DealBuddyLoader showLabel={false} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      gap: 12,
    },
    meshBackground: {
      ...StyleSheet.absoluteFillObject,
    },
    meshOrbPrimary: {
      position: "absolute",
      top: -80,
      left: -60,
      width: 220,
      height: 220,
      borderRadius: 120,
      backgroundColor: theme.colors.onPrimary,
      opacity: 0.18,
    },
    meshOrbAccent: {
      position: "absolute",
      bottom: -100,
      right: -80,
      width: 260,
      height: 260,
      borderRadius: 160,
      backgroundColor: theme.colors.purple,
      opacity: 0.25,
    },
    meshOrbSoft: {
      position: "absolute",
      top: "35%",
      right: -60,
      width: 180,
      height: 180,
      borderRadius: 120,
      backgroundColor: theme.colors.primary,
      opacity: 0.2,
    },
    label: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.onPrimaryMuted,
      letterSpacing: 0.4,
    },
  });
