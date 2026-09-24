import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { db } from "../config/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import apiClient from "../api/client";
import {
  getStatusColor,
  getStatusLabel,
  DetailRow,
  StatusPill,
  toDate,
  formatExpiryLabel,
  formatCountdown,
  formatINR,
  useTheme,
  SkeletonBlock,
  DealDetailsLayout,
  IconActionBar,
  InfoCard,
  getDealImages,
  PriceBreakupCard,
  calculatePriceBreakup,
  resolveTierPrice,
  getNextTierInfo,
  ConfirmModal,
  useConfirmModal,
  useI18n,
  getCategoryLabel,
  getDeliveryModeLabel,
  goBackOrNavigate,
} from "@dealsworld/shared";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  useDispatchDeal,
  useDeliveryStatusList,
  useMarkBuyerDelivered,
  useCompleteDeal,
  useExpireDealEarly,
} from "../hooks/useDeliveryStatus";
import { isUnsuccessfulDeal } from "../utils/dealStatus";

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
  const [now, setNow] = useState(Date.now());
  const isDealLoading = !deal || !deal.title;
  const { mutate: dispatchDeal, isPending: dispatching } = useDispatchDeal();
  const { mutate: markBuyerDelivered } = useMarkBuyerDelivered();
  const { mutate: completeDeal, isPending: completing } = useCompleteDeal();
  const { mutate: expireDealEarly, isPending: expiringEarly } = useExpireDealEarly();
  const { confirm, alert, confirmModalProps } = useConfirmModal();
  const { language, t } = useI18n();

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
      ? formatCountdown(expiryDate.getTime() - now, t)
      : null;
  const expiryLabel = expiryDate ? formatExpiryLabel(expiryDate, now, t, language) : null;
  const statusLabel =
    lifecycleStatus === "pending"
      ? t("sellerDealDetails.pending")
      : getStatusLabel(lifecycleStatus, t);
  const originalValue = safeGet(deal, "originalPrice");
  const originalNumber = Number.isFinite(Number(originalValue))
    ? Number(originalValue)
    : null;
  // The live price at the current headcount - equal to discountPrice for a
  // flat-price deal, or the active tier's price for a dynamically priced
  // one (mirrors the same computation on the buyer's own deal screen).
  const priceNumber = resolveTierPrice(deal, joinsCount);
  const discountPercent =
    originalNumber && priceNumber && originalNumber > priceNumber
      ? Math.round(((originalNumber - priceNumber) / originalNumber) * 100)
      : null;
  const originalDisplay = discountPercent ? originalNumber : null;
  const nextTierInfo = getNextTierInfo(deal, joinsCount);
  const tierBoundaries = Array.isArray(deal?.pricingTiers)
    ? deal.pricingTiers.slice(1).map((tier) => tier?.minBuyers)
    : null;
  const priceBreakup = calculatePriceBreakup({
    basePrice: priceNumber || 0,
    gstPercent: deal?.gstPercent,
    deliveryMode: deal?.deliveryMode,
    deliveryCharge: deal?.deliveryCharge,
  });
  const deliveryModeRaw = String(deal?.deliveryMode || "").trim();
  const deliveryModeLabel = getDeliveryModeLabel(deliveryModeRaw, t);
  const isPickup = /pick/i.test(deliveryModeRaw);
  const isExpiredNow = expiryDate ? expiryDate.getTime() <= now : true;
  const isPersistedExpired =
    String(deal?.status || "").toLowerCase() === "expired" ||
    String(deal?.lifecycleStatus || "").toLowerCase() === "expired";
  // A deal already persisted as expired (see expirySweep.js) was, by
  // definition, not fully paid/qualified when its expiry hit - any blocked
  // payments were already refunded, so it must never re-enter the dispatch
  // flow even though its date-based expiry check below would otherwise say yes.
  const canDispatch =
    !isPickup &&
    !isPersistedExpired &&
    (lifecycleStatus === "completed" || isExpiredNow) &&
    (!deal?.dispatchStatus || deal.dispatchStatus === "pending");
  const dispatchThresholdReached = joinsCount >= target || Boolean(deal?.thresholdReachedAt);
  const isUnsuccessful = isUnsuccessfulDeal(deal, now);
  const isDispatched = Boolean(deal?.dispatchStatus) && deal.dispatchStatus !== "pending";
  const showLifecycleActions =
    lifecycleStatus === "active" && !isPersistedExpired && !isExpiredNow;
  const { data: deliveryStatusData } = useDeliveryStatusList(deal?.id, {
    enabled: Boolean(deal?.id),
  });
  const allBuyersPaid = Boolean(deliveryStatusData?.allPaid);
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
      label: t("insights.live"),
      value: formatNumber(totalInteractions),
      caption: t("insights.liveCaption"),
      icon: "analytics-outline",
      colors: [theme.colors.primary, theme.colors.primaryDeep],
    },
    {
      key: "views",
      label: t("insights.views"),
      value: viewsCount !== null ? formatNumber(viewsCount) : "-",
      caption: t("insights.viewsCaption"),
      icon: "eye-outline",
      colors: [theme.colors.primary, theme.colors.primaryDeep],
    },
    {
      key: "favorites",
      label: t("insights.favourite"),
      value: formatNumber(favoritesCount),
      caption: t("insights.favouriteCaption"),
      icon: "heart-outline",
      colors: [theme.colors.danger, theme.colors.purple],
    },
    {
      key: "conversion",
      label: t("insights.conversion"),
      value: conversionRate !== null ? `${conversionRate.toFixed(1)}%` : "-",
      caption: t("insights.conversionCaption"),
      icon: "analytics-outline",
      colors: [theme.colors.success, theme.colors.primary],
    },
    {
      key: "threshold",
      label: t("insights.threshold"),
      value:
        timeToThresholdSeconds !== null
          ? formatDuration(timeToThresholdSeconds)
          : "-",
      caption: t("insights.thresholdCaption"),
      icon: "timer-outline",
      colors: [theme.colors.amberBorder, theme.colors.primary],
    },
    {
      key: "dropoff",
      label: t("insights.dropoff"),
      value: dropOffRate !== null ? `${dropOffRate.toFixed(1)}%` : "-",
      caption: t("insights.dropoffCaption"),
      icon: "trending-down-outline",
      colors: [theme.colors.dangerDark, theme.colors.danger],
    },
  ];

  useEffect(() => {
    if (!initialDeal?.id) return;
    const dealRef = doc(db, "deals", initialDeal.id);
    const unsubscribe = onSnapshot(dealRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setDeal(normalizeDeal({ id: snap.id, ...data }));
      // This screen reads Firestore directly, bypassing the backend's lazy
      // dealCode assignment (maybeAssignDealCode in apps/backend/src/lib.js)
      // that normally runs on GET /api/deals/*. Ping it once so a deal
      // opened before any list screen backfilled its code still gets one -
      // the write lands back in Firestore and this listener picks it up.
      if (!data?.dealCode) {
        apiClient.get(`/deals/${snap.id}`).catch(() => {});
      }
    });
    return () => unsubscribe();
  }, [initialDeal?.id]);

  // Title/description translated to the seller's selected display language.
  // This screen reads Firestore directly (see above), bypassing the
  // backend's normal localizeDeals() pass on GET /api/deals/:dealId, so it
  // has to ask for a translation separately via translate-batch.
  const [translatedText, setTranslatedText] = useState({ title: null, description: null });
  useEffect(() => {
    setTranslatedText({ title: null, description: null });
    if (!deal?.id || (!deal.title && !deal.description)) return undefined;
    let cancelled = false;
    let attempt = 0;
    const dealId = deal.id;
    const sourceTitle = deal.title || "";
    const sourceDescription = deal.description || "";

    // See useSellerLiveDeals.js's translation effect for why this retries:
    // the backend's short Azure wait window means a cold-cache request can
    // come back with untranslated text while the real translation finishes
    // in the background, with nothing else here to prompt a second look.
    const fetchTranslation = () => {
      apiClient
        .post("/deals/translate-batch", {
          items: [{ id: dealId, title: sourceTitle, description: sourceDescription }],
          lang: language,
          fields: ["title", "description"],
        })
        .then(({ data }) => {
          if (cancelled) return;
          const hit = data?.translations?.[dealId];
          const nextTitle = hit?.title || null;
          const nextDescription = hit?.description || null;
          setTranslatedText({ title: nextTitle, description: nextDescription });
          attempt += 1;
          const stillUntranslated =
            (sourceTitle && (!nextTitle || nextTitle === sourceTitle)) ||
            (sourceDescription && (!nextDescription || nextDescription === sourceDescription));
          if (stillUntranslated && attempt < 4 && language !== "en") {
            setTimeout(() => {
              if (!cancelled) fetchTranslation();
            }, 2500);
          }
        })
        .catch(() => {
          attempt += 1;
          if (!cancelled && attempt < 4) {
            setTimeout(() => {
              if (!cancelled) fetchTranslation();
            }, 2500);
          }
        });
    };
    fetchTranslation();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id, deal?.title, deal?.description, language]);

  const displayTitle = translatedText.title || deal.title;
  const displayDescription = translatedText.description || deal.description;

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const handleMarkCompleted = async () => {
    const ok = await confirm({
      title: t("sellerDealDetails.completeTitle"),
      message: t("sellerDealDetails.completeMessage"),
      confirmText: t("sellerDealDetails.markCompleted"),
    });
    if (!ok) return;
    completeDeal(deal.id, {
      onError: (error) => {
        const message =
          error?.response?.data?.error ||
          error?.message ||
          t("sellerDealDetails.completeError");
        alert({ title: t("sellerDealDetails.failed"), message, destructive: true });
      },
    });
  };

  const handleExpireEarly = async () => {
    const ok = await confirm({
      title: t("sellerDealDetails.expireTitle"),
      message: t("sellerDealDetails.expireMessage"),
      confirmText: t("sellerDealDetails.expireEarly"),
      destructive: true,
    });
    if (!ok) return;
    expireDealEarly(deal.id, {
      onError: (error) => {
        const message =
          error?.response?.data?.error ||
          error?.message ||
          t("sellerDealDetails.expireError");
        alert({ title: t("sellerDealDetails.failed"), message, destructive: true });
      },
    });
  };

  const handleDispatch = async () => {
    const ok = await confirm({
      title: t("sellerDealDetails.dispatchTitle"),
      message: t("sellerDealDetails.dispatchMessage"),
      confirmText: t("sellerDealDetails.dispatch"),
    });
    if (!ok) return;
    dispatchDeal(deal.id, {
      onError: (error) => {
        const message =
          error?.response?.data?.error ||
          error?.message ||
          t("sellerDealDetails.dispatchError");
        alert({ title: t("sellerDealDetails.dispatchFailed"), message, destructive: true });
      },
    });
  };

  const handleMarkDelivered = async (buyerId, buyerName) => {
    const ok = await confirm({
      title: isPickup ? t("sellerDealDetails.markPickedUpTitle") : t("sellerDealDetails.markDeliveredTitle"),
      message: t(
        isPickup ? "sellerDealDetails.markPickedUpMessage" : "sellerDealDetails.markDeliveredMessage",
        { buyer: buyerName || t("sellerDealDetails.thisBuyer") },
      ),
      confirmText: t("sellerDealDetails.markDelivered"),
    });
    if (!ok) return;
    markBuyerDelivered(
      { dealId: deal.id, buyerId },
      {
        onError: (error) => {
          const message =
            error?.response?.data?.error ||
            error?.message ||
            t("sellerDealDetails.markDeliveredError");
          alert({ title: t("sellerDealDetails.failed"), message, destructive: true });
        },
      },
    );
  };

  const handleShareDeal = async () => {
    if (!deal) return;
    const expiryText = expiryDate ? formatExpiryLabel(expiryDate, now, t, language) : null;
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
      ? t("share.headline", { percent: percentOff, title: deal.title || t("share.thisDeal") })
      : deal.title || t("dealDetails.title");
    const priceLine = hasOriginal
      ? t("share.priceWithMrp", { price: formatINR(discountValue), mrp: formatINR(originalValue) })
      : hasDiscount
        ? t("share.price", { price: formatINR(discountValue) })
        : null;
    const shareUrl =
      deal.shareUrl || deal.link || `${SHARE_BASE_URL}/${deal.id}`;
    const storeLinks = t("share.install", { ios: APP_STORE_URL, android: PLAY_STORE_URL });
    const message = [
      t("share.sellerIntro"),
      headline,
      priceLine,
      deal.category ? t("share.category", { category: getCategoryLabel(deal.category, t) }) : null,
      deal.location ? t("share.location", { location: deal.location }) : null,
      expiryText ? t("share.expiry", { expiry: expiryText }) : null,
      shareUrl ? t("share.view", { url: shareUrl }) : null,
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

  const editLabel =
    lifecycleStatus === "completed" ? t("sellerDealDetails.view") : t("sellerDealDetails.edit");
  const editIcon =
    lifecycleStatus === "completed" ? "eye-outline" : "create-outline";

  const footerContent = (
    <>
      {(showLifecycleActions || canDispatch || isDispatched || isUnsuccessful) && (
        <View style={styles.lifecycleActions}>
          {showLifecycleActions && dispatchThresholdReached ? (
            <>
              <TouchableOpacity
                onPress={handleMarkCompleted}
                disabled={completing || !allBuyersPaid}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryDeep]}
                  style={[styles.dispatchBtn, !allBuyersPaid && styles.disabledBtn]}
                >
                  <Text style={styles.dispatchBtnText}>
                    {completing ? t("payment.processing") : t("sellerDealDetails.markCompleted")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              {!allBuyersPaid ? (
                <Text style={styles.helperNoteText}>{t("sellerDealDetails.waitingPaymentComplete")}</Text>
              ) : null}
            </>
          ) : null}

          {showLifecycleActions && !dispatchThresholdReached ? (
            <TouchableOpacity
              style={styles.endBtn}
              onPress={handleExpireEarly}
              disabled={expiringEarly}
            >
              <Text style={styles.endBtnText}>
                {expiringEarly ? t("payment.processing") : t("sellerDealDetails.expireEarly")}
              </Text>
            </TouchableOpacity>
          ) : null}

          {isUnsuccessful ? (
            <View style={styles.unsuccessfulBanner}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
              <Text style={styles.unsuccessfulBannerText}>
                {t("sellerDealDetails.unsuccessfulBanner", { target, joined: joinsCount })}
              </Text>
            </View>
          ) : null}

          {canDispatch && dispatchThresholdReached ? (
            allBuyersPaid ? (
              <TouchableOpacity onPress={handleDispatch} disabled={dispatching}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryDeep]}
                  style={styles.dispatchBtn}
                >
                  <Text style={styles.dispatchBtnText}>
                    {dispatching ? t("sellerDealDetails.dispatching") : t("sellerDealDetails.markDispatched")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <Text style={styles.helperNoteText}>{t("sellerDealDetails.waitingPaymentDispatch")}</Text>
            )
          ) : null}

          {deal?.dispatchStatus === "dispatched" ? (
            <View style={styles.dispatchedChip}>
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.dispatchedChipText}>
                {deal?.dispatchedAt
                  ? t("sellerDealDetails.dispatchedOn", { date: formatShortDate(deal.dispatchedAt, language) })
                  : t("status.dispatched")}
              </Text>
            </View>
          ) : null}

          {deal?.dispatchStatus === "delivered" ? (
            <View style={styles.deliveredBanner}>
              <Ionicons name="checkmark-done-circle" size={18} color={theme.colors.success} />
              <Text style={styles.deliveredBannerText}>
                {isPickup ? t("sellerDealDetails.allPickedUp") : t("sellerDealDetails.allReceived")}
              </Text>
            </View>
          ) : null}
        </View>
      )}
      <IconActionBar
        items={[
          {
            key: "home",
            onPress: () =>
              navigation.navigate("MainTabs", { screen: "Dashboard" }),
            label: t("tabs.home"),
            icon: (color) => (
              <Ionicons name="home-outline" size={20} color={color} />
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
          {
            key: "chat",
            onPress: () => navigation.navigate("DealChat", { deal }),
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
            key: "edit",
            onPress: () => navigation.navigate("CreateDeal", { deal }),
            label: editLabel,
            icon: (color) => (
              <Ionicons name={editIcon} size={20} color={color} />
            ),
          },
        ]}
      />
    </>
  );

  return (
    <View style={styles.container}>
      <DealDetailsLayout
        headerTitle={t("dealDetails.title")}
        onBack={() => goBackOrNavigate(navigation)}
        actions={null}
        footer={footerContent}
        images={getDealImages(deal)}
        title={displayTitle || t("dealLayout.deal")}
        description={displayDescription}
        sellerName={sellerDisplayName}
        category={deal.category}
        location={deal.location}
        price={priceNumber}
        original={originalDisplay}
        discountPercent={discountPercent}
        priceNote={
          nextTierInfo
            ? t(
                nextTierInfo.buyersNeeded === 1
                  ? "sellerDealDetails.nextTierOne"
                  : "sellerDealDetails.nextTier",
                { count: nextTierInfo.buyersNeeded, price: formatINR(nextTierInfo.nextPrice) },
              )
            : null
        }
        expiryLabel={expiryLabel}
        joinedCount={joinsCount}
        targetCount={target}
        maxCount={safeGet(deal, "maxGroupSize")}
        tierBoundaries={tierBoundaries}
        progressColor={accentColor}
        statusLabel={
          isUnsuccessful
            ? t("delivery.unsuccessful")
            : lifecycleStatus === "completed"
              ? null
              : statusLabel
        }
        statusColor={isUnsuccessful ? theme.colors.error : accentColor}
        statusInline
        showHeroAccent={false}
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

        {Array.isArray(deal?.pricingTiers) && deal.pricingTiers.length > 1 ? (
          <InfoCard title={t("sellerDealDetails.tiersTitle")} style={styles.logisticsCard}>
            {deal.pricingTiers.map((tier, index) => {
              const isActive =
                joinsCount >= tier.minBuyers &&
                (tier.maxBuyers == null || joinsCount <= tier.maxBuyers);
              return (
                <React.Fragment key={index}>
                  {index > 0 ? <View style={styles.logisticsDivider} /> : null}
                  <View style={styles.tierInfoRow}>
                    <View style={styles.logisticsContent}>
                      <Text style={styles.logisticsLabel}>
                        {tier.maxBuyers == null
                          ? t("sellerDealDetails.tierOpen", { min: tier.minBuyers })
                          : t("sellerDealDetails.tierRange", { min: tier.minBuyers, max: tier.maxBuyers })}
                      </Text>
                      <Text style={styles.logisticsValue}>{formatINR(tier.price)}</Text>
                    </View>
                    {isActive ? (
                      <View style={styles.tierActiveBadge}>
                        <Text style={styles.tierActiveBadgeText}>{t("sellerDealDetails.activeNow")}</Text>
                      </View>
                    ) : null}
                  </View>
                </React.Fragment>
              );
            })}
          </InfoCard>
        ) : null}

        <InfoCard title={t("sellerDealDetails.priceBreakup")} style={styles.logisticsCard}>
          <PriceBreakupCard breakup={priceBreakup} />
        </InfoCard>

        {deliveryStatusData?.items?.length ? (
          <InfoCard
            title={
              isPickup
                ? t("sellerDealDetails.pickupProgress")
                : isDispatched
                  ? t("sellerDealDetails.deliveryProgress")
                  : t("sellerDealDetails.buyerPayments")
            }
            style={styles.logisticsCard}
          >
            {deliveryStatusData.items.map((item, index) => {
              const isReady =
                item.deliveryStatus === "in_transit" || item.deliveryStatus === "ready_for_pickup";
              const isDelivered = item.deliveryStatus === "delivered";
              const readyLabel = isPickup ? t("delivery.readyForPickup") : t("delivery.inTransit");
              const doneLabel = isPickup ? t("delivery.pickedUp") : t("delivery.delivered");

              return (
                <React.Fragment key={item.buyerId}>
                  {index > 0 ? <View style={styles.logisticsDivider} /> : null}
                  <View style={styles.buyerRow}>
                    <View style={styles.buyerRowInfo}>
                      <Text style={styles.logisticsValue}>{item.buyerName}</Text>
                      {item.buyerCode ? (
                        <Text style={styles.logisticsLabel}>{item.buyerCode}</Text>
                      ) : null}
                      {!isReady && !isDelivered && item.paidAmount != null ? (
                        <Text style={styles.buyerAmountText}>
                          {item.settledAmount != null && item.settledAmount !== item.paidAmount
                            ? t("sellerDealDetails.settled", {
                                paid: formatINR(item.paidAmount),
                                settled: formatINR(item.settledAmount),
                              })
                            : t("sellerDealDetails.paid", { amount: formatINR(item.paidAmount) })}
                        </Text>
                      ) : null}
                      {isDelivered && item.deliveredAt ? (
                        <Text style={styles.logisticsLabel}>
                          {doneLabel} {formatShortDate(item.deliveredAt, language)}
                        </Text>
                      ) : null}
                    </View>
                    {isReady || isDelivered ? (
                      <StatusPill
                        status={isDelivered ? "delivered" : "dispatched"}
                        label={isDelivered ? doneLabel : readyLabel}
                      />
                    ) : (
                      <StatusPill status={item.paymentStatus || "unpaid"} />
                    )}
                    {isReady ? (
                      <TouchableOpacity
                        onPress={() => handleMarkDelivered(item.buyerId, item.buyerName)}
                      >
                        <Text style={styles.markDeliveredText}>
                          {isPickup ? t("sellerDealDetails.markPickedUpLink") : t("sellerDealDetails.markDeliveredLink")}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </React.Fragment>
              );
            })}
          </InfoCard>
        ) : null}

        {countdown ? (
          <DetailRow
            icon="time-outline"
            label={t("sellerDealDetails.ends")}
            value={countdown}
            color={accentColor}
          />
        ) : null}

      </DealDetailsLayout>

      <ConfirmModal {...confirmModalProps} />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.dashboardBg },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 56,
    gap: 20,
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
  lifecycleActions: {
    padding: 20,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceLight,
    gap: 12,
  },
  endBtn: {
    backgroundColor: theme.colors.dangerSoftAlt,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  endBtnText: { color: theme.colors.error, fontWeight: "800" },
  disabledBtn: { opacity: 0.5 },
  helperNoteText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  buyerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  buyerRowInfo: {
    flex: 1,
    gap: 2,
  },
  markDeliveredText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  buyerAmountText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.success,
  },
  tierInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  tierActiveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.successSoft,
  },
  tierActiveBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.successDark,
  },
  unsuccessfulBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: theme.colors.dangerSoftLight,
    borderRadius: 14,
    padding: 12,
  },
  unsuccessfulBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.error,
    lineHeight: 17,
  },
  dispatchBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  dispatchBtnText: {
    color: theme.colors.onPrimary,
    fontWeight: "800",
  },
  dispatchedChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: theme.colors.infoSoft,
    borderRadius: 14,
    paddingVertical: 12,
  },
  dispatchedChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  deliveredBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: theme.colors.successSoft,
    borderRadius: 14,
    paddingVertical: 12,
  },
  deliveredBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.success,
  },
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

function formatShortDate(value, language = "en") {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString(`${language}-IN`, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
