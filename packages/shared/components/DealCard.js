import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getCardStyles } from "../styles/cards";
import { useTheme } from "../theme/ThemeProvider";

function formatCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`;
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(numeric >= 10000 ? 0 : 1)}K`;
  return `${numeric}`;
}

export default function DealCard({
  title,
  category,
  image,
  joins,
  targetCount,
  accentColor,
  viewsCount,
  favoritesCount,
  ratingAvg,
  ratingCount,
  originalPrice,
  discountPrice,
  badgeLabel,
  countdown,
  expiryLabel,
  statusLabel,
  onPress,
  actionLabel,
  onActionPress,
  isFavorite = false,
  onFavoritePress,
}) {
  const { theme } = useTheme();
  const cardStyles = useMemo(() => getCardStyles(theme), [theme]);

  const joinedCount = Number.isFinite(Number(joins)) ? Number(joins) : 0;
  const target = Number.isFinite(Number(targetCount)) ? Number(targetCount) : 0;
  const showProgress = target > 0;
  const progressRatio = showProgress ? Math.min(joinedCount / target, 1) : 0;
  const rightSubtitle = expiryLabel || countdown || null;
  const resolvedBadgeLabel = badgeLabel || statusLabel || null;
  const avgRating = Number.isFinite(Number(ratingAvg)) ? Number(ratingAvg) : null;
  const totalReviews = Number.isFinite(Number(ratingCount)) ? Number(ratingCount) : 0;
  const ratingLabel =
    totalReviews > 0 && avgRating !== null
      ? `${avgRating.toFixed(1)} (${formatCount(totalReviews)})`
      : "0.0 (0)";

  const original = Number(originalPrice);
  const discount = Number(discountPrice);
  const discountPercent =
    Number.isFinite(original) &&
    Number.isFinite(discount) &&
    original > discount
      ? Math.round(((original - discount) / original) * 100)
      : null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginBottom: 20,
          overflow: "hidden",
          backgroundColor: theme.colors.surface,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: accentColor || theme.colors.border,
          ...cardStyles.shadow,
        },
        // Image sits in an unclipped outer wrapper so the floating discount
        // badge (and the other overlay chips) can overhang its edges without
        // being cut off by the image's own overflow:hidden clip — only the
        // inner `imageClip` clips, and only the <Image> itself lives there.
        imageOuter: {
          position: "relative",
        },
        imageClip: {
          height: 190,
          backgroundColor: theme.colors.surfaceLight,
          overflow: "hidden",
        },
        image: {
          width: "100%",
          height: "100%",
        },
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
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.colors.surfaceGlass,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: "center",
          justifyContent: "center",
        },
        // Floating discount badge — always the app-independent `dealAccent`
        // orange (deal content, not app chrome). Positioned as a sibling of
        // the clipped image, hanging over the image/body boundary.
        discountBadge: {
          position: "absolute",
          bottom: -16,
          right: 16,
          backgroundColor: theme.colors.dealAccent,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 8,
          alignItems: "center",
          transform: [{ rotate: "-6deg" }],
          ...cardStyles.shadow,
        },
        discountBadgeValue: {
          fontSize: 16,
          fontWeight: "900",
          color: theme.colors.onPrimary,
          lineHeight: 18,
        },
        discountBadgeOff: {
          fontSize: 8,
          fontWeight: "800",
          color: theme.colors.onPrimary,
          letterSpacing: 1,
          marginTop: 2,
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
        title: {
          flex: 1,
          fontSize: 18,
          fontWeight: "900",
          color: theme.colors.text,
        },
        subtitleRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        },
        subtitle: {
          flex: 1,
          fontSize: 12,
          color: theme.colors.textMuted,
        },
        expiry: {
          fontSize: 12,
          fontWeight: "800",
          color: theme.colors.warningBright,
        },
        metaRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        },
        metaChip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: theme.colors.surfaceLight,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
        },
        metaText: {
          fontSize: 11,
          fontWeight: "700",
          color: theme.colors.textMuted,
        },
        progressWrap: {
          gap: 6,
        },
        progressHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        progressLabel: {
          fontSize: 11,
          fontWeight: "700",
          color: theme.colors.textMuted,
        },
        progressPercent: {
          fontSize: 11,
          fontWeight: "800",
          color: theme.colors.dealAccent,
        },
        progressTrack: {
          height: 8,
          borderRadius: 999,
          backgroundColor: theme.colors.surfaceLight,
          overflow: "hidden",
        },
        progressFill: {
          height: "100%",
          borderRadius: 999,
          backgroundColor: theme.colors.dealAccent,
        },
        actionRow: {
          alignItems: "flex-end",
        },
        actionButton: {
          borderRadius: 14,
          overflow: "hidden",
          ...theme.shadow.card,
        },
        actionButtonGradient: {
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 9,
          alignItems: "center",
          justifyContent: "center",
        },
        actionText: {
          color: theme.colors.onPrimary,
          fontSize: 13,
          fontWeight: "800",
        },
      }),
    [accentColor, cardStyles.shadow, theme],
  );

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageOuter}>
        <View style={styles.imageClip}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={24} color={theme.colors.textMuted} />
            </View>
          )}
        </View>
        {resolvedBadgeLabel ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{resolvedBadgeLabel}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.heartBadge}
          disabled={!onFavoritePress}
          onPress={(event) => {
            event?.stopPropagation?.();
            onFavoritePress?.();
          }}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={18}
            color={isFavorite ? theme.colors.danger : theme.colors.textMuted}
          />
        </TouchableOpacity>
        {discountPercent ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeValue}>{discountPercent}%</Text>
            <Text style={styles.discountBadgeOff}>OFF</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>

        {category || rightSubtitle ? (
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitle} numberOfLines={1}>
              {category}
            </Text>
            {rightSubtitle ? (
              <Text style={styles.expiry} numberOfLines={1}>
                {rightSubtitle}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.metaRow}>
          {Number.isFinite(Number(viewsCount)) ? (
            <View style={styles.metaChip}>
              <Ionicons name="eye-outline" size={18} color={theme.colors.textMuted} />
              <Text style={styles.metaText}>{formatCount(viewsCount)}</Text>
            </View>
          ) : null}
          <View style={styles.metaChip}>
            <Ionicons name="people-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.metaText}>{formatCount(joinedCount)}</Text>
          </View>
          {Number.isFinite(Number(favoritesCount)) ? (
            <View style={styles.metaChip}>
              <Ionicons name="heart-outline" size={18} color={theme.colors.danger} />
              <Text style={styles.metaText}>{formatCount(favoritesCount)}</Text>
            </View>
          ) : null}
          <View style={styles.metaChip}>
            <Ionicons name="star-outline" size={18} color={theme.colors.warningBright} />
            <Text style={styles.metaText}>{ratingLabel}</Text>
          </View>
        </View>

        {showProgress ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                Joined {formatCount(joinedCount)} of {formatCount(target)}
              </Text>
              <Text style={styles.progressPercent}>
                {Math.round(progressRatio * 100)}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
            </View>
          </View>
        ) : null}

        {actionLabel ? (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={onActionPress} style={styles.actionButton}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDeep]}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionText}>{actionLabel}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
