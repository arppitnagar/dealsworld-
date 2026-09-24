import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useI18n } from "../i18n/I18nProvider";
import { getCategoryLabel } from "../utils/dealCategories";
import { formatINR } from "../utils/formatters";
import StatusPill from "./StatusPill";

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatMoney(value) {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  return formatINR(numeric);
}

export default function DealDetailsLayout({
  headerTitle = "Deal Details",
  onBack,
  actions,
  headerBelow,
  title,
  description,
  // Rendered right under the description - the buyer app puts its
  // "Translated from ... · Show original" toggle here.
  descriptionNote,
  sellerName,
  category,
  location,
  price,
  original,
  discountPercent,
  priceNote,
  expiryLabel,
  joinedCount,
  targetCount,
  maxCount,
  tierBoundaries,
  progressColor,
  statusLabel,
  statusColor,
  statusInline = false,
  showHeroAccent = true,
  showPricing = true,
  variant = "default",
  children,
  contentStyle,
  heroStyle,
  footer,
  image,
  images,
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const gallery = useMemo(() => {
    if (Array.isArray(images) && images.length) return images.filter(Boolean);
    return image ? [image] : [];
  }, [images, image]);
  const hasImageProp = images !== undefined || image !== undefined;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [heroImageWidth, setHeroImageWidth] = useState(0);
  const statusBarHeight =
    Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const topInset = Math.max(insets.top, statusBarHeight, 16);
  const compactTopInset = Math.max(insets.top, statusBarHeight, 12);
  const isDashboard = variant === "dashboard";
  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          backgroundColor: theme.colors.dashboardBg,
        },
        keyboardWrap: {
          flex: 1,
        },
        headerBar: {
          backgroundColor: theme.colors.primary,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.onPrimarySoft,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        },
        headerGradient: {
          paddingHorizontal: 20,
          paddingBottom: 18,
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
        },
        backButton: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.colors.onPrimarySoft,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 0,
        },
        headerTitle: {
          flex: 1,
          textAlign: "center",
          fontSize: 22,
          fontWeight: "800",
          color: theme.colors.onPrimary,
        },
        headerActions: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        headerBelowWrap: {
          marginTop: 12,
          alignItems: "center",
        },
        actionButton: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.colors.onPrimarySoft,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 0,
        },
        scrollContent: {
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 56,
          gap: 20,
        },
        heroCard: {
          backgroundColor: isDashboard ? theme.colors.surface : theme.colors.primary,
          borderRadius: 24,
          overflow: "hidden",
          borderWidth: isDashboard ? 1 : 0,
          borderColor: isDashboard ? theme.colors.border : "transparent",
          ...theme.shadow.card,
        },
        heroImageWrap: {
          height: 180,
          backgroundColor: theme.colors.surfaceLight,
        },
        heroImage: {
          width: "100%",
          height: "100%",
        },
        heroImagePlaceholder: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        heroImageDots: {
          position: "absolute",
          bottom: 10,
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "center",
          gap: 5,
        },
        heroImageDot: {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: "rgba(255,255,255,0.5)",
        },
        heroImageDotActive: {
          width: 16,
          backgroundColor: theme.colors.onPrimary,
        },
        heroBody: {
          padding: 20,
        },
        heroAccent: {
          width: 56,
          height: 6,
          borderRadius: 999,
          backgroundColor: isDashboard ? theme.colors.primary : theme.colors.onPrimary,
          opacity: isDashboard ? 1 : 0.7,
          marginBottom: 12,
        },
        heroTitle: {
          fontSize: 30,
          fontWeight: "800",
          color: isDashboard ? theme.colors.text : theme.colors.onPrimary,
        },
        heroDescription: {
          marginTop: 6,
          fontSize: 14,
          fontWeight: "600",
          color: isDashboard ? theme.colors.textMuted : theme.colors.onPrimaryMuted,
        },
        heroMetaRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 10,
        },
        heroChip: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: isDashboard
            ? theme.colors.infoSoft
            : theme.colors.onPrimarySoft,
        },
        heroChipText: {
          color: isDashboard ? theme.colors.primary : theme.colors.onPrimary,
          fontSize: 12,
          fontWeight: "700",
        },
        heroChipOutline: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: isDashboard ? theme.colors.border : theme.colors.onPrimaryMuted,
          backgroundColor: isDashboard
            ? theme.colors.surfaceMuted
            : theme.colors.onPrimaryFaint,
        },
        heroChipOutlineText: {
          color: isDashboard ? theme.colors.text : theme.colors.onPrimary,
          fontSize: 12,
          fontWeight: "600",
        },
        heroStatusChip: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: statusColor || theme.colors.primary,
        },
        heroStatusChipText: {
          color: theme.colors.onPrimary,
          fontSize: 12,
          fontWeight: "700",
        },
        heroPriceRow: {
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 14,
        },
        heroPrice: {
          fontSize: 22,
          fontWeight: "800",
          color: isDashboard ? theme.colors.text : theme.colors.onPrimary,
        },
        heroPriceMuted: {
          fontSize: 16,
          fontWeight: "600",
          color: isDashboard ? theme.colors.textMuted : theme.colors.onPrimarySoft,
        },
        heroMrp: {
          fontSize: 12,
          color: isDashboard ? theme.colors.textMuted : theme.colors.onPrimaryMuted,
          textDecorationLine: "line-through",
        },
        heroDiscountBadge: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: theme.colors.warningBright,
        },
        heroDiscountText: {
          color: theme.colors.onPrimary,
          fontSize: 11,
          fontWeight: "800",
        },
        heroExpiry: {
          marginTop: 12,
          fontSize: 12,
          color: isDashboard ? theme.colors.textMuted : theme.colors.onPrimaryMuted,
        },
        heroPriceNote: {
          marginTop: 6,
          fontSize: 12,
          fontWeight: "700",
          color: theme.colors.dealAccent,
        },
        heroProgress: {
          marginTop: 14,
          gap: 8,
        },
        heroProgressHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        heroProgressLabel: {
          fontSize: 12,
          fontWeight: "700",
          color: isDashboard ? theme.colors.text : theme.colors.onPrimary,
        },
        heroProgressPercent: {
          fontSize: 12,
          fontWeight: "800",
        },
        heroProgressTrack: {
          height: 10,
          borderRadius: 999,
          backgroundColor: isDashboard
            ? theme.colors.surfaceLight
            : theme.colors.onPrimarySoft,
          overflow: "hidden",
        },
        heroProgressFill: {
          height: "100%",
          borderRadius: 999,
        },
        heroProgressFillExtra: {
          position: "absolute",
          top: 0,
          bottom: 0,
          borderRadius: 999,
        },
        heroProgressMarker: {
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: isDashboard
            ? theme.colors.surface
            : theme.colors.onPrimary,
        },
        heroProgressBadge: {
          alignSelf: "flex-start",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: theme.colors.successSoft,
        },
        heroProgressBadgeText: {
          fontSize: 11,
          fontWeight: "700",
          color: theme.colors.successDark,
        },
        statusWrap: {
          marginTop: 10,
        },
      }),
    [isDashboard, statusColor, theme],
  );

  const formattedPrice = formatMoney(price);
  const formattedOriginal = formatMoney(original);
  const priceValue = toNumber(price);
  const originalValue = toNumber(original);
  const hasOriginal = originalValue !== null && originalValue > 0;
  const hasDiscount = priceValue !== null && priceValue > 0;
  const computedPercent =
    hasOriginal && hasDiscount && originalValue > priceValue
      ? Math.round(((originalValue - priceValue) / originalValue) * 100)
      : null;
  const percentOff =
    typeof discountPercent === "number" ? discountPercent : computedPercent;
  const showMeta =
    Boolean(sellerName) ||
    Boolean(category) ||
    Boolean(location) ||
    (statusInline && Boolean(statusLabel));
  const joinedValue = toNumber(joinedCount) ?? 0;
  const targetValue = toNumber(targetCount);
  const maxValueRaw = toNumber(maxCount);
  const maxValue = maxValueRaw && maxValueRaw > (targetValue || 0) ? maxValueRaw : null;
  const showProgress = targetValue !== null && targetValue > 0;
  const thresholdReached = showProgress && joinedValue >= targetValue;
  const isFull = Boolean(maxValue) && joinedValue >= maxValue;
  // Past the minimum with no seller-set cap, there's no meaningful "out of"
  // denominator left to show (the deal just keeps growing) - this state gets
  // its own label/percent instead of falling through to "Joined X of {min}",
  // which used to read as a nonsensical "Joined 3 of 2" once buyers kept
  // joining past a reached minimum.
  const isUncappedPastMin = thresholdReached && !maxValue;
  // Once the minimum is hit the deal keeps accepting joiners (up to an
  // optional maxGroupSize cap) instead of closing, so the bar's denominator
  // becomes the cap when one exists - the min is then just a marker inside
  // it, not the finish line.
  const basis = showProgress ? maxValue || targetValue : 0;
  const guaranteedRatio = showProgress
    ? Math.min(joinedValue, targetValue) / basis
    : 0;
  // Only meaningful when there's a cap to be proportional against - without
  // one this would compute a width that overflows the (clipped) track and
  // never actually render, so it's just skipped.
  const extraRatio =
    showProgress && maxValue
      ? Math.max(0, Math.min(joinedValue, maxValue) - targetValue) / basis
      : 0;
  const markerRatio = showProgress && maxValue ? targetValue / basis : null;
  // Tier-price drop points, only meaningful once there's a cap giving the
  // bar a fixed width to be proportional against (see basis above) - in an
  // uncapped deal the bar past the minimum has no fixed scale left to place
  // these on, so they're skipped there.
  const tierMarkerRatios =
    showProgress && maxValue && Array.isArray(tierBoundaries)
      ? tierBoundaries
          .map((b) => toNumber(b))
          .filter((b) => b !== null && b > 0 && b < maxValue)
          .map((b) => b / basis)
      : [];
  const percentLabel = showProgress
    ? Math.round((maxValue ? Math.min(joinedValue, maxValue) / maxValue : Math.min(joinedValue / targetValue, 1)) * 100)
    : 0;
  const resolvedProgressColor =
    progressColor ||
    (isDashboard ? theme.colors.primary : theme.colors.onPrimary);
  const fillColor = thresholdReached ? theme.colors.success : resolvedProgressColor;
  const headerLabel = maxValue
    ? t("dealCard.joinedOfMax", { count: Math.min(joinedValue, maxValue), max: maxValue })
    : isUncappedPastMin
      ? t(joinedValue === 1 ? "dealLayout.buyersJoinedOne" : "dealLayout.buyersJoined", { count: joinedValue })
      : t("dealCard.joinedOfTarget", { count: joinedValue, target: targetValue });

  const headerContent = (
    <>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={20} color={theme.colors.onPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{headerTitle}</Text>
      <View style={styles.headerActions}>
        {Array.isArray(actions)
          ? actions.map((action) => (
              <TouchableOpacity
                key={action.key}
                onPress={action.onPress}
                style={styles.actionButton}
                disabled={action.disabled}
              >
                {action.icon}
              </TouchableOpacity>
            ))
          : actions}
      </View>
    </>
  );

  return (
    <View style={styles.screen}>
      {isDashboard ? (
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDeep]}
          style={[styles.headerGradient, { paddingTop: topInset }]}
        >
          <View style={[styles.headerBar, { backgroundColor: "transparent" }]}>
            {headerContent}
          </View>
          {headerBelow ? (
            <View style={styles.headerBelowWrap}>{headerBelow}</View>
          ) : null}
        </LinearGradient>
      ) : (
        <View style={{ backgroundColor: theme.colors.primary }}>
          <View style={[styles.headerBar, { paddingTop: compactTopInset }]}>
            {headerContent}
          </View>
          {headerBelow ? (
            <View style={styles.headerBelowWrap}>{headerBelow}</View>
          ) : null}
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, contentStyle]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.heroCard, heroStyle]}>
          {hasImageProp ? (
            <View
              style={styles.heroImageWrap}
              onLayout={(event) => setHeroImageWidth(event.nativeEvent.layout.width)}
            >
              {gallery.length ? (
                <>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    scrollEnabled={gallery.length > 1}
                    onMomentumScrollEnd={(event) => {
                      if (!heroImageWidth) return;
                      const index = Math.round(
                        event.nativeEvent.contentOffset.x / heroImageWidth,
                      );
                      setActiveImageIndex(index);
                    }}
                  >
                    {gallery.map((uri, index) => (
                      <Image
                        key={`${uri}-${index}`}
                        source={{ uri }}
                        style={[
                          styles.heroImage,
                          heroImageWidth ? { width: heroImageWidth } : null,
                        ]}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                  {gallery.length > 1 ? (
                    <View style={styles.heroImageDots}>
                      {gallery.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.heroImageDot,
                            index === activeImageIndex && styles.heroImageDotActive,
                          ]}
                        />
                      ))}
                    </View>
                  ) : null}
                </>
              ) : (
                <View style={styles.heroImagePlaceholder}>
                  <Ionicons
                    name="image-outline"
                    size={28}
                    color={theme.colors.textMuted}
                  />
                </View>
              )}
            </View>
          ) : null}
          <View style={styles.heroBody}>
          {showHeroAccent ? <View style={styles.heroAccent} /> : null}
          <Text style={styles.heroTitle}>{title || t("dealLayout.deal")}</Text>
          {description ? (
            <Text style={styles.heroDescription} numberOfLines={3}>
              {description}
            </Text>
          ) : null}
          {descriptionNote || null}
          {statusLabel && !statusInline ? (
            <View style={styles.statusWrap}>
              <StatusPill label={statusLabel} color={statusColor} />
            </View>
          ) : null}
          {showMeta ? (
            <View style={styles.heroMetaRow}>
              {statusInline && statusLabel ? (
                <View style={styles.heroStatusChip}>
                  <Text style={styles.heroStatusChipText}>{statusLabel}</Text>
                </View>
              ) : null}
              {sellerName ? (
                <View style={styles.heroChipOutline}>
                  <Text style={styles.heroChipOutlineText}>{sellerName}</Text>
                </View>
              ) : null}
              {category ? (
                <View style={styles.heroChip}>
                  <Text style={styles.heroChipText}>{getCategoryLabel(category, t)}</Text>
                </View>
              ) : null}
              {location ? (
                <View style={styles.heroChipOutline}>
                  <Text style={styles.heroChipOutlineText}>{location}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {showPricing ? (
            <View style={styles.heroPriceRow}>
              {formattedPrice ? (
                <Text style={styles.heroPrice}>{formattedPrice}</Text>
              ) : (
                <Text style={styles.heroPriceMuted}>{t("dealLayout.priceOnRequest")}</Text>
              )}
              {formattedOriginal && hasOriginal && hasDiscount ? (
                <Text style={styles.heroMrp}>{t("dealLayout.mrp", { price: formattedOriginal })}</Text>
              ) : null}
              {percentOff ? (
                <View style={styles.heroDiscountBadge}>
                  <Text style={styles.heroDiscountText}>
                    {t("dealLayout.percentOff", { percent: percentOff })}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {priceNote ? <Text style={styles.heroPriceNote}>{priceNote}</Text> : null}
          {expiryLabel ? (
            <Text style={styles.heroExpiry}>{expiryLabel}</Text>
          ) : null}
          {showProgress ? (
            <View style={styles.heroProgress}>
              <View style={styles.heroProgressHeader}>
                <Text style={styles.heroProgressLabel}>{headerLabel}</Text>
                <Text style={[styles.heroProgressPercent, { color: fillColor }]}>
                  {isUncappedPastMin ? t("dealCard.guaranteed") : `${percentLabel}%`}
                </Text>
              </View>
              <View style={styles.heroProgressTrack}>
                <View
                  style={[
                    styles.heroProgressFill,
                    {
                      width: `${guaranteedRatio * 100}%`,
                      backgroundColor: fillColor,
                    },
                  ]}
                />
                {extraRatio > 0 ? (
                  <View
                    style={[
                      styles.heroProgressFillExtra,
                      {
                        left: `${guaranteedRatio * 100}%`,
                        width: `${extraRatio * 100}%`,
                        backgroundColor: fillColor,
                        opacity: 0.45,
                      },
                    ]}
                  />
                ) : null}
                {markerRatio !== null && markerRatio < 1 ? (
                  <View
                    style={[
                      styles.heroProgressMarker,
                      { left: `${markerRatio * 100}%` },
                    ]}
                  />
                ) : null}
                {tierMarkerRatios.map((ratio, index) => (
                  <View
                    key={`tier-marker-${index}`}
                    style={[
                      styles.heroProgressMarker,
                      { left: `${ratio * 100}%`, opacity: 0.5 },
                    ]}
                  />
                ))}
              </View>
              {thresholdReached ? (
                <View style={styles.heroProgressBadge}>
                  <Text style={styles.heroProgressBadgeText}>
                    {isFull ? t("dealLayout.full") : t("dealLayout.minimumReached")}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          </View>
        </View>

        {children}
      </ScrollView>
      </KeyboardAvoidingView>

      {footer}
    </View>
  );
}
