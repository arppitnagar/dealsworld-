import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from "react-native";
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
  images,
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
  actionLabel,
  onActionPress,
  joinLabel,
  onJoinPress,
  payLabel,
  onPayPress,
  isJoined = false,
  isFavorite = false,
  onFavoritePress,
  deliveryBadge,
  compact = false,
}) {
  const { theme } = useTheme();
  const cardStyles = useMemo(() => getCardStyles(theme), [theme]);

  const gallery = useMemo(() => {
    if (Array.isArray(images) && images.length) return images.filter(Boolean);
    return image ? [image] : [];
  }, [images, image]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageWidth, setImageWidth] = useState(0);

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
        cardCompact: {
          marginBottom: 0,
          borderRadius: 16,
        },
        // Image sits in an unclipped outer wrapper so the floating discount
        // badge (and the other overlay chips) can overhang its edges without
        // being cut off by the image's own overflow:hidden clip — only the
        // inner `imageClip` clips, and only the <Image> itself lives there.
        imageOuter: {
          position: "relative",
        },
        imageClip: {
          height: 160,
          backgroundColor: theme.colors.surfaceLight,
          overflow: "hidden",
        },
        imageClipCompact: {
          height: 96,
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
        imageDots: {
          position: "absolute",
          bottom: 10,
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "center",
          gap: 5,
        },
        imageDot: {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: "rgba(255,255,255,0.5)",
        },
        imageDotActive: {
          width: 16,
          backgroundColor: theme.colors.onPrimary,
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
        badgeCompact: {
          top: 8,
          left: 8,
          paddingHorizontal: 7,
          paddingVertical: 3,
        },
        badgeText: {
          color: theme.colors.onPrimary,
          fontSize: 10,
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 0.6,
        },
        badgeTextCompact: {
          fontSize: 8,
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
        heartBadgeCompact: {
          top: 8,
          right: 8,
          width: 28,
          height: 28,
          borderRadius: 14,
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
        discountBadgeCompact: {
          bottom: -10,
          right: 10,
          borderRadius: 10,
          paddingHorizontal: 8,
          paddingVertical: 5,
        },
        discountBadgeValue: {
          fontSize: 16,
          fontWeight: "900",
          color: theme.colors.onPrimary,
          lineHeight: 18,
        },
        discountBadgeValueCompact: {
          fontSize: 11,
          lineHeight: 12,
        },
        discountBadgeOff: {
          fontSize: 8,
          fontWeight: "800",
          color: theme.colors.onPrimary,
          letterSpacing: 1,
          marginTop: 2,
        },
        discountBadgeOffCompact: {
          fontSize: 6,
          marginTop: 1,
        },
        body: {
          padding: 16,
          gap: 8,
        },
        bodyCompact: {
          padding: 10,
          gap: 5,
        },
        titleRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
        },
        deliveryChip: {
          alignSelf: "flex-start",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 999,
        },
        deliveryChipText: {
          fontSize: 10,
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 0.6,
        },
        title: {
          flex: 1,
          fontSize: 18,
          fontWeight: "900",
          color: theme.colors.text,
        },
        titleCompact: {
          fontSize: 13,
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
        expiryCompact: {
          fontSize: 10,
        },
        metaRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        },
        metaChip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          backgroundColor: theme.colors.surfaceLight,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 7,
        },
        metaText: {
          fontSize: 10,
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
        progressLabelCompact: {
          fontSize: 9,
        },
        progressPercent: {
          fontSize: 11,
          fontWeight: "800",
          color: theme.colors.dealAccent,
        },
        progressPercentCompact: {
          fontSize: 9,
        },
        progressTrack: {
          height: 8,
          borderRadius: 999,
          backgroundColor: theme.colors.surfaceLight,
          overflow: "hidden",
        },
        progressTrackCompact: {
          height: 5,
        },
        progressFill: {
          height: "100%",
          borderRadius: 999,
          backgroundColor: theme.colors.dealAccent,
        },
        actionRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: joinLabel || payLabel ? "space-between" : "flex-end",
        },
        actionButton: {
          borderRadius: 14,
          overflow: "hidden",
          ...theme.shadow.card,
        },
        actionButtonCompact: {
          borderRadius: 10,
          flex: 1,
        },
        actionButtonGradient: {
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 9,
          alignItems: "center",
          justifyContent: "center",
        },
        actionButtonGradientCompact: {
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 7,
        },
        actionText: {
          color: theme.colors.onPrimary,
          fontSize: 13,
          fontWeight: "800",
        },
        actionTextCompact: {
          fontSize: 11,
        },
      }),
    [accentColor, cardStyles.shadow, theme],
  );

  return (
    // Not a TouchableOpacity: deal details must open only via the explicit
    // "View Deal" action button below, not from an accidental tap anywhere
    // on the card.
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.imageOuter}>
        <View
          style={[styles.imageClip, compact && styles.imageClipCompact]}
          onLayout={(event) => setImageWidth(event.nativeEvent.layout.width)}
        >
          {gallery.length ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={gallery.length > 1}
                onMomentumScrollEnd={(event) => {
                  if (!imageWidth) return;
                  const index = Math.round(
                    event.nativeEvent.contentOffset.x / imageWidth,
                  );
                  setActiveImageIndex(index);
                }}
              >
                {gallery.map((uri, index) => (
                  <Image
                    key={`${uri}-${index}`}
                    source={{ uri }}
                    style={[styles.image, imageWidth ? { width: imageWidth } : null]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {gallery.length > 1 ? (
                <View style={styles.imageDots}>
                  {gallery.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.imageDot,
                        index === activeImageIndex && styles.imageDotActive,
                      ]}
                    />
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={24} color={theme.colors.textMuted} />
            </View>
          )}
        </View>
        {resolvedBadgeLabel ? (
          <View style={[styles.badge, compact && styles.badgeCompact]}>
            <Text
              style={[styles.badgeText, compact && styles.badgeTextCompact]}
              numberOfLines={1}
            >
              {resolvedBadgeLabel}
            </Text>
          </View>
        ) : null}
        {onFavoritePress ? (
          <TouchableOpacity
            style={[styles.heartBadge, compact && styles.heartBadgeCompact]}
            onPress={(event) => {
              event?.stopPropagation?.();
              onFavoritePress?.();
            }}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={compact ? 14 : 18}
              color={isFavorite ? theme.colors.danger : theme.colors.textMuted}
            />
          </TouchableOpacity>
        ) : null}
        {discountPercent ? (
          <View style={[styles.discountBadge, compact && styles.discountBadgeCompact]}>
            <Text style={[styles.discountBadgeValue, compact && styles.discountBadgeValueCompact]}>
              {discountPercent}%
            </Text>
            <Text style={[styles.discountBadgeOff, compact && styles.discountBadgeOffCompact]}>
              OFF
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.body, compact && styles.bodyCompact]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>
            {title}
          </Text>
        </View>

        {!compact && deliveryBadge?.label ? (
          <View
            style={[
              styles.deliveryChip,
              { backgroundColor: (deliveryBadge.color || theme.colors.primary) + "22" },
            ]}
          >
            <Text style={[styles.deliveryChipText, { color: deliveryBadge.color || theme.colors.primary }]}>
              {deliveryBadge.label}
            </Text>
          </View>
        ) : null}

        {compact ? (
          rightSubtitle ? (
            <Text style={[styles.expiry, styles.expiryCompact]} numberOfLines={1}>
              {rightSubtitle}
            </Text>
          ) : null
        ) : category || rightSubtitle ? (
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

        {!compact ? (
          <View style={styles.metaRow}>
            {Number.isFinite(Number(viewsCount)) ? (
              <View style={styles.metaChip}>
                <Ionicons name="eye-outline" size={14} color={theme.colors.textMuted} />
                <Text style={styles.metaText}>{formatCount(viewsCount)}</Text>
              </View>
            ) : null}
            <View style={styles.metaChip}>
              <Ionicons name="people-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.metaText}>{formatCount(joinedCount)}</Text>
            </View>
            {Number.isFinite(Number(favoritesCount)) ? (
              <View style={styles.metaChip}>
                <Ionicons name="heart-outline" size={14} color={theme.colors.danger} />
                <Text style={styles.metaText}>{formatCount(favoritesCount)}</Text>
              </View>
            ) : null}
            <View style={styles.metaChip}>
              <Ionicons name="star-outline" size={14} color={theme.colors.warningBright} />
              <Text style={styles.metaText}>{ratingLabel}</Text>
            </View>
          </View>
        ) : null}

        {showProgress ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressHeader}>
              <Text
                style={[styles.progressLabel, compact && styles.progressLabelCompact]}
                numberOfLines={1}
              >
                {compact
                  ? `${formatCount(joinedCount)}/${formatCount(target)} joined`
                  : `Joined ${formatCount(joinedCount)} of ${formatCount(target)}`}
              </Text>
              <Text style={[styles.progressPercent, compact && styles.progressPercentCompact]}>
                {Math.round(progressRatio * 100)}%
              </Text>
            </View>
            <View style={[styles.progressTrack, compact && styles.progressTrackCompact]}>
              <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
            </View>
          </View>
        ) : null}

        {compact ? (
          // Grid cards drop the separate Join/Pay buttons - one primary CTA
          // (View, falling back to Join/Pay) keeps the row from overflowing
          // a half-width card; the full actions stay available in details.
          actionLabel || joinLabel || payLabel ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={onActionPress || onJoinPress || onPayPress}
                style={[styles.actionButton, styles.actionButtonCompact]}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryDeep]}
                  style={[styles.actionButtonGradient, styles.actionButtonGradientCompact]}
                >
                  <Text
                    style={[styles.actionText, styles.actionTextCompact]}
                    numberOfLines={1}
                  >
                    {actionLabel || joinLabel || payLabel}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : null
        ) : actionLabel || joinLabel || payLabel ? (
          <View style={styles.actionRow}>
            {joinLabel ? (
              <TouchableOpacity
                onPress={(event) => {
                  event?.stopPropagation?.();
                  onJoinPress?.();
                }}
                style={styles.actionButton}
              >
                <LinearGradient
                  colors={
                    isJoined
                      ? [theme.colors.success, theme.colors.successDark]
                      : [theme.colors.primary, theme.colors.primaryDeep]
                  }
                  style={styles.actionButtonGradient}
                >
                  <Text style={styles.actionText}>{joinLabel}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
            {payLabel ? (
              <TouchableOpacity
                onPress={(event) => {
                  event?.stopPropagation?.();
                  onPayPress?.();
                }}
                style={styles.actionButton}
              >
                <LinearGradient
                  colors={[theme.colors.warningBright, theme.colors.dealAccent]}
                  style={styles.actionButtonGradient}
                >
                  <Text style={styles.actionText}>{payLabel}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
            {actionLabel ? (
              <TouchableOpacity onPress={onActionPress} style={styles.actionButton}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryDeep]}
                  style={styles.actionButtonGradient}
                >
                  <Text style={styles.actionText}>{actionLabel}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
