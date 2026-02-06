import React, { useMemo } from "react";
import { View, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";

export default function ImageHeader({
  imageUri,
  height = 280,
  onBack,
  right,
}) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: "100%",
          backgroundColor: theme.colors.surfaceLight,
        },
        image: {
          width: "100%",
          height: "100%",
        },
        placeholder: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        backBtn: {
          position: "absolute",
          top: 20,
          left: 20,
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: theme.colors.surfaceGlassStrong,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        rightSlot: {
          position: "absolute",
          top: 20,
          right: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
      }),
    [theme],
  );
  return (
    <View style={[styles.container, { height }]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons
            name="image-outline"
            size={60}
            color={theme.colors.chatEmptyIcon}
          />
        </View>
      )}
      {onBack ? (
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      ) : null}
      {right ? <View style={styles.rightSlot}>{right}</View> : null}
    </View>
  );
}
