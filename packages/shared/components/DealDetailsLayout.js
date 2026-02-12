import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
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
  category,
  location,
  price,
  original,
  discountPercent,
  expiryLabel,
  joinedCount,
  targetCount,
  progressColor,
  statusLabel,
  statusColor,
  statusInline = false,
  showPricing = true,
  variant = "default",
  children,
  contentStyle,
  heroStyle,
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
          padding: 20,
          overflow: "hidden",
          borderWidth: isDashboard ? 1 : 0,
          borderColor: isDashboard ? theme.colors.border : "transparent",
          ...theme.shadow.card,
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
    Boolean(category) ||
    Boolean(location) ||
    (statusInline && Boolean(statusLabel));
  const joinedValue = toNumber(joinedCount) ?? 0;
  const targetValue = toNumber(targetCount);
  const showProgress = targetValue !== null && targetValue > 0;
  const progressRatio = showProgress
    ? Math.min(joinedValue / targetValue, 1)
    : 0;
  const resolvedProgressColor =
    progressColor ||
    (isDashboard ? theme.colors.primary : theme.colors.onPrimary);

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
          colors={[theme.colors.primary, theme.colors.purple]}
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, contentStyle]}
      >
        <View style={[styles.heroCard, heroStyle]}>
          <View style={styles.heroAccent} />
          <Text style={styles.heroTitle}>{title || "Deal"}</Text>
          {description ? (
            <Text style={styles.heroDescription} numberOfLines={3}>
              {description}
            </Text>
          ) : null}
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
              {category ? (
                <View style={styles.heroChip}>
                  <Text style={styles.heroChipText}>{category}</Text>
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
                <Text style={styles.heroPriceMuted}>Price on request</Text>
              )}
              {formattedOriginal && hasOriginal && hasDiscount ? (
                <Text style={styles.heroMrp}>MRP {formattedOriginal}</Text>
              ) : null}
              {percentOff ? (
                <View style={styles.heroDiscountBadge}>
                  <Text style={styles.heroDiscountText}>
                    {percentOff}% OFF
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {expiryLabel ? (
            <Text style={styles.heroExpiry}>{expiryLabel}</Text>
          ) : null}
          {showProgress ? (
            <View style={styles.heroProgress}>
              <View style={styles.heroProgressHeader}>
                <Text style={styles.heroProgressLabel}>
                  Joined {joinedValue} of {targetValue}
                </Text>
                <Text
                  style={[
                    styles.heroProgressPercent,
                    { color: resolvedProgressColor },
                  ]}
                >
                  {Math.round(progressRatio * 100)}%
                </Text>
              </View>
              <View style={styles.heroProgressTrack}>
                <View
                  style={[
                    styles.heroProgressFill,
                    {
                      width: `${progressRatio * 100}%`,
                      backgroundColor: resolvedProgressColor,
                    },
                  ]}
                />
              </View>
            </View>
          ) : null}
        </View>

        {children}
      </ScrollView>
    </View>
  );
}
