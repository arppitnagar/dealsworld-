import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ImageBackground,
} from "react-native";
import {
  Search,
  Flame,
  MapPin,
  ChevronRight,
  X,
  Heart,
  Bell,
  UserCircle,
} from "lucide-react-native";
import { useDeals } from "../hooks/useDeals";
import { useDealState } from "../hooks/useDealState";
import { useNotifications } from "../hooks/useNotifications";
import { useUserProfile } from "../hooks/useUserProfile";
import { useAuth } from "../context/AuthContext";
import { db } from "../config/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  useTheme,
  getUi,
  EmptyState,
  StatusPill,
  getStatusColor,
  getStatusLabel,
  getCardStyles,
  CardHeader,
  SkeletonList,
  SkeletonStatsRow,
  AppInput,
  formatINR,
  StatsCard,
  toDate,
} from "@dealsworld/shared";

const CATEGORIES = ["All", "Food", "Fashion", "Electronics", "Home", "Fitness"];
const HOME_HERO_IMAGE = require("../../../../packages/shared/components/ui/DealBuddy Home Screen Dark Mode.png");

const DealCard = ({
  deal,
  navigation,
  isFavorite,
  onToggleFavorite,
  selectedFilter,
  styles,
  theme,
}) => {
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
  const progress =
    minGroupSize > 0
      ? Math.min((joinCount / minGroupSize) * 100, 100)
      : 0;
  const expiryMs = getExpiryMs(deal);
  const originalPrice = Number(deal?.originalPrice);
  const discountPrice = Number(deal?.discountPrice);
  const hasOriginalPrice = Number.isFinite(originalPrice) && originalPrice > 0;
  const hasDiscountPrice = Number.isFinite(discountPrice) && discountPrice >= 0;
  const showDiscountPill = hasOriginalPrice && hasDiscountPrice;
  const discountPercent = showDiscountPill
    ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
    : null;
  const cardBorderColor = getCardBorderColor(selectedFilter, theme);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("DealDetails", { dealId: deal.id })}
      style={[styles.card, cardBorderColor && { borderColor: cardBorderColor }]}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryPillText}>{deal.category}</Text>
            <StatusPill
              label={getStatusLabel(deal.status)}
              color={getStatusColor(deal.status, theme)}
            />
            {thresholdReached ? (
              <StatusPill
                label="Threshold Reached"
                color={theme.colors.success}
              />
            ) : null}
          </View>
          <View style={styles.cardTopRight}>
            <View style={styles.joinedRow}>
              <Flame size={14} color={theme.colors.warningBright} />
              <Text style={styles.joinedText}>{joinCount} joined</Text>
            </View>
            <TouchableOpacity
              style={styles.favoriteBtn}
              onPress={(event) => {
                event?.stopPropagation?.();
                onToggleFavorite?.(deal.id);
              }}
            >
              <Heart
                size={16}
                color={
                  isFavorite ? theme.colors.danger : theme.colors.textMuted
                }
                fill={isFavorite ? theme.colors.danger : "transparent"}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={1}>
          {deal.title}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>{formatINR(deal.discountPrice)}</Text>
          {hasOriginalPrice ? (
            <Text style={styles.priceOriginal}>
              {formatINR(deal.originalPrice)}
            </Text>
          ) : null}
          {showDiscountPill &&
          discountPercent !== null &&
          discountPercent > 0 ? (
            <View style={styles.discountPill}>
              <Text style={styles.discountText}>{discountPercent}% OFF</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.cardFooterRow}>
          <Text style={styles.neededText}>
            {minGroupSize - joinCount > 0
              ? `${minGroupSize - joinCount} more users needed`
              : "Deal Unlocked!"}
          </Text>

          <View style={styles.viewDealRow}>
            <Text style={styles.viewDealText}>View Deal</Text>
            <ChevronRight size={16} color={theme.colors.primary} />
          </View>
        </View>

        <View style={styles.cardTimeRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Time Left</Text>
            <TimeLeftValue expiryMs={expiryMs} style={styles.timeValue} />
          </View>
          <View style={styles.expiresAtBlock}>
            <Text style={styles.timeLabel}>Expires At</Text>
            <Text style={styles.expiresAtText}>
              {formatExpiresAtIST(expiryMs)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen({ navigation }) {
  const { data: deals, isLoading, refetch } = useDeals();
  const { theme } = useTheme();
  const ui = useMemo(() => getUi(theme), [theme]);
  const cardStyles = useMemo(() => getCardStyles(theme), [theme]);
  const styles = useMemo(
    () => createStyles(theme, ui, cardStyles),
    [theme, ui, cardStyles],
  );
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("new");
  const {
    viewedIds,
    favoriteIds,
    joinedIds,
    toggleFavorite: toggleFavoriteDeal,
    loading: dealStateLoading,
  } = useDealState();
  const { user } = useAuth();
  const { profile, updateProfile } = useUserProfile();
  const { unreadCount } = useNotifications();
  const dealNotifyRef = useRef(0);
  const dealNotifyBusyRef = useRef(false);

  const dismissSearch = () => {
    if (searchOpen) setSearchOpen(false);
  };

  const handleToggleFavorite = (dealId) => {
    if (!dealId) return;
    toggleFavoriteDeal(dealId);
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const profileMs = getTimeMs(profile?.lastNotifiedDealAt);
    if (profileMs && profileMs > dealNotifyRef.current) {
      dealNotifyRef.current = profileMs;
    }
  }, [profile?.lastNotifiedDealAt]);

  useEffect(() => {
    if (!user?.uid || !deals?.length || !profile) return;
    if (dealNotifyBusyRef.current) return;
    const lastNotified = dealNotifyRef.current || 0;
    const nowMs = Date.now();
    const newDeals = deals
      .map((deal) => ({
        deal,
        createdMs: getTimeMs(deal?.createdAt),
        expiryMs: getExpiryMs(deal),
      }))
      .filter(({ createdMs, expiryMs }) => {
        if (!createdMs) return false;
        if (createdMs <= lastNotified) return false;
        if (typeof expiryMs === "number" && expiryMs <= nowMs) return false;
        return true;
      })
      .sort((a, b) => a.createdMs - b.createdMs);

    if (newDeals.length === 0) return;
    dealNotifyBusyRef.current = true;

    const notificationsRef = collection(
      db,
      "users",
      user.uid,
      "notifications",
    );

    const maxCreated = newDeals[newDeals.length - 1].createdMs;
    dealNotifyRef.current = Math.max(dealNotifyRef.current, maxCreated);

    Promise.all(
      newDeals.map(({ deal }) =>
        addDoc(notificationsRef, {
          type: "deal",
          dealId: deal.id,
          title: "New deal published",
          body: deal.title || "A new deal is available",
          createdAt: serverTimestamp(),
          isRead: false,
        }),
      ),
    )
      .then(() => {
        updateProfile({ lastNotifiedDealAt: new Date(maxCreated) });
      })
      .finally(() => {
        dealNotifyBusyRef.current = false;
      });
  }, [deals, profile, updateProfile, user?.uid]);

  const fuzzyMatch = (query, text) => {
    if (!query) return true;
    if (!text) return false;
    if (text.includes(query)) return true;

    const isNumericQuery = /^[0-9]+$/.test(query);
    if (isNumericQuery) {
      return false;
    }

    let qi = 0;
    for (let ti = 0; ti < text.length && qi < query.length; ti += 1) {
      if (text[ti] === query[qi]) qi += 1;
    }
    const score = qi / query.length;

    if (query.length <= 2) {
      return score === 1;
    }

    return score >= 0.7;
  };

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    const normalizedQuery = searchText.trim().toLowerCase();
    return deals.filter((deal) => {
      const expiryMs = getExpiryMs(deal);
      const isExpired =
        typeof expiryMs === "number" ? expiryMs <= now : true;
      const isCompleted =
        String(deal?.status || "").toLowerCase() === "completed";
      const isViewed = viewedIds.has(deal.id);
      const isSubscribed = joinedIds.has(deal.id);
      const isFavorite = favoriteIds.has(deal.id);

      if (isExpired || isCompleted) return false;

      if (selectedFilter === "new") {
        if (isViewed || isSubscribed || isFavorite) return false;
      }
      if (selectedFilter === "viewed") {
        if (!isViewed || isFavorite || isSubscribed) return false;
      }
      if (selectedFilter === "favourite") {
        if (!isFavorite || isSubscribed) return false;
      }
      if (selectedFilter === "my") {
        if (!isSubscribed) return false;
      }

      const matchesCategory =
        activeCategory === "All" ||
        String(deal.category || "")
          .toLowerCase()
          .includes(activeCategory.toLowerCase());
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;
      const haystack = buildSearchHaystack(deal).toLowerCase();
      return fuzzyMatch(normalizedQuery, haystack);
    });
  }, [
    deals,
    activeCategory,
    searchText,
    selectedFilter,
    favoriteIds,
    viewedIds,
    joinedIds,
    now,
  ]);

  const dealsHeaderTitle = (() => {
    switch (selectedFilter) {
      case "new":
        return "New Deals";
      case "viewed":
        return "Viewed Deals";
      case "favourite":
        return "Loved Deals";
      case "my":
        return "Joined Deals";
      default:
        return "All Deals";
    }
  })();

  if (isLoading || dealStateLoading) {
    return (
      <View style={styles.loadingScreen}>
        <SkeletonStatsRow />
        <SkeletonList count={3} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerRow}>
          <View>
            <TouchableOpacity
              activeOpacity={0.7}
              onLongPress={() => navigation.navigate("StyleGuide")}
            >
              <Text style={styles.locationLabel}>Your Location</Text>
            </TouchableOpacity>
            <View style={styles.locationRow}>
              <MapPin
                size={16}
                color={theme.colors.primary}
                fill={theme.colors.primary}
                fillOpacity={0.2}
              />
              <Text style={styles.locationText}>Mumbai, MH</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {__DEV__ && (
              <TouchableOpacity
                style={styles.debugChip}
                onPress={() => navigation.navigate("StyleGuide")}
              >
                <Text style={styles.debugChipText}>Style</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.searchBtn,
                searchOpen && styles.searchBtnActive,
              ]}
              onPress={() => setSearchOpen((prev) => !prev)}
            >
              {searchOpen ? (
                <X size={20} color={theme.colors.primary} />
              ) : (
                <Search size={20} color={theme.colors.textMuted} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate("Notifications")}
            >
              <Bell size={20} color={theme.colors.textMuted} />
              {unreadCount > 0 ? <View style={styles.badgeDot} /> : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate("Profile")}
            >
              <UserCircle size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        {searchOpen && (
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <AppInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Smart search by any value..."
                containerStyle={styles.searchInputContainer}
                inputStyle={styles.searchInput}
              />
              {searchText.length > 0 && (
                <TouchableOpacity
                  style={styles.clearSearchBtn}
                  onPress={() => setSearchText("")}
                >
                  <View style={styles.clearSearchCircle}>
                    <X size={14} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        onTouchStart={dismissSearch}
      >
        <View style={styles.bannerWrap}>
          <ImageBackground
            source={HOME_HERO_IMAGE}
            style={styles.bannerImage}
            imageStyle={styles.bannerImageAsset}
          >
            <TouchableOpacity style={styles.bannerOverlay}>
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitle}>
                  {`Refer & Earn ${formatINR(100)}`}
                </Text>
                <Text style={styles.bannerSubtitle}>
                  Get rewards when your friends join a deal
                </Text>
              </View>
              <View style={styles.bannerIcon}>
                <ChevronRight size={24} color="white" />
              </View>
            </TouchableOpacity>
          </ImageBackground>
        </View>

        <View style={styles.categoryWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20 }}
          >
            {CATEGORIES.map((cat, index) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  activeCategory === cat
                    ? styles.categoryPillActive
                    : styles.categoryPillIdle,
                ]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    activeCategory === cat
                      ? styles.categoryTextActive
                      : styles.categoryTextIdle,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.statsRow}>
          <StatsCard
            title="New"
            count={getNewCount(deals, favoriteIds, viewedIds, joinedIds)}
            color={theme.colors.primary}
            bgColor={theme.colors.infoSoft}
            icon="sparkles"
            isSelected={selectedFilter === "new"}
            onPress={() =>
              setSelectedFilter((prev) => (prev === "new" ? null : "new"))
            }
            style={styles.statCard}
          />
          <StatsCard
            title="Viewed"
            count={getViewedCount(deals, favoriteIds, viewedIds, joinedIds)}
            color={theme.colors.warningBright}
            bgColor={theme.colors.amberSoft}
            icon="eye"
            isSelected={selectedFilter === "viewed"}
            onPress={() =>
              setSelectedFilter((prev) => (prev === "viewed" ? null : "viewed"))
            }
            style={styles.statCard}
          />
          <StatsCard
            title="Loved"
            count={getFavoriteCount(deals, favoriteIds, joinedIds)}
            color={theme.colors.danger}
            bgColor={theme.colors.dangerSoft}
            icon="heart"
            isSelected={selectedFilter === "favourite"}
            onPress={() =>
              setSelectedFilter((prev) =>
                prev === "favourite" ? null : "favourite",
              )
            }
            style={styles.statCard}
          />
          <StatsCard
            title="Joined"
            count={getMyDealsCount(deals, joinedIds)}
            color={theme.colors.success}
            bgColor={theme.colors.successSoftAlt}
            icon="checkmark-circle"
            isSelected={selectedFilter === "my"}
            onPress={() =>
              setSelectedFilter((prev) => (prev === "my" ? null : "my"))
            }
            style={styles.statCard}
          />
        </View>

        <View style={styles.listWrap}>
          <CardHeader
            title={dealsHeaderTitle}
            right={
              <TouchableOpacity
                onPress={() => {
                  setSelectedFilter(null);
                  setActiveCategory("All");
                  setSearchText("");
                  setSearchOpen(false);
                }}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            }
          />

          {filteredDeals?.length > 0 ? (
            filteredDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                navigation={navigation}
                isFavorite={favoriteIds.has(deal.id)}
                onToggleFavorite={handleToggleFavorite}
                selectedFilter={selectedFilter}
                styles={styles}
                theme={theme}
              />
            ))
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="search-outline"
                title={
                  selectedFilter
                    ? "No deals for this filter."
                    : "No active deals nearby"
                }
                subtitle="Try adjusting your filters or search."
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getExpiryMs(deal) {
  const expiresAtDate = toDate(deal?.expiresAt);
  const expiryTimeDate = toDate(deal?.expiryTime);
  const expiresAtMs =
    expiresAtDate instanceof Date && !Number.isNaN(expiresAtDate.getTime())
      ? expiresAtDate.getTime()
      : null;
  const expiryTimeMs =
    expiryTimeDate instanceof Date && !Number.isNaN(expiryTimeDate.getTime())
      ? expiryTimeDate.getTime()
      : null;

  if (expiresAtMs) return expiresAtMs;
  return expiryTimeMs || null;
}

function getTimeMs(value) {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "object") {
    const seconds = value.seconds ?? value._seconds;
    if (typeof seconds === "number") return seconds * 1000;
  }
  return null;
}

function getNewCount(deals, favoriteIds, viewedIds, joinedIds) {
  if (!deals) return 0;
  const now = Date.now();
  return deals.filter((deal) => {
    const expiryMs = getExpiryMs(deal);
    const isExpired = typeof expiryMs === "number" ? expiryMs <= now : true;
    if (isExpired) return false;
    const isCompleted =
      String(deal?.status || "").toLowerCase() === "completed";
    if (isCompleted) return false;
    if (viewedIds && viewedIds.has(deal.id)) return false;
    if (joinedIds && joinedIds.has(deal.id)) return false;
    if (favoriteIds && favoriteIds.has(deal.id)) return false;
    return true;
  }).length;
}

function getViewedCount(deals, favoriteIds, viewedIds, joinedIds) {
  if (!deals) return 0;
  const now = Date.now();
  return deals.filter((deal) => {
    const expiryMs = getExpiryMs(deal);
    const isExpired = typeof expiryMs === "number" ? expiryMs <= now : true;
    if (isExpired) return false;
    const isCompleted =
      String(deal?.status || "").toLowerCase() === "completed";
    if (isCompleted) return false;
    if (!viewedIds || !viewedIds.has(deal.id)) return false;
    if (favoriteIds && favoriteIds.has(deal.id)) return false;
    if (joinedIds && joinedIds.has(deal.id)) return false;
    return true;
  }).length;
}

function getMyDealsCount(deals, joinedIds) {
  if (!deals) return 0;
  const now = Date.now();
  return deals.filter((deal) => {
    const expiryMs = getExpiryMs(deal);
    const isExpired = typeof expiryMs === "number" ? expiryMs <= now : true;
    if (isExpired) return false;
    const isCompleted =
      String(deal?.status || "").toLowerCase() === "completed";
    if (isCompleted) return false;
    return joinedIds && joinedIds.has(deal.id);
  }).length;
}

function getFavoriteCount(deals, favoriteIds, joinedIds) {
  if (!deals || !favoriteIds) return 0;
  const now = Date.now();
  return deals.filter((deal) => {
    if (!favoriteIds.has(deal.id)) return false;
    const expiryMs = getExpiryMs(deal);
    const isExpired = typeof expiryMs === "number" ? expiryMs <= now : true;
    if (isExpired) return false;
    const isCompleted =
      String(deal?.status || "").toLowerCase() === "completed";
    if (isCompleted) return false;
    if (joinedIds && joinedIds.has(deal.id)) return false;
    return true;
  }).length;
}

function buildSearchHaystack(deal) {
  const parts = [];
  const visited = new Set();

  const visit = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value === "string") {
      parts.push(value);
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      parts.push(String(value));
      return;
    }
    if (value instanceof Date) {
      parts.push(value.toISOString());
      return;
    }
    if (typeof value?.toDate === "function") {
      const date = value.toDate();
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        parts.push(date.toISOString());
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === "object") {
      if (visited.has(value)) return;
      visited.add(value);
      Object.values(value).forEach(visit);
    }
  };

  visit(deal);
  return parts.join(" ");
}

function getCardBorderColor(selectedFilter, theme) {
  switch (selectedFilter) {
    case "new":
      return theme.colors.primary;
    case "viewed":
      return theme.colors.warningBright;
    case "favourite":
      return theme.colors.danger;
    case "my":
      return theme.colors.success;
    default:
      return null;
  }
}

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
  if (typeof expiryMs !== "number") return "--";
  const istMs = expiryMs + IST_OFFSET_MINUTES * 60 * 1000;
  const istDate = new Date(istMs);
  const day = String(istDate.getUTCDate()).padStart(2, "0");
  const month = MONTHS_SHORT[istDate.getUTCMonth()];
  const year = istDate.getUTCFullYear();
  const hours = String(istDate.getUTCHours()).padStart(2, "0");
  const minutes = String(istDate.getUTCMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

function formatTimeLeftMs(expiryMs) {
  if (typeof expiryMs !== "number") return null;
  const diffMs = expiryMs - Date.now();
  if (diffMs <= 0) return null;
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}:${String(seconds).padStart(2, "0")}`;
  return days > 0 ? `${days}d ${time}` : time;
}

function TimeLeftValue({ expiryMs, style }) {
  const [value, setValue] = useState(() => formatTimeLeftMs(expiryMs));

  useEffect(() => {
    setValue(formatTimeLeftMs(expiryMs));
    if (typeof expiryMs !== "number") return undefined;
    const timer = setInterval(() => {
      setValue(formatTimeLeftMs(expiryMs));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiryMs]);

  return <Text style={style}>{value || "00:00:00"}</Text>;
}

const createStyles = (theme, ui, cardStyles) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.surfaceMuted,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    padding: 20,
    width: "100%",
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  locationText: {
    fontWeight: "700",
    color: theme.colors.text,
    marginLeft: 6,
  },
  searchBtn: {
    backgroundColor: theme.colors.surfaceMuted,
    padding: 10,
    borderRadius: 999,
  },
  searchBtnActive: {
    backgroundColor: theme.colors.infoSoft,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  iconBtn: {
    backgroundColor: theme.colors.surfaceMuted,
    padding: 10,
    borderRadius: 999,
    position: "relative",
  },
  badgeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.danger,
    borderWidth: 1,
    borderColor: theme.colors.background,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchRow: {
    marginTop: 10,
  },
  searchInputWrap: {
    position: "relative",
  },
  searchInputContainer: {
    marginTop: 0,
  },
  searchInput: {
    backgroundColor: theme.colors.surfaceMuted,
    paddingRight: 36,
  },
  clearSearchBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  clearSearchCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  debugChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  debugChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  bannerWrap: {
    padding: 8,
  },
  bannerImage: {
    borderRadius: theme.radii.xl,
    overflow: "hidden",
  },
  bannerImageAsset: {
    borderRadius: theme.radii.xl,
  },
  bannerOverlay: {
    ...ui.banner,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.overlaySoft,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    ...theme.typography.bannerTitle,
  },
  bannerSubtitle: {
    ...theme.typography.bannerSubtitle,
    marginTop: 4,
  },
  bannerIcon: {
    backgroundColor: theme.colors.onPrimarySoft,
    padding: 12,
    borderRadius: 18,
  },
  categoryWrap: {
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    flexWrap: "nowrap",
    marginBottom: 8,
  },
  statCard: {
    flexBasis: "23%",
    flexGrow: 1,
  },
  categoryPill: {
    marginRight: 8,
    ...ui.pill,
  },
  categoryPillActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  categoryPillIdle: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
  },
  categoryText: {
    fontWeight: "700",
    fontSize: 12,
  },
  categoryTextActive: {
    color: theme.colors.onPrimary,
  },
  categoryTextIdle: {
    color: theme.colors.textMuted,
  },
  listWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 32,
  },
  seeAllText: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  emptyWrap: {
    paddingVertical: 80,
    alignItems: "center",
  },
  card: {
    marginBottom: 20,
    overflow: "hidden",
    ...cardStyles.base,
    ...cardStyles.shadow,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 6,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    backgroundColor: theme.colors.infoSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  joinedRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  joinedText: {
    color: theme.colors.warningBright,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  favoriteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceGlassStrong,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  priceText: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
  },
  priceOriginal: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textDecorationLine: "line-through",
    marginLeft: 8,
  },
  discountPill: {
    marginLeft: "auto",
    backgroundColor: theme.colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: theme.colors.successDark,
    fontSize: 10,
    fontWeight: "700",
  },
  progressTrack: {
    backgroundColor: theme.colors.border,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 10,
  },
  timeBlock: {
    flex: 1,
  },
  expiresAtBlock: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  timeValue: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 2,
  },
  expiresAtText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 2,
  },
  neededText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  viewDealRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewDealText: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 12,
    marginRight: 4,
  },
  });
