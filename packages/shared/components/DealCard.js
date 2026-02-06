import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getCardStyles } from "../styles/cards";
import { useTheme } from "../theme/ThemeProvider";
import StatusPill from "./StatusPill";
import MetricRow from "./MetricRow";

export default function DealCard({
  title,
  category,
  image,
  joins,
  target,
  progress,
  accentColor,
  countdown,
  expiryLabel,
  statusLabel,
  statusColor,
  onPress,
}) {
  const { theme } = useTheme();
  const cardStyles = useMemo(() => getCardStyles(theme), [theme]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: "row",
          marginBottom: 16,
          overflow: "hidden",
          ...cardStyles.base,
          ...cardStyles.shadow,
        },
        accentStrip: { width: 6 },
        content: { flex: 1, padding: 16 },
        topRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
        pillRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 4,
        },
        imagePlaceholder: {
          width: 50,
          height: 50,
          borderRadius: 15,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12,
        },
        image: { width: "100%", height: "100%", borderRadius: 15 },
        categoryBadge: {
          alignSelf: "flex-start",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 8,
          marginBottom: 4,
        },
        categoryText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
        title: { fontSize: 17, fontWeight: "700", color: theme.colors.text },
        progressSection: {
          borderTopWidth: 1,
          borderTopColor: theme.colors.surfaceLighter,
          paddingTop: 12,
        },
        progressInfo: {
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 8,
        },
        progressLabel: {
          fontSize: 12,
          color: theme.colors.textMuted,
          fontWeight: "600",
        },
        progressPercent: {
          fontSize: 13,
          color: theme.colors.text,
          fontWeight: "800",
        },
        progressBarBg: {
          height: 8,
          backgroundColor: theme.colors.surfaceLight,
          borderRadius: 4,
          overflow: "hidden",
          marginBottom: 8,
        },
        progressBarFill: { height: "100%" },
        joinCount: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 6 },
        metricRow: { marginBottom: 4 },
      }),
    [cardStyles, theme],
  );
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.imagePlaceholder, { backgroundColor: accentColor + "10" }]}>
            {image ? (
              <Image source={{ uri: image }} style={styles.image} />
            ) : (
              <Ionicons name="pricetag" size={20} color={accentColor} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.pillRow}>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: accentColor + "15" },
                ]}
              >
                <Text style={[styles.categoryText, { color: accentColor }]}>
                  {category || "General"}
                </Text>
              </View>
              {statusLabel ? (
                <StatusPill
                  label={statusLabel}
                  color={statusColor || accentColor}
                />
              ) : null}
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPercent}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress * 100}%`, backgroundColor: accentColor },
              ]}
            />
          </View>
          <Text style={styles.joinCount}>
            {joins} / {target} Joined
          </Text>
          {countdown ? (
            <MetricRow
              icon="time-outline"
              value={countdown}
              color={accentColor}
              style={styles.metricRow}
            />
          ) : null}
          {expiryLabel ? (
            <MetricRow
              icon="calendar-outline"
              value={expiryLabel}
              color={accentColor}
              style={styles.metricRow}
            />
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
