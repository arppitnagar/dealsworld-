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
  TextInput,
} from "react-native";
import { Heart } from "lucide-react-native";
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
  IconActionBar,
  useTheme,
  EmptyState,
  AppButton,
  OtpDisplay,
  OtpInput,
  PickupQrDisplay,
  StatusPill,
  getDealImages,
  PriceBreakupModal,
  calculatePriceBreakup,
  resolveTierPrice,
  getNextTierInfo,
  ConfirmModal,
  useConfirmModal,
  useI18n,
  getLanguageInfo,
  normalizeLanguage,
  getDeliveryModeLabel,
  getCategoryLabel,
} from "@dealsworld/shared";
import { getAddressLabel } from "../utils/addressLabels";
import {
  useDeals,
  useJoinedDeals,
  useRecordDealView,
  useLeaveDeal,
  useJoinDeal,
  useDealTranslation,
} from "../hooks/useDeals";
import {
  useMyDelivery,
  useConfirmDelivery,
  usePayForDeal,
} from "../hooks/useDeliveryStatus";
import { isUnsuccessfulDeal, isPastCampaign } from "../utils/dealCategories";
import { useDealState } from "../hooks/useDealState";
import { useAddresses } from "../hooks/useAddresses";
import { useDealReviews } from "../hooks/useDealReviews";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";

const SHOW_RATINGS_AND_REVIEWS = false;

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

