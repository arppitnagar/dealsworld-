import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { db } from "../config/firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import {
  getStatusColor,
  getStatusLabel,
  DetailRow,
  toDate,
  formatExpiryLabel,
  formatCountdown,
  formatINR,
  useTheme,
  SkeletonBlock,
  DealDetailsLayout,
  InfoCard,
} from "@dealsworld/shared";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";

const { width } = Dimensions.get("window");

function pickSellerDisplayName(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return null;
}

export default function DealDetails({ route, navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const initialDeal = route?.params?.deal;
  const [deal, setDeal] = useState(normalizeDeal(initialDeal));
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const isDealLoading = !deal || !deal.title;

  const joinsCount =
    safeGet(deal, "joinedUsers") ??
    safeGet(deal, "currentJoins") ??
    safeGet(deal, "joinedCount") ??
    0;
  const viewsCount = safeGet(deal, "viewsCount") ?? safeGet(deal, "views") ?? null;
  const leftCount = safeGet(deal, "leftUsers") ?? safeGet(deal, "leftCount") ?? null;
  const favoritesCountRaw =
    safeGet(deal, "favoritesCount") ?? safeGet(deal, "favouritesCount") ?? 0;
  const favoritesCount = Number.isFinite(Number(favoritesCountRaw))
    ? Number(favoritesCountRaw)
    : 0;
  const conversionRate =
    viewsCount && viewsCount > 0 ? (joinsCount / viewsCount) * 100 : null;
  const dropOffRate =
    leftCount !== null && joinsCount > 0 ? (leftCount / joinsCount) * 100 : null;
  const createdAtDate = toDate(safeGet(deal, "createdAt"));
  const approvedAtDate = toDate(deal?.approval?.approvedAt || deal?.approvedAt);
  const activeStartDate = approvedAtDate || createdAtDate;
  const thresholdReachedDate = toDate(safeGet(deal, "thresholdReachedAt"));
  const timeToThresholdSeconds =
    activeStartDate && thresholdReachedDate
      ? Math.round((thresholdReachedDate.getTime() - activeStartDate.getTime()) / 1000)
      : null;
  const target = safeGet(deal, "minGroupSize") || 1;
  const lifecycleStatus = getDealLifecycleStatus(deal);
  const accentColor = getStatusColor(lifecycleStatus, theme);

  const expiryDate = toDate(safeGet(deal, "expiresAt"));
  const countdown =
    lifecycleStatus === "active" && expiryDate
      ? formatCountdown(expiryDate.getTime() - now)
      : null;
  const expiryLabel = expiryDate ? formatExpiryLabel(expiryDate, now) : null;
  const statusLabel =
    lifecycleStatus === "pending"
      ? "Pending"
      : getStatusLabel(lifecycleStatus);
  const priceValue =
    safeGet(deal, "discountPrice") ?? safeGet(deal, "dealPrice");
  const originalValue = safeGet(deal, "originalPrice");
  const priceNumber = Number.isFinite(Number(priceValue))
    ? Number(priceValue)
    : null;
  const originalNumber = Number.isFinite(Number(originalValue))
    ? Number(originalValue)
    : null;
  const discountPercent =
    originalNumber && priceNumber && originalNumber > priceNumber
      ? Math.round(((originalNumber - priceNumber) / originalNumber) * 100)
      : null;
  const originalDisplay = discountPercent ? originalNumber : null;
  const deliveryModeLabel = String(deal?.deliveryMode || "").trim();
  const isPickup = /pick/i.test(deliveryModeLabel);
  const storeAddress =
    formatAddressText(deal?.storeAddress) ||
    formatAddressText(deal?.pickupAddress) ||
    formatAddressText(deal?.location) ||
    null;
  const sellerDisplayName = pickSellerDisplayName(
    deal?.sellerName,
    deal?.sellerDisplayName,
    profile?.displayName,
    profile?.fullName,
    profile?.name,
    user?.displayName,
    user?.email && String(user.email).includes("@")
      ? String(user.email).split("@")[0]
      : "",
  );
  const SHARE_BASE_URL = "https://dealbuddy.app/deal";
  const APP_STORE_URL = "https://apps.apple.com/app/id0000000000";
  const PLAY_STORE_URL =
    "https://play.google.com/store/apps/details?id=com.dealbuddy";
  const totalInteractions = Number(viewsCount || 0) + favoritesCount + joinsCount;
  const pulseCards = [
    {
      key: "live",
      label: "Live Pulse",
      value: formatNumber(totalInteractions),
      caption: "Total interactions on this deal",
      icon: "analytics-outline",
      colors: [theme.colors.primary, theme.colors.primaryDeep],
    },
    {
      key: "views",
      label: "View Pulse",
      value: viewsCount !== null ? formatNumber(viewsCount) : "-",
      caption: "Total deal views",
      icon: "eye-outline",
      colors: [theme.colors.primary, theme.colors.primaryDeep],
    },
    {
      key: "favorites",
      label: "Favourite Pulse",
      value: formatNumber(favoritesCount),
      caption: "Marked as favourite",
      icon: "heart-outline",
      colors: [theme.colors.danger, theme.colors.purple],
    },
    {
      key: "conversion",
      label: "Conversion Pulse",
      value: conversionRate !== null ? `${conversionRate.toFixed(1)}%` : "-",
      caption: "Joined vs total views",
      icon: "analytics-outline",
      colors: [theme.colors.success, theme.colors.primary],
    },
    {
      key: "threshold",
      label: "Minimum-Buyer Pulse",
      value:
        timeToThresholdSeconds !== null
          ? formatDuration(timeToThresholdSeconds)
          : "-",
      caption: "Time to reach threshold",
      icon: "timer-outline",
      colors: [theme.colors.amberBorder, theme.colors.primary],
    },
    {
      key: "dropoff",
      label: "Drop-off Pulse",
      value: dropOffRate !== null ? `${dropOffRate.toFixed(1)}%` : "-",
      caption: "Joined then left",
      icon: "trending-down-outline",
      colors: [theme.colors.dangerDark, theme.colors.danger],
    },
  ];

  useEffect(() => {
    if (!initialDeal?.id) return;
    const dealRef = doc(db, "deals", initialDeal.id);
    const unsubscribe = onSnapshot(dealRef, (snap) => {
      if (!snap.exists()) return;
      setDeal(normalizeDeal({ id: snap.id, ...snap.data() }));
    });
    return () => unsubscribe();
  }, [initialDeal?.id]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const handleEndCampaign = () => {
    Alert.alert(
      "End Deal",
      "Are you sure you want to end this deal early? It will be moved to 'Previous' deals.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Now",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const dealRef = doc(db, "deals", deal.id);
              await updateDoc(dealRef, { status: "completed" });
            } catch (error) {
              Alert.alert("Error", "Could not update deal status.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleShareDeal = async () => {
    if (!deal) return;
    const expiryText = expiryDate ? formatExpiryLabel(expiryDate, now) : null;
    const originalValue = Number(deal?.originalPrice);
    const discountValue = Number(
      deal?.discountPrice ?? deal?.dealPrice ?? deal?.price,
    );
    const hasOriginal = Number.isFinite(originalValue) && originalValue > 0;
    const hasDiscount = Number.isFinite(discountValue) && discountValue > 0;
    const percentOff =
      hasOriginal && hasDiscount && originalValue > discountValue
        ? Math.round(((originalValue - discountValue) / originalValue) * 100)
        : null;
    const headline = percentOff
      ? `Save ${percentOff}% on ${deal.title || "this deal"}`
      : deal.title || "Deal Details";
    const priceLine = hasOriginal
      ? `Deal Price: ${formatINR(discountValue)} | MRP ${formatINR(originalValue)}`
      : hasDiscount
        ? `Deal Price: ${formatINR(discountValue)}`
        : null;
    const shareUrl =
      deal.shareUrl || deal.link || `${SHARE_BASE_URL}/${deal.id}`;
    const storeLinks = `Install DealBuddy: iOS ${APP_STORE_URL} | Android ${PLAY_STORE_URL}`;
    const message = [
      "Check out this DealBuddy offer:",
      headline,
      priceLine,
      deal.category ? `Category: ${deal.category}` : null,
      deal.location ? `Location: ${deal.location}` : null,
      expiryText ? `Expiry: ${expiryText}` : null,
      shareUrl ? `View: ${shareUrl}` : null,
      storeLinks,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await Share.share({ message });
    } catch (error) {
      // no-op
    }
  };

  if (isDealLoading) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.skeletonContent}>
          <SkeletonBlock height={240} style={styles.skeletonHero} shimmer />
          <View style={styles.skeletonHeaderRow}>
            <SkeletonBlock width={70} height={12} shimmer />
            <SkeletonBlock width={160} height={14} shimmer />
          </View>
          <SkeletonBlock width={180} height={14} shimmer />
          <SkeletonBlock width={220} height={18} style={styles.skeletonGap} shimmer />
          <SkeletonBlock width="100%" height={10} shimmer />
          <SkeletonBlock width="90%" height={10} style={styles.skeletonGap} shimmer />
          <SkeletonBlock width="75%" height={10} shimmer />
        </ScrollView>
      </View>
    );
  }

  const editLabel = lifecycleStatus === "completed" ? "View" : "Edit";
  const editIcon =
    lifecycleStatus === "completed" ? "eye-outline" : "create-outline";

  const GradientIconButton = ({ onPress, children }) => (
    <TouchableOpacity onPress={onPress} style={styles.headerIconButton}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDeep]}
        style={styles.headerIconGradient}
      >
        <View style={styles.headerIconInner}>{children}</View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const headerBelowContent = (
    <View style={styles.headerBelowRow}>
      <View style={styles.headerActionItem}>
        <GradientIconButton onPress={handleShareDeal}>
          <Ionicons
            name="share-social-outline"
            size={16}
            color={theme.colors.onPrimary}
          />
        </GradientIconButton>
        <Text style={styles.headerActionLabel}>Share</Text>
      </View>
      <View style={styles.headerActionItem}>
        <GradientIconButton onPress={() => navigation.navigate("DealChat", { deal })}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={16}
            color={theme.colors.onPrimary}
          />
        </GradientIconButton>
        <Text style={styles.headerActionLabel}>Chat</Text>
      </View>
      <View style={styles.headerActionItem}>
        <GradientIconButton onPress={() => navigation.navigate("CreateDeal", { deal })}>
          <Ionicons
            name={editIcon}
            size={16}
            color={theme.colors.onPrimary}
          />
        </GradientIconButton>
        <Text style={styles.headerActionLabel}>{editLabel}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <DealDetailsLayout
        headerTitle="Deal Details"
        onBack={() => navigation.goBack()}
        actions={null}
        headerBelow={headerBelowContent}
        title={deal.title || "Deal"}
        description={deal.description}
        sellerName={sellerDisplayName}
        category={deal.category}
        location={deal.location}
        price={priceNumber}
        original={originalDisplay}
        discountPercent={discountPercent}
        expiryLabel={expiryLabel}
        joinedCount={joinsCount}
        targetCount={target}
        progressColor={accentColor}
        statusLabel={lifecycleStatus === "completed" ? null : statusLabel}
        statusColor={accentColor}
        statusInline
        showHeroAccent={false}
        variant="dashboard"
        contentStyle={styles.scrollContent}
      >
        <InfoCard title="Deal Insights" style={styles.insightsCard}>
          <LinearGradient
            colors={pulseCards[0].colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.insightSummaryCard}
          >
            <View style={styles.insightSummaryTextWrap}>
              <Text style={styles.insightSummaryEyebrow}>{pulseCards[0].label}</Text>
              <Text style={styles.insightSummaryValue}>{pulseCards[0].value}</Text>
              <Text style={styles.insightSummaryCaption}>
                {pulseCards[0].caption}
              </Text>
            </View>
            <View style={styles.insightSummaryIconWrap}>
              <Ionicons
                name={pulseCards[0].icon}
                size={18}
                color={theme.colors.onPrimary}
              />
            </View>
          </LinearGradient>

          <View style={styles.insightPulseGrid}>
            {pulseCards.slice(1).map((item, index, list) => (
              <LinearGradient
                key={item.key}
                colors={item.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.insightPulseCard,
                  index === list.length - 1 && list.length % 2 === 1
                    ? styles.insightPulseCardFull
                    : null,
                ]}
              >
                <View style={styles.insightPulseTopRow}>
                  <Text style={styles.insightPulseEyebrow}>{item.label}</Text>
                  <View style={styles.insightPulseIconWrap}>
                    <Ionicons
                      name={item.icon}
                      size={14}
                      color={theme.colors.onPrimary}
                    />
                  </View>
                </View>
                <Text style={styles.insightPulseValue}>{item.value}</Text>
                <Text style={styles.insightPulseCaption}>{item.caption}</Text>
              </LinearGradient>
            ))}
          </View>
        </InfoCard>

        <InfoCard title="Logistics" style={styles.logisticsCard}>
          <View style={styles.logisticsItem}>
            <View style={styles.logisticsIconWrap}>
              <Ionicons
                name="cube-outline"
                size={16}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.logisticsContent}>
              <Text style={styles.logisticsLabel}>Delivery mode</Text>
              <Text style={styles.logisticsValue}>
                {deliveryModeLabel || "-"}
              </Text>
            </View>
          </View>
          {isPickup ? (
            <>
              <View style={styles.logisticsDivider} />
              <View style={styles.logisticsItem}>
                <View style={styles.logisticsIconWrap}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.logisticsContent}>
                  <Text style={styles.logisticsLabel}>Store address</Text>
                  <Text style={styles.logisticsValue}>
                    {storeAddress || "-"}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </InfoCard>

        {countdown ? (
          <DetailRow
            icon="time-outline"
            label="Ends"
            value={countdown}
            color={accentColor}
          />
        ) : null}

      </DealDetailsLayout>

      {lifecycleStatus === "active" && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.endBtn}
            onPress={handleEndCampaign}
            disabled={loading}
          >
            <Text style={styles.endBtnText}>
              {loading ? "Processing..." : "End Campaign Early"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.dashboardBg },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
    gap: 20,
  },
  headerBelowRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 12,
  },
  headerActionItem: {
    alignItems: "center",
    gap: 4,
  },
  headerActionLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.colors.onPrimaryMuted,
  },
  headerIconButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  headerIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconInner: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: theme.colors.onPrimarySoft,
    borderWidth: 1,
    borderColor: theme.colors.onPrimaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  insightsCard: {
    backgroundColor: theme.colors.surfaceGlass,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  insightSummaryCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  insightSummaryTextWrap: {
    flex: 1,
    gap: 2,
  },
  insightSummaryEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.onPrimaryMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  insightSummaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.onPrimary,
    lineHeight: 30,
  },
  insightSummaryCaption: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.onPrimaryMuted,
  },
  insightSummaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.onPrimarySoft,
    borderWidth: 1,
    borderColor: theme.colors.onPrimaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  insightPulseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  insightPulseCard: {
    width: "48%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  insightPulseCardFull: {
    width: "100%",
  },
  insightPulseTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  insightPulseEyebrow: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.onPrimaryMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  insightPulseIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: theme.colors.onPrimarySoft,
    borderWidth: 1,
    borderColor: theme.colors.onPrimaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  insightPulseValue: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.onPrimary,
    lineHeight: 24,
  },
  insightPulseCaption: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.onPrimaryMuted,
    lineHeight: 12,
  },
  logisticsCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  logisticsItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 6,
  },
  logisticsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.infoSoft,
    borderWidth: 1,
    borderColor: theme.colors.infoBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  logisticsContent: {
    flex: 1,
    gap: 4,
  },
  logisticsDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.6,
    marginVertical: 8,
  },
  logisticsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  logisticsValue: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
    lineHeight: 18,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    width: width,
    padding: 20,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceLight,
  },
  endBtn: {
    backgroundColor: theme.colors.dangerSoftAlt,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  endBtnText: { color: theme.colors.error, fontWeight: "800" },
  skeletonContent: {
    padding: 20,
    gap: 12,
  },
  skeletonHero: {
    borderRadius: 18,
    marginBottom: 12,
  },
  skeletonHeaderRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  skeletonGap: {
    marginTop: 8,
  },
});

