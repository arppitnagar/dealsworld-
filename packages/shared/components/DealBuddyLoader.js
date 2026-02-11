import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

const LOGO = require("./ui/DealBuddy App Icon.png");

export default function DealBuddyLoader({
  label = "Loading...",
  size = 96,
  showLabel = true,
  style,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const spinAnim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 4200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    pulseAnim.start();
    spinAnim.start();
    return () => {
      pulseAnim.stop();
      spinAnim.stop();
    };
  }, [pulse, spin]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.04],
  });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const ringSize = size + 22;

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            transform: [{ rotate }],
          },
        ]}
      />
      <Animated.Image
        source={LOGO}
        style={[
          styles.logo,
          {
            width: size,
            height: size,
            borderRadius: size / 4,
            transform: [{ scale }],
            opacity,
          },
        ]}
        resizeMode="contain"
      />
      {showLabel ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
    },
    ring: {
      position: "absolute",
      borderWidth: 2,
      borderColor: theme.colors.onPrimarySoft,
      opacity: 0.5,
    },
    logo: {
      backgroundColor: theme.colors.surface,
      shadowColor: theme.colors.text,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    label: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textMuted,
      letterSpacing: 0.4,
    },
  });