function formatReviewDate(value, language = "en") {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString(`${language}-IN`, {
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

function getSellerDisplayName(deal) {
  const candidates = [deal?.sellerName, deal?.sellerDisplayName, deal?.vendorName];
  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (text) return text;
  }
  return null;
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
  const { data: joinedDeals } = useJoinedDeals();
  const { mutate: recordView } = useRecordDealView();
  const { mutate: joinDeal, isLoading: joining } = useJoinDeal();
  const { mutate: leaveDeal, isLoading: leaving } = useLeaveDeal();
  const { data: myDelivery } = useMyDelivery(dealId);
  const { language, t } = useI18n();
  const { data: translation } = useDealTranslation(dealId);
  const [showOriginal, setShowOriginal] = useState(false);
  const { mutate: confirmDelivery, isPending: confirmingDelivery } = useConfirmDelivery();
  const { mutate: payForDeal, isPending: paying } = usePayForDeal();
  const [otpValue, setOtpValue] = useState("");
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
  const { confirm, alert, confirmModalProps } = useConfirmModal();
  const hasRecorded = useRef(false);
  const [successFeedback, setSuccessFeedback] = useState(null);
  const [showBreakupModal, setShowBreakupModal] = useState(false);
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
    () =>
      deals?.find((d) => d.id === dealId) ||
      joinedDeals?.find((d) => d.id === dealId),
    [deals, joinedDeals, dealId],
  );
  // Deal lists only translate titles (apps/backend/src/translation.js); the
  // description is translated when the deal is opened (useDealTranslation).
  // Until that arrives, this shows whatever the list already had.
  const localized = useMemo(() => {
    const translatedTitle = translation?.title || deal?.title || "";
    const translatedDescription = translation?.description ?? deal?.description;
    return {
      translatedTitle,
      translatedDescription,
      originalTitle: translation?.originalTitle || deal?.originalTitle || translatedTitle,
      originalDescription: translation?.originalDescription ?? deal?.description,
      isTranslated: Boolean(translation?.translatedTo || deal?.translatedTo),
      sourceLanguage: normalizeLanguage(translation?.sourceLanguage || deal?.sourceLanguage),
    };
  }, [translation, deal]);
  const displayTitle = showOriginal ? localized.originalTitle : localized.translatedTitle;
  const displayDescription = showOriginal
    ? localized.originalDescription
    : localized.translatedDescription;
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
  const maxGroupSizeRaw = deal?.maxGroupSize;
  const maxGroupSize =
    maxGroupSizeRaw === null || maxGroupSizeRaw === undefined || maxGroupSizeRaw === ""
      ? null
      : Number(maxGroupSizeRaw);
  // Reaching the minimum no longer closes the deal - it keeps accepting
  // buyers (giving the seller more scope to sell) until an optional seller
  // set cap is hit, which is the only thing that actually blocks joining.
  const dealFull =
    Number.isFinite(maxGroupSize) && maxGroupSize > 0 && joinCount >= maxGroupSize;
  const deliveryModeRaw = String(deal?.deliveryMode || "").trim();
  const deliveryModeLabel = getDeliveryModeLabel(deliveryModeRaw, t);
  const isPickup = /pick/i.test(deliveryModeRaw);
  const storeAddress =
    formatAddressText(deal?.storeAddress) ||
    formatAddressText(deal?.pickupAddress) ||
    formatAddressText(deal?.location) ||
    null;
  const sellerDisplayName =
    getSellerDisplayName(deal);
  const requiresDeliveryAddress =
    deliveryModeLabel.length > 0 && !/pick/i.test(deliveryModeLabel);
  const deliveryStatus = hasJoined ? myDelivery?.deliveryStatus || null : null;
  const showDeliverySection =
    (requiresDeliveryAddress || isPickup) && hasJoined && Boolean(deliveryStatus);
  const isUnsuccessful = isUnsuccessfulDeal(deal);
  const showUnsuccessfulSection = hasJoined && isUnsuccessful;
  const myPaymentStatus = hasJoined ? myDelivery?.paymentStatus || "unpaid" : null;
  const showPaymentSection =
    hasJoined && (requiresDeliveryAddress || isPickup) && !showUnsuccessfulSection && Boolean(myPaymentStatus);
  // Once paid, the address is locked - the seller/delivery flow relies on
  // whatever was on file at that point, so letting a buyer swap it out
  // afterward (even post-OTP) would silently desync it from what's actually
  // being shipped. The deal-level completed/expired check is a second,
  // independent lock (not just the buyer's own payment status) so a deal
  // that finished through any path - including older joins from before the
  // payment/delivery flow existed, where paymentStatus may still read the
  // "unpaid" default - still locks the address once its campaign has ended.
  const isDealEnded = isPastCampaign(deal);
  const canEditAddress =
    !hasJoined ||
    (!isDealEnded && (myPaymentStatus === null || myPaymentStatus === "unpaid"));
  const deliveryHeroStatus = showUnsuccessfulSection
    ? { label: t("delivery.unsuccessful"), color: theme.colors.error }
    : deliveryStatus === "delivered"
      ? { label: t("delivery.delivered"), color: theme.colors.success }
      : deliveryStatus === "in_transit"
        ? { label: t("delivery.inTransit"), color: theme.colors.primary }
        : deliveryStatus === "ready_for_pickup"
          ? { label: t("delivery.readyForPickup"), color: theme.colors.primary }
          : null;
  const hasAnyAddress = Array.isArray(addresses) && addresses.length > 0;
  const defaultAddress = useMemo(
    () => (hasAnyAddress ? addresses.find((item) => item.isDefault) || null : null),
    [addresses, hasAnyAddress],
  );
  const hasDefaultAddress = Boolean(defaultAddress);
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
    hasRecorded.current = false;
  }, [dealId]);

  useEffect(() => {
    if (!dealId || hasRecorded.current || dealStateLoading) return;
    if (!viewedIds.has(dealId)) {
      // Keep UI responsive even if backend view-tracking is delayed/unavailable.
      markViewed(dealId).catch((error) => {
        console.warn("Failed to persist viewed state:", error);
      });
      recordView(dealId, {
        onError: (error) => {
          console.warn("Record view failed:", error);
        },
      });
    }
    hasRecorded.current = true;
  }, [dealId, dealStateLoading, markViewed, recordView, viewedIds]);

  useEffect(() => {
    if (!successFeedback) return;
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
    const timer = setTimeout(() => setSuccessFeedback(null), 1400);
    return () => clearTimeout(timer);
  }, [successFeedback, successOpacity, successScale]);

  useEffect(() => {
    if (!showAddressModal) return;
    if (!addresses || addresses.length === 0) return;
    const preferredId =
      dealState?.deliveryAddressId || defaultAddress?.id || null;
    setSelectedAddressId((prev) => {
      if (prev && addresses.some((item) => item.id === prev)) return prev;
      return preferredId || addresses[0]?.id || null;
    });
  }, [addresses, dealState?.deliveryAddressId, defaultAddress?.id, showAddressModal]);

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

  const handleConfirmAddress = async () => {
    const address = addresses?.find((item) => item.id === selectedAddressId);
    if (!address) {
      await alert({ title: t("dealDetails.selectAddressTitle"), message: t("dealDetails.selectAddressMessage") });
      return;
    }
    setShowAddressModal(false);
    if (hasJoined) {
      setDeliveryAddress(dealId, address, deal?.deliveryMode).catch((error) => {
        console.warn("Failed to persist delivery address:", error);
      });
      return;
    }
    handleJoin(address);
  };

  const handleJoin = async (address) => {
    if (joining) return;
    const ok = await confirm({
      title: t("dealDetails.joinConfirmTitle"),
      message: t("dealDetails.joinConfirmMessage"),
      confirmText: t("dealDetails.joinConfirmButton"),
    });
    if (!ok) return;
    const deliveryAddressPayload = address || dealState?.deliveryAddress || null;
    joinDeal(
      {
        dealId,
        createdAt: deal?.createdAt,
        deliveryAddress: deliveryAddressPayload,
      },
      {
        onSuccess: () => {
          markJoined(dealId).catch((error) => {
            console.warn("Failed to persist joined state:", error);
          });
          if (address) {
            setDeliveryAddress(dealId, address, deal?.deliveryMode).catch((error) => {
              console.warn("Failed to persist delivery address:", error);
            });
          }
          setSuccessFeedback("join");
        },
        onError: (error) => {
          console.warn("Join deal failed:", error);
          const isNetworkIssue =
            !error?.response &&
            (String(error?.code || "").toUpperCase() === "ERR_NETWORK" ||
              String(error?.message || "")
                .toLowerCase()
                .includes("network"));
          const message =
            isNetworkIssue
              ? t("dealDetails.joinNetworkError")
              : error?.response?.data?.error ||
                error?.message ||
                t("dealDetails.joinError");
          alert({ title: t("dealDetails.joinFailed"), message, destructive: true });
        },
      },
    );
  };

  const handlePay = async () => {
    if (!dealId || paying) return;
    const ok = await confirm({
      title: t("dealDetails.payConfirmTitle"),
      message: t("dealDetails.payConfirmMessage", { amount: formatINR(priceBreakup.total) }),
      confirmText: t("dealDetails.payNow"),
    });
    if (!ok) return;
    payForDeal(dealId, {
      onError: (error) => {
        const message =
          error?.response?.data?.error || error?.message || t("dealDetails.payError");
        alert({ title: t("dealDetails.payFailed"), message, destructive: true });
      },
    });
  };

  const handleConfirmDelivery = () => {
    if (!dealId || otpValue.length !== 6 || confirmingDelivery) return;
    confirmDelivery(
      { dealId, otp: otpValue },
      {
        onSuccess: () => {
          setOtpValue("");
          setSuccessFeedback("delivered");
        },
        onError: (error) => {
          const message =
            error?.response?.data?.error || error?.message || t("dealDetails.confirmDeliveryError");
          alert({ title: t("dealDetails.incorrectCode"), message, destructive: true });
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
      ? t("share.priceWithMrp", { price: formatINR(discountValue), mrp: formatINR(originalValue) })
      : hasDiscount
        ? t("share.price", { price: formatINR(discountValue) })
        : null;

    const headline = percentOff
      ? t("share.headline", { percent: percentOff, title: displayTitle || t("share.thisDeal") })
      : displayTitle || t("dealDetails.title");

    const shareUrl =
      deal.shareUrl ||
      deal.link ||
      `${SHARE_BASE_URL}/${deal.id}`;
    const storeLinks = t("share.install", { ios: APP_STORE_URL, android: PLAY_STORE_URL });

    const introLine = t("share.intro");
    const lineParts = [
      introLine,
      headline,
      priceLine,
      deal.category ? t("share.category", { category: getCategoryLabel(deal.category, t) }) : null,
      deal.location ? t("share.location", { location: deal.location }) : null,
      expiryText ? t("share.expiry", { expiry: expiryText }) : null,
      shareUrl ? t("share.view", { url: shareUrl }) : null,
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
      await alert({ title: t("reviews.notAllowed"), message: t("reviews.onlyBuyersSubmit") });
      return;
    }
    if (!user?.uid) {
      await alert({ title: t("reviews.loginRequired"), message: t("reviews.signInToReview") });
      return;
    }
    if (submittingReview) return;

    const ok = await confirm({
      title: t("reviews.confirmTitle"),
      message: t("reviews.confirmMessage"),
      confirmText: t("reviews.submit"),
    });
    if (!ok) return;

    try {
      setSubmittingReview(true);
      await submitReview({
        rating: ratingValue,
        comment: commentText,
        displayName: profile?.displayName || user?.displayName,
      });
      await alert({ title: t("reviews.thanks"), message: t("reviews.saved"), tone: "success" });
    } catch (error) {
      const message =
        error?.message || t("reviews.saveError");
      await alert({ title: t("reviews.failed"), message, destructive: true });
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
        <Text style={styles.notFoundText}>{t("dealDetails.notFound")}</Text>
        <AppButton
          title={t("dealDetails.goBack")}
          onPress={() => navigation.goBack()}
          style={{ borderRadius: theme.radii.md }}
        />
      </View>
    );
  }

  const expiryDate = toDate(deal.expiresAt || deal.expiryTime);
  const expiryLabel = expiryDate ? formatExpiryLabel(expiryDate, Date.now(), t, language) : null;
  const originalValue = Number(deal.originalPrice);
  const hasOriginal = Number.isFinite(originalValue) && originalValue > 0;
  // The live price at the current headcount - equal to deal.discountPrice
  // for a flat-price deal, or the active tier's price for a dynamically
  // priced one. This is what /pay actually charges (see routes/deals.js),
  // so showing anything else here would mislead the buyer about what
  // they're about to pay.
  const livePrice = resolveTierPrice(deal, joinCount);
  const hasDiscount = Number.isFinite(livePrice) && livePrice > 0;
  const percentOff =
    hasOriginal && hasDiscount && originalValue > livePrice
      ? Math.round(((originalValue - livePrice) / originalValue) * 100)
      : null;
  const primaryPrice =
    hasDiscount ? livePrice : hasOriginal ? originalValue : null;
  const originalDisplay = percentOff ? originalValue : null;
  const nextTierInfo = getNextTierInfo(deal, joinCount);
  const tierBoundaries = Array.isArray(deal?.pricingTiers)
    ? deal.pricingTiers.slice(1).map((tier) => tier?.minBuyers)
    : null;
  const priceBreakup = calculatePriceBreakup({
    basePrice: primaryPrice || 0,
    gstPercent: deal.gstPercent,
    deliveryMode: deal.deliveryMode,
    deliveryCharge: deal.deliveryCharge,
  });
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
  const totalInteractions = viewsCount + favoritesCount + joinCount;
  const pulseCards = [
    {
      key: "live",
      label: t("insights.live"),
      value: formatNumber(totalInteractions),
      caption: t("insights.liveCaption"),
      icon: "analytics-outline",
      colors: [theme.colors.primary, theme.colors.primaryDeep],
    },
    {
      key: "favorite",
      label: t("insights.favourite"),
      value: formatNumber(favoritesCount),
      caption: t("insights.favouriteCaption"),
      icon: "heart-outline",
      colors: [theme.colors.danger, theme.colors.purple],
    },
    {
      key: "joined",
      label: t("insights.join"),
      value: formatNumber(joinCount),
      caption: t("insights.joinCaption"),
      icon: "people-outline",
      colors: [theme.colors.success, theme.colors.primary],
    },
  ];

  const handleToggleJoin = async () => {
    if (!dealId) return;
    if (joining || leaving) {
      await alert({
        title: t("dealDetails.pleaseWait"),
        message: t("dealDetails.updatingStatus"),
      });
      return;
    }
    if (!hasJoined && dealFull) {
      await alert({
        title: t("dealDetails.fullTitle"),
        message: t("dealDetails.fullMessage"),
      });
      return;
    }
    if (hasJoined) {
      if (leaving) return;
      const ok = await confirm({
        title: t("dealDetails.leaveConfirmTitle"),
        message: t("dealDetails.leaveConfirmMessage"),
        confirmText: t("dealDetails.leaveConfirmButton"),
        destructive: true,
      });
      if (!ok) return;
      leaveDeal(dealId, {
        onSuccess: () => {
          unmarkJoined(dealId).catch((error) => {
            console.warn("Failed to persist left state:", error);
          });
          setSuccessFeedback("leave");
        },
        onError: (error) => {
          console.warn("Leave deal failed:", error);
          const isNetworkIssue =
            !error?.response &&
            (String(error?.code || "").toUpperCase() === "ERR_NETWORK" ||
              String(error?.message || "")
                .toLowerCase()
                .includes("network") ||
              String(error?.message || "")
                .toLowerCase()
                .includes("timeout"));
          const message = isNetworkIssue
            ? t("dealDetails.leaveNetworkError")
            : error?.response?.data?.error ||
              error?.message ||
              t("dealDetails.leaveError");
          alert({ title: t("dealDetails.leaveFailed"), message, destructive: true });
        },
      });
      return;
    }

    if (requiresDeliveryAddress) {
      if (addressesLoading) {
        await alert({
          title: t("dealDetails.pleaseWait"),
          message: t("dealDetails.loadingAddressesWait"),
        });
        return;
      }
      if (!addressesLoading && !hasAnyAddress) {
        const addAddress = await confirm({
          title: t("dealDetails.addressNeededTitle"),
          message: t("dealDetails.addressNeededMessage"),
          confirmText: t("addresses.add"),
        });
        if (addAddress) navigation.navigate("AddressForm");
        return;
      }
      const selectedAddress =
        dealState?.deliveryAddress ||
        (dealState?.deliveryAddressId
          ? addresses?.find((item) => item.id === dealState.deliveryAddressId)
          : null) ||
        defaultAddress ||
        addresses?.[0] ||
        null;

      if (!selectedAddress) {
        await alert({
          title: t("dealDetails.selectDeliveryAddress"),
          message: t("dealDetails.chooseSavedAddress"),
        });
        setShowAddressModal(true);
        return;
      }

      if (!hasDefaultAddress && !dealState?.deliveryAddressId) {
        // No default selected by user; still proceed with first saved address for smoother UX.
        setSelectedAddressId(selectedAddress.id || null);
      }

      handleJoin(selectedAddress);
      return;
    }

    handleJoin();
  };

  const footerContent = (
    <IconActionBar
      items={[
        {
          key: "home",
          onPress: () => navigation.navigate("MainTabs", { screen: "Home" }),
          label: t("tabs.home"),
          icon: (color) => (
            <Ionicons name="home-outline" size={20} color={color} />
          ),
        },
        {
          key: "join",
          onPress: handleToggleJoin,
          active: hasJoined,
          tone: hasJoined ? "danger" : undefined,
          label: hasJoined ? t("dealDetails.leave") : dealFull ? t("dealDetails.full") : t("common.join"),
          loading: joining || leaving,
          icon: (color) =>
            !hasJoined && dealFull ? (
              <Ionicons name="lock-closed-outline" size={20} color={color} />
            ) : (
              <Ionicons
                name={hasJoined ? "exit-outline" : "person-add-outline"}
                size={20}
                color={color}
              />
            ),
        },
        {
          key: "share",
          onPress: handleShareDeal,
          label: t("dealDetails.share"),
          icon: (color) => (
            <Ionicons name="share-social-outline" size={20} color={color} />
          ),
        },
        hasJoined && {
          key: "chat",
          onPress: () =>
            navigation.navigate("DealChat", { dealId: deal.id, deal }),
          label: t("dealDetails.chat"),
          icon: (color) => (
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color={color}
            />
          ),
        },
        {
          key: "liked",
          onPress: handleToggleFavorite,
          active: isFavorite,
          tone: isFavorite ? "danger" : undefined,
          label: t("dealDetails.liked"),
          icon: (color) => (
            <Heart
              size={20}
              color={color}
              fill={isFavorite ? theme.colors.danger : "transparent"}
            />
          ),
        },
      ]}
    />
  );

  return (
    <>
      <DealDetailsLayout
        headerTitle={t("dealDetails.title")}
        onBack={() => navigation.goBack()}
        actions={null}
        footer={footerContent}
        images={getDealImages(deal)}
        title={displayTitle || t("dealLayout.deal")}
        description={displayDescription}
        descriptionNote={
          localized.isTranslated ? (
            <TouchableOpacity
              style={styles.translationNote}
              onPress={() => setShowOriginal((value) => !value)}
              activeOpacity={0.7}
            >
              <Text style={styles.translationNoteText}>
                {localized.sourceLanguage
                  ? t("dealDetails.translatedFrom", {
                      language: getLanguageInfo(localized.sourceLanguage).nativeName,
                    })
                  : t("dealDetails.translated")}
                {" · "}
                <Text style={styles.translationNoteLink}>
                  {showOriginal
                    ? t("dealDetails.showTranslation")
                    : t("dealDetails.showOriginal")}
                </Text>
              </Text>
            </TouchableOpacity>
          ) : null
        }
        sellerName={sellerDisplayName}
        category={deal.category}
        location={deal.location}
        price={primaryPrice}
        original={originalDisplay}
        discountPercent={percentOff}
        priceNote={
          nextTierInfo
            ? t(
                nextTierInfo.buyersNeeded === 1
                  ? "dealDetails.nextTierOne"
                  : "dealDetails.nextTier",
                { count: nextTierInfo.buyersNeeded, price: formatINR(nextTierInfo.nextPrice) },
              )
            : null
        }
        expiryLabel={expiryLabel}
        joinedCount={joinCount}
        targetCount={minGroupSize}
        maxCount={maxGroupSize}
        tierBoundaries={tierBoundaries}
        progressColor={theme.colors.primary}
        statusLabel={deliveryHeroStatus?.label}
        statusColor={deliveryHeroStatus?.color}
        statusInline={Boolean(deliveryHeroStatus)}
        variant="dashboard"
        contentStyle={styles.scrollContent}
      >
        <InfoCard title={t("insights.title")} style={styles.insightsCard}>
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
            {pulseCards.slice(1).map((item) => (
              <LinearGradient
                key={item.key}
                colors={item.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.insightPulseCard}
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

        <InfoCard title={t("logistics.title")} style={styles.logisticsCard}>
          <View style={styles.logisticsItem}>
            <View style={styles.logisticsIconWrap}>
              <Ionicons
                name="pricetag-outline"
                size={16}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.logisticsContent}>
              <Text style={styles.logisticsLabel}>{t("logistics.dealId")}</Text>
              <Text style={styles.logisticsValue}>{deal.dealCode || deal.id}</Text>
            </View>
          </View>
          <View style={styles.logisticsDivider} />
          <View style={styles.logisticsItem}>
            <View style={styles.logisticsIconWrap}>
              <Ionicons
                name="cube-outline"
                size={16}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.logisticsContent}>
              <Text style={styles.logisticsLabel}>{t("logistics.deliveryMode")}</Text>
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
                  <Text style={styles.logisticsLabel}>{t("logistics.storeAddress")}</Text>
                  <Text style={styles.logisticsValue}>
                    {storeAddress || "-"}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </InfoCard>

        {showPaymentSection ? (
          <InfoCard title={t("payment.title")} style={styles.logisticsCard}>
            {myPaymentStatus === "unpaid" ? (
              <>
                <Text style={styles.logisticsLabel}>{t("payment.intro")}</Text>
                <View style={styles.paymentActionsRow}>
                  <AppButton
                    title={paying ? t("payment.processing") : t("payment.payAmount", { amount: formatINR(primaryPrice || 0) })}
                    onPress={handlePay}
                    disabled={paying}
                    loading={paying}
                    style={[styles.paymentButton, styles.paymentButtonFlex]}
                  />
                  <TouchableOpacity
                    style={styles.breakupButton}
                    onPress={() => setShowBreakupModal(true)}
                    accessibilityLabel={t("payment.viewBreakup")}
                  >
                    <Ionicons
                      name="receipt-outline"
                      size={18}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.paymentStatusRow}>
                  <StatusPill status={myPaymentStatus} />
                  <Text style={[styles.logisticsLabel, styles.paymentStatusText]}>
                    {myPaymentStatus === "paid_blocked"
                      ? t("payment.held")
                      : myPaymentStatus === "released_to_seller"
                        ? t("payment.released")
                        : t("payment.refunded")}
                  </Text>
                  <TouchableOpacity
                    style={styles.breakupButton}
                    onPress={() => setShowBreakupModal(true)}
                    accessibilityLabel={t("payment.viewBreakup")}
                  >
                    <Ionicons
                      name="receipt-outline"
                      size={18}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                </View>
                {Number(myDelivery?.priceAdjustment) > 0 ? (
                  <Text style={styles.priceAdjustmentNote}>
                    {t("payment.priceAdjustment", { amount: formatINR(myDelivery.priceAdjustment) })}
                  </Text>
                ) : null}
              </>
            )}
          </InfoCard>
        ) : null}

        {showUnsuccessfulSection ? (
          <InfoCard title={t("dealDetails.unsuccessfulTitle")} style={styles.unsuccessfulCard}>
            <View style={styles.unsuccessfulRow}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.colors.error} />
              <Text style={styles.unsuccessfulText}>{t("dealDetails.unsuccessfulMessage")}</Text>
            </View>
          </InfoCard>
        ) : null}

        {showDeliverySection ? (
          <InfoCard title={isPickup ? t("delivery.storePickup") : t("delivery.title")} style={styles.deliveryOtpCard}>
            {deliveryStatus === "delivered" ? (
              <View style={styles.deliveryOtpDoneRow}>
                <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                <Text style={styles.deliveryOtpDoneText}>
                  {myDelivery?.deliveredAt
                    ? t(isPickup ? "delivery.pickedUpOn" : "delivery.deliveredOn", {
                        date: formatReviewDate(myDelivery.deliveredAt, language),
                      })
                    : isPickup
                      ? t("delivery.pickedUp")
                      : t("delivery.delivered")}
                </Text>
              </View>
            ) : isPickup ? (
              <>
                <Text style={styles.deliveryOtpLabel}>{t("delivery.pickupQr")}</Text>
                <PickupQrDisplay
                  value={`DWPICKUP:${dealId}:${user?.uid || ""}:${myDelivery?.pickupQrToken || ""}`}
                />
                <Text style={styles.deliveryOtpHint}>{t("delivery.pickupQrHint")}</Text>
              </>
            ) : (
              <>
                <Text style={styles.deliveryOtpLabel}>{t("delivery.otpLabel")}</Text>
                <OtpDisplay code={myDelivery?.deliveryOtp || ""} />
                <Text style={styles.deliveryOtpHint}>{t("delivery.otpHint")}</Text>

                {myDelivery?.otpLocked ? (
                  <Text style={styles.deliveryOtpLocked}>{t("delivery.otpLocked")}</Text>
                ) : (
                  <>
                    <OtpInput value={otpValue} onChangeText={setOtpValue} />
                    {typeof myDelivery?.attemptsRemaining === "number" &&
                    myDelivery.attemptsRemaining < 5 ? (
                      <Text style={styles.deliveryOtpAttempts}>
                        {t("delivery.attemptsRemaining", { count: myDelivery.attemptsRemaining })}
                      </Text>
                    ) : null}
                    <AppButton
                      title={confirmingDelivery ? t("delivery.confirming") : t("delivery.confirm")}
                      onPress={handleConfirmDelivery}
                      disabled={otpValue.length !== 6 || confirmingDelivery}
                      loading={confirmingDelivery}
                      style={styles.deliveryOtpButton}
                    />
                  </>
                )}
              </>
            )}
          </InfoCard>
        ) : null}

        {SHOW_RATINGS_AND_REVIEWS && (
        <InfoCard title={t("reviews.title")} style={styles.reviewCard}>
          <View style={styles.reviewSummaryRow}>
            <View>
              <Text style={styles.reviewSummaryValue}>{ratingLabel}</Text>
              <Text style={styles.reviewSummarySub}>
                {ratingCount > 0
                  ? t(ratingCount === 1 ? "reviews.ratingCountOne" : "reviews.ratingCount", { count: ratingCount })
                  : t("reviews.noRatings")}
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
                {myReview ? t("reviews.updateYours") : t("reviews.leave")}
              </Text>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder={t("reviews.placeholder")}
                placeholderTextColor={theme.colors.textMuted}
                style={styles.reviewInput}
                multiline
              />
              <AppButton
                title={
                  submittingReview
                    ? t("common.saving")
                    : myReview
                      ? t("reviews.update")
                      : t("reviews.submit")
                }
                onPress={handleSubmitReview}
                disabled={submittingReview}
                loading={submittingReview}
                style={styles.reviewSubmitButton}
              />
            </View>
          ) : (
            <Text style={styles.reviewEmptyText}>{t("reviews.onlyBuyers")}</Text>
          )}

          <View style={styles.reviewList}>
            {reviewsLoading ? (
              <Text style={styles.reviewEmptyText}>{t("reviews.loading")}</Text>
            ) : reviews?.length ? (
              reviews.map((item) => (
                <View key={item.id} style={styles.reviewItem}>
                  <View style={styles.reviewItemHeader}>
                    <Text style={styles.reviewUser}>
                      {item.userName || t("common.buyer")}
                    </Text>
                    <Text style={styles.reviewDate}>
                      {formatReviewDate(item.createdAt || item.updatedAt, language)}
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
              <Text style={styles.reviewEmptyText}>{t("reviews.beFirst")}</Text>
            )}
          </View>
        </InfoCard>
        )}

        {requiresDeliveryAddress && hasJoined ? (
          <InfoCard title={t("dealDetails.deliveryAddress")} style={styles.deliveryCard}>
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
                  {t("dealDetails.deliveryModeLine", { mode: deliveryModeLabel || t("delivery.title") })}
                </Text>
              </View>
            ) : (
              <Text style={styles.deliveryMeta}>{t("dealDetails.noDeliveryAddress")}</Text>
            )}

            <View style={styles.deliveryActions}>
              {canEditAddress ? (
                <AppButton
                  title={deliveryAddress ? t("dealDetails.changeAddress") : t("addresses.add")}
                  onPress={async () => {
                    if (!addressesLoading && (!addresses || addresses.length === 0)) {
                      const addAddress = await confirm({
                        title: t("dealDetails.noSavedAddress"),
                        message: t("dealDetails.addAddressToContinue"),
                        confirmText: t("addresses.add"),
                      });
                      if (addAddress) navigation.navigate("AddressForm");
                      return;
                    }
                    setShowAddressModal(true);
                  }}
                  style={styles.deliveryActionButton}
                />
              ) : (
                <Text style={styles.deliveryMeta}>{t("dealDetails.addressLocked")}</Text>
              )}
            </View>
          </InfoCard>
        ) : null}
      </DealDetailsLayout>

      <PriceBreakupModal
        visible={showBreakupModal}
        onClose={() => setShowBreakupModal(false)}
        breakup={priceBreakup}
      />

      <ConfirmModal {...confirmModalProps} />

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
                <Text style={styles.addressTitle}>{t("dealDetails.selectDeliveryAddress")}</Text>
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
                {t("dealDetails.deliveryModeLine", { mode: deliveryModeLabel || t("delivery.title") })}
              </Text>
              {!addressesLoading && hasAnyAddress && !hasDefaultAddress ? (
                <Text style={styles.addressHint}>{t("dealDetails.noDefaultAddress")}</Text>
              ) : null}

              {addressesLoading ? (
                <Text style={styles.addressLoading}>{t("dealDetails.loadingAddresses")}</Text>
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
                              {getAddressLabel(item.label, t)}
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
                                {t("addresses.default")}
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
                    title={t("addresses.emptyTitle")}
                    subtitle={t("dealDetails.addOneToContinue")}
                  />
                </View>
              )}

              <View style={styles.addressActions}>
                <AppButton
                  title={t("addresses.add")}
                  onPress={() => {
                    setShowAddressModal(false);
                    navigation.navigate("AddressForm");
                  }}
                  style={styles.addressActionButton}
                />
                <AppButton
                  title={t("dealDetails.useSelectedAddress")}
                  onPress={handleConfirmAddress}
                  disabled={!selectedAddressId}
                  style={styles.addressActionButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {successFeedback && (
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
                name={successFeedback === "leave" ? "exit-outline" : "checkmark-circle"}
                size={64}
                color={
                  successFeedback === "leave"
                    ? theme.colors.warningBright
                    : theme.colors.success
                }
              />
              <Text style={styles.successText}>
                {successFeedback === "leave"
                  ? t("dealDetails.leftFeedback")
                  : successFeedback === "delivered"
                    ? t("dealDetails.deliveredFeedback")
                    : t("dealDetails.joinedFeedback")}
              </Text>
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
  translationNote: {
    marginTop: 6,
    alignSelf: "flex-start",
  },
  translationNoteText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  translationNoteLink: {
    fontWeight: "700",
    color: theme.colors.primary,
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
    gap: 10,
  },
  insightPulseCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
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
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  deliveryOtpCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  paymentButton: {
    borderRadius: theme.radii.md,
    marginTop: 10,
  },
  paymentActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  paymentButtonFlex: {
    flex: 1,
    marginTop: 0,
  },
  breakupButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  paymentStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  paymentStatusText: {
    flex: 1,
  },
  priceAdjustmentNote: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.success,
  },
  unsuccessfulCard: {
    backgroundColor: theme.colors.dangerSoftLight,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  unsuccessfulRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  unsuccessfulText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.error,
    lineHeight: 18,
  },
  deliveryOtpLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  deliveryOtpHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  deliveryOtpLocked: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.danger,
    lineHeight: 18,
  },
  deliveryOtpAttempts: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.warningBright,
  },
  deliveryOtpButton: {
    borderRadius: theme.radii.md,
    marginTop: 4,
  },
  deliveryOtpDoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deliveryOtpDoneText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
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
  addressHint: {
    color: theme.colors.warningBright,
    fontSize: 12,
    fontWeight: "600",
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




