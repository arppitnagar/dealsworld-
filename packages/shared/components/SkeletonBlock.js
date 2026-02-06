import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme/ThemeProvider";

export default function SkeletonBlock({
  width = "100%",
  height = 12,
  style,
  shimmer = false,
  shimmerDuration,
}) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const [layoutWidth, setLayoutWidth] = useState(0);
  const duration =
    typeof shimmerDuration === "number"
      ? shimmerDuration
      : theme.skeleton.shimmerDuration;

  useEffect(() => {
    if (!shimmer) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: Math.max(300, Math.floor(duration / 2)),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: Math.max(300, Math.floor(duration / 2)),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, shimmer]);

  useEffect(() => {
    if (!shimmer || !layoutWidth) return undefined;
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: layoutWidth,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -layoutWidth,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, [layoutWidth, shimmer, translateX]);

  const Container = shimmer ? Animated.View : View;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          backgroundColor: theme.colors.surfaceLight,
          overflow: "hidden",
        },
        shimmer: {
          height: "100%",
        },
      }),
    [theme],
  );
  return (
    <Container
      onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
      style={[
        styles.base,
        { width, height, borderRadius: height / 2 },
        shimmer ? { opacity } : null,
        style,
      ]}
    >
      {shimmer && layoutWidth > 0 ? (
        <Animated.View
          style={[
            styles.shimmer,
            {
              width: layoutWidth * 1.2,
              transform: [{ translateX }],
            },
          ]}
        >
          <LinearGradient
            colors={[
              "rgba(255,255,255,0)",
              "rgba(255,255,255,0.5)",
              "rgba(255,255,255,0)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </Container>
  );
}
