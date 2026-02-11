import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getCardStyles } from "../styles/cards";
import { useTheme } from "../theme/ThemeProvider";

export default function DealCard({
  title,
  category,
  image,
  joins,
  accentColor,
  viewsCount,
  favoritesCount,
  countdown,
  expiryLabel,
  statusLabel,
  onPress,
  actionLabel,
  onActionPress,
}) {
  const { theme } = useTheme();
  const cardStyles = useMemo(() => getCardStyles(theme), [theme]);
  const subtitleLine = [category, expiryLabel || countdown]
    .filter(Boolean)
    .join(" • ");
  const formatCount = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0";
    if (numeric >= 1000000) {
      return `${(numeric / 1000000).toFixed(1)}m`;
    }
    if (numeric >= 1000) {
      return `${(numeric / 1000).toFixed(numeric >= 10000 ? 0 : 1)}k`;
    }
    return `${numeric}`;
  };
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginBottom: 20,
          overflow: "hidden",
          backgroundColor: theme.colors.surface,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...cardStyles.shadow,
        },
        imageWrap: {
          height: 190,
          backgroundColor: theme.colors.surfaceLight,
          overflow: "hidden",
        },
        image: { width: "100%", height: "100%" },
        imagePlaceholder: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        badge: {
          position: "absolute",
          top: 12,
          left: 12,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: accentColor || theme.colors.warningBright,
        },
        badgeText: {
          color: theme.colors.onPrimary,
          fontSize: 10,
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 0.6,
        },
        heartBadge: {
          position: "absolute",
          top: 12,
          right: 12,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: theme.colors.surfaceGlass,
          borderWidth: 1,
          borderColor: theme.colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        heartText: {
          fontSize: 10,
          fontWeight: "700",
          color: theme.colors.textMuted,
        },
        body: {
          padding: 16,
          gap: 8,
        },
        titleRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
        },
        title: { flex: 1, fontSize: 16, fontWeight: "800", color: theme.colors.text },
        subtitle: { fontSize: 12, color: theme.colors.textMuted },
        metaRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        metaChip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: theme.colors.surfaceLight,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8,
        },
        metaText: {
          fontSize: 10,
          fontWeight: "700",
          color: theme.colors.textMuted,
        },
        actionRow: {
          alignItems: "flex-end",
        },
        actionButton: {
          backgroundColor: theme.colors.text,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 8,
        },
        actionText: {
          color: theme.colors.onPrimary,
          fontSize: 12,
          fontWeight: "700",
        },
      }),
    [accentColor, cardStyles, theme],
  );
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={24} color={theme.colors.textMuted} />
          </View>
        )}
        {statusLabel ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{statusLabel}</Text>
          </View>
        ) : null}
          {Number.isFinite(Number(favoritesCount)) ? (
            <View style={styles.heartBadge}>
              <Ionicons name="heart" size={12} color={theme.colors.danger} />
              <Text style={styles.heartText}>
                {formatCount(favoritesCount)}
              </Text>
            </View>
          ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>
        {subtitleLine ? (
          <Text style={styles.subtitle}>{subtitleLine}</Text>
        ) : null}
        <View style={styles.metaRow}>
          {Number.isFinite(Number(viewsCount)) ? (
            <View style={styles.metaChip}>
              <Ionicons name="eye-outline" size={14} color={theme.colors.textMuted} />
              <Text style={styles.metaText}>{formatCount(viewsCount)}</Text>
            </View>
          ) : null}
          {Number.isFinite(Number(joins)) ? (
            <View style={styles.metaChip}>
              <Ionicons name="people-outline" size={14} color={theme.colors.textMuted} />
              <Text style={styles.metaText}>{formatCount(joins)}</Text>
            </View>
          ) : null}
        </View>
        {actionLabel ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={onActionPress}
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>{actionLabel}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
