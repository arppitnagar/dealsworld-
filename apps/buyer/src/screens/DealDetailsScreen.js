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
  StyleSheet,
  TextInput,
} from "react-native";
import { Heart, MessageCircle } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppButton,
  InfoCard,
  toDate,
  formatINR,
  SkeletonBlock,
  DealFormFields,
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
  const minGroupSizeRaw = deal?.minGroupSize ?? deal?.minThreshold ?? 1;
  const minGroupSize = Number.isFinite(Number(minGroupSizeRaw))
    ? Number(minGroupSizeRaw)
    : 1;
  const thresholdReached =
    joinCount >= minGroupSize || Boolean(deal?.thresholdReachedAt);
  const deliveryModeLabel = String(deal?.deliveryMode || "").trim();
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
              <AppButton
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

        <InfoCard title="Participation" style={styles.actionCard}>
          <AppButton
            title={
              hasJoined
                ? leaving
                  ? "Leaving..."
                  : "Leave Deal"
                : thresholdReached
                  ? "Threshold Reached"
                  : joining
                    ? "Joining..."
                    : "Join Deal"
            }
            onPress={handleToggleJoin}
            loading={joining || leaving}
            disabled={joining || leaving || (!hasJoined && thresholdReached)}
            style={hasJoined ? styles.leaveButton : styles.joinButton}
            textStyle={
              hasJoined ? styles.leaveButtonText : styles.joinButtonText
            }
          />
          <Text style={styles.actionHint}>
            {hasJoined
              ? "You are part of this deal."
              : thresholdReached
                ? "This deal already reached its minimum group size."
                : "Join to unlock group savings."}
          </Text>
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
              <AppButton
                title={deliveryAddress ? "Change Address" : "Add Address"}
                variant="secondary"
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
      </ScrollView>

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
                <AppButton
                  title="Add Address"
                  variant="secondary"
                  onPress={() => {
                    setShowAddressModal(false);
                    navigation.navigate("AddressForm");
                  }}
                  style={styles.addressActionButton}
                />
                <AppButton
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
    </View>
  );
}

const createStyles = (theme) =>
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
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
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




