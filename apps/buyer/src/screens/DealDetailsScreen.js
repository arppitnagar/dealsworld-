import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Modal,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import { Heart, MessageCircle } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppButton,
  InfoCard,
  toDate,
  formatINR,
  theme,
  SkeletonBlock,
  DealFormFields,
} from "@dealsworld/shared";
import {
  useDeals,
  useRecordDealView,
  useLeaveDeal,
  useJoinDeal,
} from "../hooks/useDeals";
import { hasViewedDeal, markViewedDeal } from "../utils/viewCache";
import {
  hasSubscribedDeal,
  markSubscribedDeal,
  unmarkSubscribedDeal,
} from "../utils/subscriptionCache";
import {
  hasFavoritedDeal,
  toggleFavoritedDeal,
} from "../utils/favoriteCache";

const IST_OFFSET_MINUTES = 330;
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatExpiresAtIST(expiryMs) {
  if (typeof expiryMs !== "number") return null;
  const istMs = expiryMs + IST_OFFSET_MINUTES * 60 * 1000;
  const istDate = new Date(istMs);
  const day = String(istDate.getUTCDate()).padStart(2, "0");
  const month = MONTHS_SHORT[istDate.getUTCMonth()];
  const year = istDate.getUTCFullYear();
  const hours = String(istDate.getUTCHours()).padStart(2, "0");
  const minutes = String(istDate.getUTCMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes} IST`;
}

export default function DealDetailsScreen({ route, navigation }) {
  const SHARE_BASE_URL = "https://dealbuddy.app/deal";
  const APP_STORE_URL = "https://apps.apple.com/app/id0000000000";
  const PLAY_STORE_URL =
    "https://play.google.com/store/apps/details?id=com.dealbuddy";
  const { dealId } = route.params || {};
  const { data: deals, isLoading } = useDeals();
  const { mutate: recordView } = useRecordDealView();
  const { mutate: joinDeal, isLoading: joining } = useJoinDeal();
  const { mutate: leaveDeal, isLoading: leaving } = useLeaveDeal();
  const hasRecorded = useRef(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showJoinSuccess, setShowJoinSuccess] = useState(false);
  const insets = useSafeAreaInsets();
  const successScale = useRef(new Animated.Value(0.9)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const deal = useMemo(
    () => deals?.find((d) => d.id === dealId),
    [deals, dealId],
  );
  const detailForm = useMemo(() => {
    if (!deal) {
      return {
        title: "",
        description: "",
        category: "",
        categoryOther: "",
        deliveryMode: "",
        deliveryCharge: "",
        originalPrice: "",
        discountPrice: "",
        minGroupSize: "",
        expiresAt: null,
        location: "",
      };
    }

    const formatMoney = (value) =>
      value === null || value === undefined || value === ""
        ? ""
        : formatINR(value);

    return {
      title: deal.title || "",
      description: deal.description || "",
      category: deal.category || "",
      categoryOther: "",
      deliveryMode: deal.deliveryMode || "",
      deliveryCharge: formatMoney(deal.deliveryCharge),
      originalPrice: formatMoney(deal.originalPrice),
      discountPrice: formatMoney(deal.discountPrice),
      minGroupSize:
        deal.minGroupSize === null || deal.minGroupSize === undefined
          ? ""
          : String(deal.minGroupSize),
      expiresAt: toDate(deal.expiresAt || deal.expiryTime),
      location: deal.location || "",
    };
  }, [deal]);
  const dealImage = deal?.imageUrl || deal?.image || null;

  useEffect(() => {
    if (!dealId || hasRecorded.current) return;
    if (!hasViewedDeal(dealId)) {
      recordView(dealId, {
        onSuccess: () => markViewedDeal(dealId),
      });
    }
    hasRecorded.current = true;
    if (hasSubscribedDeal(dealId)) {
      setHasJoined(true);
    }
    setIsFavorite(hasFavoritedDeal(dealId));
  }, [dealId, recordView]);

  useEffect(() => {
    if (!showJoinSuccess) return;
    successScale.setValue(0.9);
    successOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(successScale, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    const timer = setTimeout(() => setShowJoinSuccess(false), 1400);
    return () => clearTimeout(timer);
  }, [showJoinSuccess, successOpacity, successScale]);

  const handleToggleFavorite = () => {
    if (!dealId) return;
    const nextValue = toggleFavoritedDeal(dealId);
    setIsFavorite(nextValue);
  };

  const handleShareDeal = async () => {
    if (!deal) return;
    const expiryDate = toDate(deal.expiresAt || deal.expiryTime);
    const expiryText = expiryDate
      ? formatExpiresAtIST(expiryDate.getTime())
      : null;
    const originalValue = Number(deal.originalPrice);
    const discountValue = Number(deal.discountPrice);
    const hasOriginal = Number.isFinite(originalValue) && originalValue > 0;
    const hasDiscount = Number.isFinite(discountValue) && discountValue > 0;
    const percentOff =
      hasOriginal && hasDiscount && originalValue > discountValue
        ? Math.round(((originalValue - discountValue) / originalValue) * 100)
        : null;

    const priceLine = hasOriginal
      ? `Deal Price: ${formatINR(discountValue)} | MRP ${formatINR(originalValue)}`
      : hasDiscount
        ? `Deal Price: ${formatINR(discountValue)}`
        : null;

    const headline = percentOff
      ? `Save ${percentOff}% on ${deal.title || "this deal"}`
      : deal.title || "Deal Details";

    const shareUrl =
      deal.shareUrl ||
      deal.link ||
      `${SHARE_BASE_URL}/${deal.id}`;
    const storeLinks = `Install DealBuddy: iOS ${APP_STORE_URL} | Android ${PLAY_STORE_URL}`;

    const lineParts = [
      headline,
      priceLine,
      deal.category ? `Category: ${deal.category}` : null,
      deal.location ? `Location: ${deal.location}` : null,
      expiryText ? `Expiry: ${expiryText}` : null,
      shareUrl ? `View: ${shareUrl}` : null,
      storeLinks,
    ].filter(Boolean);

    const message = lineParts.join("\n");

    try {
      await Share.share({
        message,
      });
    } catch (error) {
      // no-op: sharing can fail if the sheet is dismissed
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <SkeletonBlock height={220} style={styles.skeletonHero} shimmer />
        <View style={styles.skeletonHeaderRow}>
          <SkeletonBlock width={70} height={12} shimmer />
          <SkeletonBlock width={160} height={14} shimmer />
        </View>
        <SkeletonBlock width={180} height={14} shimmer />
        <SkeletonBlock
          width={220}
          height={18}
          style={styles.skeletonGap}
          shimmer
        />
        <SkeletonBlock width="100%" height={10} shimmer />
        <SkeletonBlock
          width="90%"
          height={10}
          style={styles.skeletonGap}
          shimmer
        />
        <SkeletonBlock width="75%" height={10} shimmer />
      </View>
    );
  }

  if (!deal) {
    return (
      <View style={styles.notFoundScreen}>
        <Text style={styles.notFoundText}>Deal not found.</Text>
        <AppButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{
            backgroundColor: theme.colors.text,
            borderColor: theme.colors.text,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: theme.radii.md,
          }}
          textStyle={{ color: theme.colors.onPrimary }}
        />
      </View>
    );
  }

  const expiryDate = toDate(deal.expiresAt || deal.expiryTime);
  const expiryLabel = expiryDate
    ? formatExpiresAtIST(expiryDate.getTime())
    : "Not set";
  const originalValue = Number(deal.originalPrice);
  const discountValue = Number(deal.discountPrice);
  const hasOriginal = Number.isFinite(originalValue) && originalValue > 0;
  const hasDiscount = Number.isFinite(discountValue) && discountValue > 0;
  const percentOff =
    hasOriginal && hasDiscount && originalValue > discountValue
      ? Math.round(((originalValue - discountValue) / originalValue) * 100)
      : null;
  const primaryPrice =
    hasDiscount ? discountValue : hasOriginal ? originalValue : null;

  const handleToggleJoin = () => {
    if (!dealId) return;
    if (hasJoined) {
      if (leaving) return;
      leaveDeal(dealId, {
        onSuccess: () => {
          setHasJoined(false);
          unmarkSubscribedDeal(dealId);
        },
      });
      return;
    }

    if (joining) return;
    joinDeal(
      { dealId, createdAt: deal?.createdAt },
      {
        onSuccess: () => {
          markSubscribedDeal(dealId);
          setHasJoined(true);
          setShowJoinSuccess(true);
        },
      },
    );
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deal Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShareDeal} style={styles.iconButton}>
            <Ionicons
              name="share-social-outline"
              size={18}
              color={theme.colors.onPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("DealChat", { dealId: deal.id, deal })
            }
            style={styles.iconButton}
          >
            <MessageCircle size={18} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleToggleFavorite}
            style={styles.iconButton}
          >
            <Heart
              size={18}
              color={isFavorite ? theme.colors.danger : theme.colors.onPrimary}
              fill={isFavorite ? theme.colors.danger : "transparent"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroAccent} />
          <Text style={styles.heroTitle}>{deal.title || "Deal"}</Text>
          <View style={styles.heroMetaRow}>
            {deal.category ? (
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>{deal.category}</Text>
              </View>
            ) : null}
            {deal.location ? (
              <View style={styles.heroChipOutline}>
                <Text style={styles.heroChipOutlineText}>{deal.location}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.heroPriceRow}>
            {primaryPrice !== null ? (
              <Text style={styles.heroPrice}>{formatINR(primaryPrice)}</Text>
            ) : (
              <Text style={styles.heroPriceMuted}>Price on request</Text>
            )}
            {hasOriginal && hasDiscount ? (
              <Text style={styles.heroMrp}>
                MRP {formatINR(originalValue)}
              </Text>
            ) : null}
            {percentOff ? (
              <View style={styles.heroDiscountBadge}>
                <Text style={styles.heroDiscountText}>{percentOff}% OFF</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroExpiry}>Expires: {expiryLabel}</Text>
        </View>

        <View style={styles.detailsCard}>
          <DealFormFields
            form={detailForm}
            errors={{}}
            image={dealImage}
            isReadOnly
            isExpiryLocked
            showImage={Boolean(dealImage)}
          />
        </View>

        <InfoCard title="Participation" style={styles.actionCard}>
          <AppButton
            title={
              hasJoined
                ? leaving
                  ? "Leaving..."
                  : "Leave Deal"
                : joining
                  ? "Joining..."
                  : "Join Deal"
            }
            onPress={handleToggleJoin}
            loading={joining || leaving}
            disabled={joining || leaving}
            style={hasJoined ? styles.leaveButton : styles.joinButton}
            textStyle={
              hasJoined ? styles.leaveButtonText : styles.joinButtonText
            }
          />
          <Text style={styles.actionHint}>
            {hasJoined
              ? "You are part of this deal."
              : "Join to unlock group savings."}
          </Text>
        </InfoCard>
      </ScrollView>

      {showJoinSuccess && (
        <Modal transparent animationType="fade">
          <View style={styles.successOverlay}>
            <Animated.View
              style={[
                styles.successCard,
                {
                  transform: [{ scale: successScale }],
                  opacity: successOpacity,
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={64}
                color={theme.colors.success}
              />
              <Text style={styles.successText}>Joined!</Text>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  iconButton: {
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
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
    ...theme.shadow.card,
  },
  heroAccent: {
    width: 56,
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.onPrimary,
    opacity: 0.7,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.onPrimary,
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
    backgroundColor: theme.colors.onPrimarySoft,
  },
  heroChipText: {
    color: theme.colors.onPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  heroChipOutline: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.onPrimaryMuted,
    backgroundColor: theme.colors.onPrimaryFaint,
  },
  heroChipOutlineText: {
    color: theme.colors.onPrimary,
    fontSize: 12,
    fontWeight: "600",
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
    color: theme.colors.onPrimary,
  },
  heroPriceMuted: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.onPrimarySoft,
  },
  heroMrp: {
    fontSize: 12,
    color: theme.colors.onPrimaryMuted,
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
    color: theme.colors.onPrimaryMuted,
  },
  detailsCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
    gap: 12,
  },
  skeletonHero: {
    borderRadius: 18,
    width: "100%",
  },
  skeletonHeaderRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  skeletonGap: {
    marginTop: 8,
  },
  notFoundScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
  },
  notFoundText: {
    color: theme.colors.textMuted,
    fontWeight: "600",
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: theme.colors.infoSoft,
    borderColor: theme.colors.primary,
    borderWidth: 1,
    ...theme.shadow.card,
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  joinButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: "700",
  },
  leaveButton: {
    backgroundColor: theme.colors.amberSoft,
    borderColor: theme.colors.amberBorder,
    borderRadius: theme.radii.md,
  },
  leaveButtonText: {
    color: theme.colors.amberText,
    fontWeight: "700",
  },
  actionHint: {
    marginTop: 8,
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlaySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  successCard: {
    backgroundColor: theme.colors.background,
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: theme.colors.text,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  successText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
});