function safeGet(obj, key) {
  if (!obj) return undefined;
  return obj[key];
}

function getDealLifecycleStatus(deal) {
  const approvalStatus = String(
    deal?.approvalStatus || deal?.approval?.status || "",
  ).toLowerCase();
  const approved = deal?.approved === true;
  const approvedAt = deal?.approval?.approvedAt || deal?.approvedAt;
  const status = String(deal?.status || "").toLowerCase();
  const isAdminPublished =
    approvalStatus === "approved" || approved || Boolean(approvedAt);

  if (status === "completed") return "completed";
  if (approvalStatus === "rejected" || status === "rejected") return "rejected";
  if (isAdminPublished) return "active";
  return "pending";
}

function normalizeDeal(deal) {
  if (!deal) return {};
  const normalized = { ...deal };
  if (normalized.createdAt?.toDate) {
    normalized.createdAt = normalized.createdAt.toDate();
  }
  if (normalized.updatedAt?.toDate) {
    normalized.updatedAt = normalized.updatedAt.toDate();
  }
  if (normalized.expiresAt?.toDate) {
    normalized.expiresAt = normalized.expiresAt.toDate();
  }
  if (normalized.thresholdReachedAt?.toDate) {
    normalized.thresholdReachedAt = normalized.thresholdReachedAt.toDate();
  }
  return normalized;
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`;
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(1)}K`;
  return String(Math.round(numeric));
}

function formatAddressText(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value !== "object") return "";

  const fullName = value.name || value.fullName || value.recipientName;
  const cityLine = [value.city, value.state, value.pincode]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .join(", ");

  const parts = [fullName, value.line1, value.line2, cityLine, value.country]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);

  const phone = String(value.phone || value.mobile || "").trim();
  if (phone) {
    parts.push(`Phone: ${phone}`);
  }

  return parts.join("\n");
}
