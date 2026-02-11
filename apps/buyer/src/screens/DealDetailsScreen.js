import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Modal,
  Animated,
  Easing,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from "react-native";
import { Heart, MessageCircle } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  InfoCard,
  toDate,
  formatExpiryLabel,
  formatINR,
  SkeletonBlock,
  DealDetailsLayout,
  useTheme,
  EmptyState,
} from "@dealsworld/shared";
import {
  useDeals,
  useRecordDealView,
  useLeaveDeal,
  useJoinDeal,
} from "../hooks/useDeals";
import { useDealState } from "../hooks/useDealState";
import { useAddresses } from "../hooks/useAddresses";
import { useDealReviews } from "../hooks/useDealReviews";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";

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

function formatCityLine(city, state, pincode) {
  const parts = [city, state, pincode].filter(Boolean);
  return parts.join(", ");
}

function formatReviewDate(value) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`;
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(1)}K`;
  return String(Math.round(numeric));
}

export default function DealDetailsScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const SHARE_BASE_URL = "https://dealbuddy.app/deal";
  const APP_STORE_URL = "https://apps.apple.com/app/id0000000000";
  const PLAY_STORE_URL =
    "https://play.google.com/store/apps/details?id=com.dealbuddy";
  const { dealId } = route.params || {};
  const { data: deals, isLoading } = useDeals();
  const { mutate: recordView } = useRecordDealView();
  const { mutate: joinDeal, isLoading: joining } = useJoinDeal();
  const { mutate: leaveDeal, isLoading: leaving } = useLeaveDeal();
  const { addresses, loading: addressesLoading } = useAddresses();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const {
    reviews,
    myReview,
    loading: reviewsLoading,
    submitReview,
  } = useDealReviews(dealId);
  const {
    dealStates,
    viewedIds,
    favoriteIds,
    joinedIds,
    markViewed,
    toggleFavorite,
    markJoined,
    unmarkJoined,
    loading: dealStateLoading,
    setDeliveryAddress,
  } = useDealState();
  const hasRecorded = useRef(false);
  const [showJoinSuccess, setShowJoinSuccess] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const insets = useSafeAreaInsets();
  const successScale = useRef(new Animated.Value(0.9)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const reviewPrefilledRef = useRef(false);
  const isBuyer = profile?.role ? profile.role === "buyer" : true;

  const deal = useMemo(
    () => deals?.find((d) => d.id === dealId),
    [deals, dealId],
  );
  const dealState = useMemo(
    () => (dealId ? dealStates.get(dealId) : null),
    [dealId, dealStates],
  );
  const hasJoined = Boolean(dealId && joinedIds.has(dealId));
  const isFavorite = Boolean(dealId && favoriteIds.has(dealId));
  const joinCountRaw = deal?.currentJoins ?? deal?.joinedUsers ?? 0;
  const joinCount = Number.isFinite(Number(joinCountRaw))
    ? Number(joinCountRaw)
    : 0;
  const viewsCountRaw = deal?.viewsCount ?? deal?.views ?? 0;
  const viewsCount = Number.isFinite(Number(viewsCountRaw))
    ? Number(viewsCountRaw)
    : 0;
  const favoritesCountRaw =
    deal?.favoritesCount ?? deal?.favouritesCount ?? 0;
  const favoritesCount = Number.isFinite(Number(favoritesCountRaw))
    ? Number(favoritesCountRaw)
    : 0;
  const minGroupSizeRaw = deal?.minGroupSize ?? deal?.minThreshold ?? 1;
  const minGroupSize = Number.isFinite(Number(minGroupSizeRaw))
    ? Number(minGroupSizeRaw)
    : 1;
  const thresholdReached =
    joinCount >= minGroupSize || Boolean(deal?.thresholdReachedAt);
  const deliveryModeLabel = String(deal?.deliveryMode || "").trim();
  const isPickup = /pick/i.test(deliveryModeLabel);
  const storeAddress =
    deal?.storeAddress || deal?.pickupAddress || deal?.location || null;
  const requiresDeliveryAddress =
    deliveryModeLabel.length > 0 && !/pick/i.test(deliveryModeLabel);
  const deliveryAddress = useMemo(() => {
    if (dealState?.deliveryAddress) return dealState.deliveryAddress;
    if (dealState?.deliveryAddressId && addresses?.length) {
      return (
        addresses.find((item) => item.id === dealState.deliveryAddressId) ||
        null
      );
    }
    return null;
  }, [addresses, dealState]);

  useEffect(() => {
    if (!dealId || hasRecorded.current || dealStateLoading) return;
    if (!viewedIds.has(dealId)) {
      recordView(dealId, {
        onSuccess: () => markViewed(dealId),
      });
    }
    hasRecorded.current = true;
  }, [dealId, dealStateLoading, markViewed, recordView, viewedIds]);

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

  useEffect(() => {
    if (!showAddressModal) return;
    if (!addresses || addresses.length === 0) return;
    const defaultAddress =
      addresses.find((item) => item.isDefault) || addresses[0];
    const preferredId =
      dealState?.deliveryAddressId || defaultAddress?.id || null;
    setSelectedAddressId((prev) => {
      if (prev && addresses.some((item) => item.id === prev)) return prev;
      return preferredId;
    });
  }, [addresses, dealState?.deliveryAddressId, showAddressModal]);

  useEffect(() => {
    if (!myReview || reviewPrefilledRef.current) return;
    const nextRating = Number(myReview.rating) || 0;
    setRatingValue(nextRating);
    setCommentText(myReview.comment || "");
    reviewPrefilledRef.current = true;
  }, [myReview]);

  const handleToggleFavorite = () => {
    if (!dealId) return;
    toggleFavorite(dealId);
  };

  const handleConfirmAddress = () => {
    const address = addresses?.find((item) => item.id === selectedAddressId);
    if (!address) {
      Alert.alert("Select address", "Please choose a delivery address.");
      return;
    }
    setShowAddressModal(false);
    if (hasJoined) {
      setDeliveryAddress(dealId, address, deal?.deliveryMode);
      return;
    }
    handleJoin(address);
  };

  const handleJoin = (address) => {
    if (joining) return;
    joinDeal(
      { dealId, createdAt: deal?.createdAt },
      {
        onSuccess: () => {
          markJoined(dealId);
          if (address) {
            setDeliveryAddress(dealId, address, deal?.deliveryMode);
          }
          setShowJoinSuccess(true);
        },
        onError: (error) => {
          const message =
            error?.response?.data?.error ||
            error?.message ||
            "Unable to join this deal.";
          Alert.alert("Join failed", message);
        },
      },
    );
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

    const introLine =
      "Hey Buddy! Just snagged a sizzling deal on DealBuddy 🔥 Check this out!";
    const lineParts = [
      introLine,
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

  const handleSubmitReview = async () => {
    if (!dealId) return;
    if (!isBuyer) {
      Alert.alert("Not allowed", "Only buyers can submit reviews.");
      return;
    }
    if (!user?.uid) {
      Alert.alert("Login required", "Please sign in to leave a review.");
      return;
    }
    if (submittingReview) return;

    try {
      setSubmittingReview(true);
      await submitReview({
        rating: ratingValue,
        comment: commentText,
        displayName: profile?.displayName || user?.displayName,
      });
      Alert.alert("Thanks!", "Your rating has been saved.");
    } catch (error) {
      const message =
        error?.message || "We could not save your review. Please try again.";
      Alert.alert("Review failed", message);
    } finally {
      setSubmittingReview(false);
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
        <GradientButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ borderRadius: theme.radii.md }}
        />
      </View>
    );
  }

  const expiryDate = toDate(deal.expiresAt || deal.expiryTime);
  const expiryLabel = expiryDate ? formatExpiryLabel(expiryDate) : null;
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
  const originalDisplay = percentOff ? originalValue : null;
  const ratingCountRaw = deal?.ratingCount ?? 0;
  const ratingCount = Number.isFinite(Number(ratingCountRaw))
    ? Number(ratingCountRaw)
    : 0;
  const ratingAvgRaw = deal?.ratingAvg ?? deal?.rating ?? null;
  const ratingAvg = Number.isFinite(Number(ratingAvgRaw))
    ? Number(ratingAvgRaw)
    : null;
  const ratingLabel =
    ratingCount > 0 && ratingAvg !== null ? ratingAvg.toFixed(1) : "0.0";
  const insights = [
    {
      key: "views",
      label: "Views",
      value: formatNumber(viewsCount),
      icon: "eye-outline",
    },
    {
      key: "favorites",
      label: "Marked as favourite",
      value: formatNumber(favoritesCount),
      icon: "heart-outline",
    },
    {
      key: "joined",
      label: "Total joined",
      value: formatNumber(joinCount),
      icon: "people-outline",
    },
  ];

  const handleToggleJoin = () => {
    if (!dealId) return;
    if (!hasJoined && thresholdReached) {
      Alert.alert(
        "Deal unlocked",
        "Minimum group size already reached. Joining is closed for this deal.",
      );
      return;
    }
    if (hasJoined) {
      if (leaving) return;
      leaveDeal(dealId, {
        onSuccess: () => {
          unmarkJoined(dealId);
        },
      });
      return;
    }

    if (requiresDeliveryAddress) {
      if (!addressesLoading && (!addresses || addresses.length === 0)) {
        Alert.alert(
          "Delivery address needed",
          "Please add a delivery address before joining this deal.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Add Address",
              onPress: () => navigation.navigate("AddressForm"),
            },
          ],
        );
        return;
      }
      setShowAddressModal(true);
      return;
    }

    handleJoin();
  };

  const GradientButton = ({
    title,
    onPress,
    loading,
    disabled,
    leftIcon,
    rightIcon,
    style,
    textStyle,
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.gradientButtonWrap,
        style,
        (disabled || loading) && styles.gradientButtonDisabled,
      ]}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.purple]}
        style={styles.gradientButton}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.onPrimary} />
        ) : (
          <View style={styles.gradientButtonContent}>
            {leftIcon ? (
              <View style={styles.gradientButtonIconWrap}>{leftIcon}</View>
            ) : null}
            <Text style={[styles.gradientButtonText, textStyle]}>{title}</Text>
            {rightIcon ? (
              <View style={styles.gradientButtonIcon}>{rightIcon}</View>
            ) : null}
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const GradientIconButton = ({ onPress, children, disabled }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={styles.headerIconButton}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.purple]}
        style={styles.headerIconGradient}
      >
        <View style={styles.headerIconInner}>{children}</View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const headerBelowContent = (
    <View style={styles.headerBelowRow}>
      <View style={styles.headerActionItem}>
        <GradientIconButton
          onPress={handleToggleJoin}
          disabled={joining || leaving || (!hasJoined && thresholdReached)}
        >
          {joining || leaving ? (
            <ActivityIndicator color={theme.colors.onPrimary} size="small" />
          ) : !hasJoined && thresholdReached ? (
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={theme.colors.onPrimary}
            />
          ) : (
            <Ionicons
              name={hasJoined ? "exit-outline" : "person-add-outline"}
              size={16}
              color={hasJoined ? theme.colors.danger : theme.colors.onPrimary}
            />
          )}
        </GradientIconButton>
        <Text style={styles.headerActionLabel}>
          {hasJoined ? "Leave" : thresholdReached ? "Locked" : "Join"}
        </Text>
      </View>
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
        <GradientIconButton
          onPress={() =>
            navigation.navigate("DealChat", { dealId: deal.id, deal })
          }
        >
          <MessageCircle size={16} color={theme.colors.onPrimary} />
        </GradientIconButton>
        <Text style={styles.headerActionLabel}>Chat</Text>
      </View>
      <View style={styles.headerActionItem}>
        <GradientIconButton onPress={handleToggleFavorite}>
          <Heart
            size={16}
            color={isFavorite ? theme.colors.danger : theme.colors.onPrimary}
            fill={isFavorite ? theme.colors.danger : "transparent"}
          />
        </GradientIconButton>
        <Text style={styles.headerActionLabel}>Liked</Text>
      </View>
    </View>
  );

  return (
    <>
      <DealDetailsLayout
        headerTitle="Deal Details"
        onBack={() => navigation.goBack()}
        actions={null}
        headerBelow={headerBelowContent}
        title={deal.title || "Deal"}
        description={deal.description}
        category={deal.category}
        location={deal.location}
        price={primaryPrice}
        original={originalDisplay}
        discountPercent={percentOff}
        expiryLabel={expiryLabel}
        joinedCount={joinCount}
        targetCount={minGroupSize}
        progressColor={theme.colors.primary}
        variant="dashboard"
        contentStyle={styles.scrollContent}
      >
        <InfoCard title="Deal Insights" style={styles.insightsCard}>
          <View style={styles.insightsGrid}>
            {insights.map((item) => (
              <View key={item.key} style={styles.insightTile}>
                <View style={styles.insightIconWrap}>
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.insightValue}>{item.value}</Text>
                <Text style={styles.insightLabel}>{item.label}</Text>
              </View>
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

        <InfoCard title="Ratings & Reviews" style={styles.reviewCard}>
          <View style={styles.reviewSummaryRow}>
            <View>
              <Text style={styles.reviewSummaryValue}>{ratingLabel}</Text>
              <Text style={styles.reviewSummarySub}>
                {ratingCount > 0
                  ? `${ratingCount} rating${ratingCount === 1 ? "" : "s"}`
                  : "No ratings yet"}
              </Text>
            </View>
            <View style={styles.reviewStars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.reviewStarButton,
                    !isBuyer && styles.reviewStarButtonDisabled,
                  ]}
                  onPress={() => isBuyer && setRatingValue(value)}
                  disabled={!isBuyer}
                >
                  <Ionicons
                    name={value <= ratingValue ? "star" : "star-outline"}
                    size={22}
                    color={
                      value <= ratingValue
                        ? theme.colors.warningBright
                        : theme.colors.textMuted
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {isBuyer ? (
            <View style={styles.reviewInputWrap}>
              <Text style={styles.reviewInputLabel}>
                {myReview ? "Update your review" : "Leave a review"}
              </Text>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Share your experience..."
                placeholderTextColor={theme.colors.textMuted}
                style={styles.reviewInput}
                multiline
              />
              <GradientButton
                title={
                  submittingReview
                    ? "Saving..."
                    : myReview
                      ? "Update Review"
                      : "Submit Review"
                }
                onPress={handleSubmitReview}
                disabled={submittingReview}
                style={styles.reviewSubmitButton}
              />
            </View>
          ) : (
            <Text style={styles.reviewEmptyText}>
              Only buyers can leave reviews.
            </Text>
          )}

          <View style={styles.reviewList}>
            {reviewsLoading ? (
              <Text style={styles.reviewEmptyText}>Loading reviews...</Text>
            ) : reviews?.length ? (
              reviews.map((item) => (
                <View key={item.id} style={styles.reviewItem}>
                  <View style={styles.reviewItemHeader}>
                    <Text style={styles.reviewUser}>
                      {item.userName || "Buyer"}
                    </Text>
                    <Text style={styles.reviewDate}>
                      {formatReviewDate(item.createdAt || item.updatedAt)}
                    </Text>
                  </View>
                  <View style={styles.reviewRatingRow}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Ionicons
                        key={value}
                        name={value <= Number(item.rating) ? "star" : "star-outline"}
                        size={16}
                        color={
                          value <= Number(item.rating)
                            ? theme.colors.warningBright
                            : theme.colors.textMuted
                        }
                      />
                    ))}
                  </View>
                  {item.comment ? (
                    <Text style={styles.reviewComment}>{item.comment}</Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.reviewEmptyText}>
                Be the first to rate this deal.
              </Text>
            )}
          </View>
        </InfoCard>

        {requiresDeliveryAddress && hasJoined ? (
          <InfoCard title="Delivery Address" style={styles.deliveryCard}>
            {deliveryAddress ? (
              <View>
                {deliveryAddress.name ? (
                  <Text style={styles.deliveryLine}>{deliveryAddress.name}</Text>
                ) : null}
                <Text style={styles.deliveryLine}>
                  {deliveryAddress.line1 || ""}
                </Text>
                {deliveryAddress.line2 ? (
                  <Text style={styles.deliveryLine}>
                    {deliveryAddress.line2}
                  </Text>
                ) : null}
                <Text style={styles.deliveryLine}>
                  {formatCityLine(
                    deliveryAddress.city,
                    deliveryAddress.state,
                    deliveryAddress.pincode,
                  )}
                </Text>
                {deliveryAddress.phone ? (
                  <Text style={styles.deliveryPhone}>
                    {deliveryAddress.phone}
                  </Text>
                ) : null}
                <Text style={styles.deliveryMeta}>
                  Delivery mode: {deliveryModeLabel || "Delivery"}
                </Text>
              </View>
            ) : (
              <Text style={styles.deliveryMeta}>
                No delivery address saved yet.
              </Text>
            )}

            <View style={styles.deliveryActions}>
              <GradientButton
                title={deliveryAddress ? "Change Address" : "Add Address"}
                onPress={() => {
                  if (!addressesLoading && (!addresses || addresses.length === 0)) {
                    Alert.alert(
                      "No saved address",
                      "Please add a delivery address to continue.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Add Address",
                          onPress: () => navigation.navigate("AddressForm"),
                        },
                      ],
                    );
                    return;
                  }
                  setShowAddressModal(true);
                }}
                style={styles.deliveryActionButton}
              />
            </View>
          </InfoCard>
        ) : null}
      </DealDetailsLayout>

      {showAddressModal && (
        <Modal
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddressModal(false)}
        >
          <View style={styles.addressOverlay}>
            <View
              style={[
                styles.addressSheet,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <View style={styles.addressHeader}>
                <Text style={styles.addressTitle}>Select delivery address</Text>
                <TouchableOpacity
                  style={styles.addressClose}
                  onPress={() => setShowAddressModal(false)}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.addressSubtitle}>
                Delivery mode: {deliveryModeLabel || "Delivery"}
              </Text>

              {addressesLoading ? (
                <Text style={styles.addressLoading}>Loading addresses...</Text>
              ) : addresses?.length ? (
                <ScrollView
                  style={styles.addressList}
                  contentContainerStyle={styles.addressListContent}
                  showsVerticalScrollIndicator={false}
                >
                  {addresses.map((item) => {
                    const selected = item.id === selectedAddressId;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.addressOption,
                          selected && styles.addressOptionSelected,
                        ]}
                        onPress={() => setSelectedAddressId(item.id)}
                      >
                        <View style={styles.addressOptionHeader}>
                          <View style={styles.addressTag}>
                            <Text style={styles.addressTagText}>
                              {item.label || "Address"}
                            </Text>
                          </View>
                          {item.isDefault ? (
                            <View style={styles.addressDefaultTag}>
                              <Ionicons
                                name="star"
                                size={12}
                                color={theme.colors.warningBright}
                              />
                              <Text style={styles.addressDefaultText}>
                                Default
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {item.name ? (
                          <Text style={styles.addressLine}>{item.name}</Text>
                        ) : null}
                        <Text style={styles.addressLine}>{item.line1 || ""}</Text>
                        {item.line2 ? (
                          <Text style={styles.addressLine}>{item.line2}</Text>
                        ) : null}
                        <Text style={styles.addressLine}>
                          {formatCityLine(item.city, item.state, item.pincode)}
                        </Text>
                        {item.phone ? (
                          <Text style={styles.addressPhone}>{item.phone}</Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.addressEmptyWrap}>
                  <EmptyState
                    icon="location-outline"
                    title="No saved addresses"
                    subtitle="Add one to continue."
                  />
                </View>
              )}

              <View style={styles.addressActions}>
                <GradientButton
                  title="Add Address"
                  onPress={() => {
                    setShowAddressModal(false);
                    navigation.navigate("AddressForm");
                  }}
                  style={styles.addressActionButton}
                />
                <GradientButton
                  title="Use Selected Address"
                  onPress={handleConfirmAddress}
                  disabled={!selectedAddressId}
                  style={styles.addressActionButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

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
    </>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 56,
    gap: 20,
  },
  gradientButtonWrap: {
    borderRadius: 20,
    overflow: "hidden",
    ...theme.shadow.card,
  },
  gradientButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  gradientButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: "800",
    fontSize: 16,
  },
  gradientButtonIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.onPrimarySoft,
    borderWidth: 1,
    borderColor: theme.colors.onPrimaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientButtonIcon: {
    marginHorizontal: 6,
  },
  gradientButtonDisabled: {
    opacity: 0.65,
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
  headerActionItem: {
    alignItems: "center",
    gap: 4,
  },
  headerActionLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.colors.onPrimaryMuted,
  },
  headerBelowRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 12,
  },
  insightsCard: {
    backgroundColor: theme.colors.surfaceGlass,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  insightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  insightTile: {
    flexBasis: "48%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.infoBorder,
    backgroundColor: theme.colors.surfaceLighter,
    minHeight: 84,
    justifyContent: "space-between",
  },
  insightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.infoSoft,
    borderWidth: 1,
    borderColor: theme.colors.infoBorder,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  logisticsCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logisticsItem: {
    flexDirection: "row",
    alignItems: "center",
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
  },
  reviewCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  reviewSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  reviewSummaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.text,
  },
  reviewSummarySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  reviewStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewStarButton: {
    padding: 2,
  },
  reviewStarButtonDisabled: {
    opacity: 0.5,
  },
  reviewInputWrap: {
    marginTop: 12,
    gap: 10,
  },
  reviewInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  reviewInput: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    textAlignVertical: "top",
  },
  reviewSubmitButton: {
    borderRadius: theme.radii.lg,
  },
  reviewList: {
    marginTop: 16,
    gap: 12,
  },
  reviewItem: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reviewItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  reviewUser: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  reviewDate: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  reviewRatingRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
  },
  reviewComment: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.text,
  },
  reviewEmptyText: {
    fontSize: 12,
    color: theme.colors.textMuted,
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
  deliveryCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deliveryLine: {
    color: theme.colors.text,
    fontSize: 12,
    marginBottom: 2,
  },
  deliveryPhone: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  deliveryMeta: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 8,
  },
  deliveryActions: {
    marginTop: 12,
  },
  deliveryActionButton: {
    borderRadius: theme.radii.md,
  },
  addressOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlaySoft,
    justifyContent: "flex-end",
  },
  addressSheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "80%",
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
  },
  addressSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  addressClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  addressLoading: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 16,
  },
  addressList: {
    marginBottom: 16,
  },
  addressListContent: {
    paddingBottom: 12,
    gap: 12,
  },
  addressOption: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 14,
    backgroundColor: theme.colors.surface,
  },
  addressOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.infoSoft,
  },
  addressOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  addressTag: {
    backgroundColor: theme.colors.infoSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addressTagText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  addressDefaultTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
  },
  addressDefaultText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  addressLine: {
    color: theme.colors.text,
    fontSize: 12,
    marginBottom: 2,
  },
  addressPhone: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  addressEmptyWrap: {
    paddingVertical: 20,
    alignItems: "center",
  },
  addressActions: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 16,
  },
  addressActionButton: {
    flex: 1,
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




