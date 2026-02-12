import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Image,
  StatusBar,
  Modal,
} from "react-native";
import {
  Search,
  Flame,
  X,
  Heart,
  Bell,
  UserCircle,
  Eye,
  Users,
  Zap,
  Star,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDeals } from "../hooks/useDeals";
import { useDealState } from "../hooks/useDealState";
import { useNotifications } from "../hooks/useNotifications";
import { useUserProfile } from "../hooks/useUserProfile";
import { useAuth } from "../context/AuthContext";
import { db } from "../config/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  SafeAreaView,
} from "react-native-safe-area-context";
import {
  useTheme,
  EmptyState,
  getStatusLabel,
  getCardStyles,
  CardHeader,
  AppInput,
  toDate,
  DealBuddyLoadingScreen,
  TopPageHeader,
} from "@dealsworld/shared";

const STATUS_FILTERS = [
  { key: "new", label: "New", icon: Flame },
  { key: "hot", label: "Hot", icon: Zap },
  { key: "viewed", label: "Viewed", icon: Eye },
  { key: "favourite", label: "Favourite", icon: Heart },
  { key: "my", label: "Joined", icon: Users },
];

const SORT_FIELDS = [
  { key: "title", label: "Deal title" },
  { key: "price", label: "Deal price" },
  { key: "location", label: "Location" },
  { key: "vendor", label: "Vendor" },
  { key: "category", label: "Deal category" },
  { key: "deliveryMode", label: "Delivery mode" },
  { key: "expiration", label: "Expiration" },
  { key: "joinedUsers", label: "Joined users" },
  { key: "requiredUsers", label: "Required users" },
];

const DealCard = ({
  deal,
  navigation,
  isFavorite,
  isJoined,
  isViewed,
  isHot,
  onToggleFavorite,
  styles,
  theme,
  accentColor,
}) => {
  const metaIconSize = 18;
  const joinCount = getJoinCount(deal);
  const minGroupSize = getMinGroupSize(deal);
  const progressRatio =
    minGroupSize > 0 ? Math.min(joinCount / minGroupSize, 1) : 0;
  const progressLabel =
    minGroupSize > 0
      ? `Joined ${formatCount(joinCount)} of ${formatCount(minGroupSize)}`
      : `Joined ${formatCount(joinCount)}`;
  const progressColor = getProgressColor(progressRatio, theme);
  const expiryMs = getExpiryMs(deal);
  const originalPrice = Number(deal?.originalPrice);
  const discountPrice = Number(deal?.discountPrice);
  const discountPercent =
    Number.isFinite(originalPrice) &&
    Number.isFinite(discountPrice) &&
    originalPrice > discountPrice
      ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
      : null;
  const viewsCountRaw = deal?.viewsCount ?? deal?.views ?? 0;
  const viewsCount = Number.isFinite(Number(viewsCountRaw))
    ? Number(viewsCountRaw)
    : 0;
  const favoritesCountRaw = deal?.favoritesCount ?? deal?.favouritesCount ?? 0;
  const favoritesCount = Number.isFinite(Number(favoritesCountRaw))
    ? Number(favoritesCountRaw)
    : 0;
  const ratingCountRaw = deal?.ratingCount ?? 0;
  const ratingCount = Number.isFinite(Number(ratingCountRaw))
    ? Number(ratingCountRaw)
    : 0;
  const ratingAvgRaw = deal?.ratingAvg ?? deal?.rating ?? null;
  const ratingAvg = Number.isFinite(Number(ratingAvgRaw))
    ? Number(ratingAvgRaw)
    : null;
  const ratingLabel =
    ratingCount > 0 && ratingAvg !== null
      ? `${ratingAvg.toFixed(1)} (${formatCount(ratingCount)})`
      : "0.0 (0)";
  const dealImage = deal?.imageUrl || deal?.image || null;
  const dealType = getDealType({ isJoined, isFavorite, isViewed, isHot });
  const badgeLabel = deal?.location ? String(deal.location) : null;
  const sellerLabel = deal?.vendorName || deal?.sellerId || "Deal Buddy";
  const endsInLabel = formatEndsIn(expiryMs);
  const showSubtitle = Boolean(sellerLabel || endsInLabel);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("DealDetails", { dealId: deal.id })}
      style={[styles.card, accentColor ? { borderColor: accentColor } : null]}
    >
      <View style={styles.cardImageWrap}>
        {dealImage ? (
          <Image source={{ uri: dealImage }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons
              name="image-outline"
              size={26}
              color={theme.colors.textMuted}
            />
          </View>
        )}
        {discountPercent ? (
          <View style={styles.discountTagWrap}>
            <View style={styles.discountTagString} />
            <View style={styles.discountTag}>
              <View style={styles.discountTagHole} />
              <Text style={styles.discountTagLabel}>DISCOUNT</Text>
              <View style={styles.discountTagValueRow}>
                <Text style={styles.discountTagValue}>{discountPercent}%</Text>
                <Text style={styles.discountTagOff}>OFF</Text>
              </View>
            </View>
          </View>
        ) : null}
        {badgeLabel ? (
          <View style={[styles.cardBadge, getDealBadgeStyle(dealType, theme)]}>
            <Text style={styles.cardBadgeText}>{badgeLabel}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.cardHeart}
          onPress={(event) => {
            event?.stopPropagation?.();
            onToggleFavorite?.(deal.id);
          }}
        >
          <Heart
            size={18}
            color={isFavorite ? theme.colors.danger : theme.colors.textMuted}
            fill={isFavorite ? theme.colors.danger : "transparent"}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {deal.title}
          </Text>
        </View>
        {showSubtitle ? (
          <View style={styles.cardSubtitleRow}>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {sellerLabel}
            </Text>
            {endsInLabel ? (
              <Text style={styles.cardExpiry} numberOfLines={1}>
                {endsInLabel}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.cardMetaRow}>
          <View style={styles.metaChip}>
            <Eye size={metaIconSize} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>{formatCount(viewsCount)}</Text>
          </View>
          <View style={styles.metaChip}>
            <Users size={metaIconSize} color={theme.colors.primary} />
            <Text style={styles.metaText}>{formatCount(joinCount)}</Text>
          </View>
          <View style={styles.metaChip}>
            <Heart size={metaIconSize} color={theme.colors.danger} />
            <Text style={styles.metaText}>{formatCount(favoritesCount)}</Text>
          </View>
          <View style={styles.metaChip}>
            <Star size={metaIconSize} color={theme.colors.warningBright} />
            <Text style={styles.metaText}>{ratingLabel}</Text>
          </View>
          {isHot ? (
            <View style={styles.metaChip}>
              <Zap size={metaIconSize} color={theme.colors.purple} />
              <Text style={styles.metaText}>Hot</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{progressLabel}</Text>
            <Text style={styles.progressPercent}>
              {Math.round(progressRatio * 100)}%
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(progressRatio * 100)}%`,
                  backgroundColor: progressColor,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.cardActionRow}>
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() =>
              navigation.navigate("DealDetails", { dealId: deal.id })
            }
          >
            <Text style={styles.cardActionText}>View Deal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const FilterChip = ({
  label,
  icon: Icon,
  count,
  isSelected,
  onPress,
  accentColor,
  styles,
  theme,
}) => {
  const displayCount =
    typeof count === "number" && Number.isFinite(count) ? count : 0;
  return (
    <TouchableOpacity
      style={styles.filterChip}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} deals, ${displayCount}`}
    >
      <LinearGradient
        colors={
          isSelected
            ? [theme.colors.primary, theme.colors.purple]
            : [accentColor, accentColor]
        }
        style={styles.filterChipGradient}
      >
        <View
          style={[
            styles.filterChipIconWrap,
            isSelected
              ? styles.filterChipIconWrapActive
              : styles.filterChipIconWrapIdle,
            !isSelected && { borderColor: accentColor },
          ]}
        >
          <Icon
            size={18}
            color={accentColor}
          />
        </View>
      </LinearGradient>
      <Text
        style={[
          styles.filterChipLabel,
          isSelected ? styles.filterChipLabelActive : styles.filterChipLabelIdle,
          !isSelected && { color: accentColor },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.filterChipBadge,
          isSelected ? styles.filterChipBadgeActive : styles.filterChipBadgeIdle,
          !isSelected && { borderColor: accentColor },
        ]}
      >
        <Text
          style={[
            styles.filterChipBadgeText,
            isSelected
              ? styles.filterChipBadgeTextActive
              : styles.filterChipBadgeTextIdle,
            !isSelected && { color: accentColor },
          ]}
        >
          {formatCount(displayCount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen({ navigation }) {
  const { data: deals, isLoading, refetch } = useDeals();
  const { theme } = useTheme();
  const cardStyles = useMemo(() => getCardStyles(theme), [theme]);
  const styles = useMemo(
    () => createStyles(theme, cardStyles),
    [theme, cardStyles],
  );
  const [now, setNow] = useState(Date.now());
  const [searchText, setSearchText] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isSortVisible, setIsSortVisible] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
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
  const prevSearchRef = useRef(searchText);
  const greetingLabel = getGreetingLabel(now);

  const handleToggleFavorite = (dealId) => {
    if (!dealId) return;
    toggleFavoriteDeal(dealId);
  };

  const handleToggleSearch = () => {
    setIsSearchVisible((prev) => {
      const next = !prev;
      if (!next) {
        setSearchText("");
      }
      return next;
    });
  };

  const handleSelectSortField = (field) => {
    setSortField(field);
    setIsSortVisible(false);
  };

  const HeaderActionButton = ({ label, onPress, icon, showBadge = false }) => (
    <View style={styles.headerActionItem}>
      <TouchableOpacity
        onPress={onPress}
        style={styles.headerIconButton}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.purple]}
          style={styles.headerIconGradient}
        >
          <View style={styles.headerIconInner}>{icon}</View>
          {showBadge ? <View style={styles.badgeDot} /> : null}
        </LinearGradient>
      </TouchableOpacity>
      <Text style={styles.headerActionLabel}>{label}</Text>
    </View>
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (searchText.trim().length > 0 && selectedFilter) {
      setSelectedFilter(null);
    }
  }, [searchText, selectedFilter]);

  useEffect(() => {
    const prev = prevSearchRef.current.trim();
    const current = searchText.trim();
    prevSearchRef.current = searchText;
    if (prev.length > 0 && current.length === 0) {
      setSelectedFilter("new");
    }
  }, [searchText]);

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

    const notificationsRef = collection(db, "users", user.uid, "notifications");

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

  const searchMatch = (query, text) => {
    if (!query) return true;
    if (!text) return false;
    const normalizedText = normalizeSearchText(text);
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return true;
    const tokens = normalizedQuery.split(" ").filter(Boolean);
    return tokens.every((token) => normalizedText.includes(token));
  };

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    const normalizedQuery = searchText.trim();
    const isSearching = normalizedQuery.length > 0;
    return deals.filter((deal) => {
      const expiryMs = getExpiryMs(deal);
      const isExpired = typeof expiryMs === "number" ? expiryMs <= now : true;
      const isCompleted =
        String(deal?.status || "").toLowerCase() === "completed";
      const isViewed = viewedIds.has(deal.id);
      const isSubscribed = joinedIds.has(deal.id);
      const isFavorite = favoriteIds.has(deal.id);

      if (isExpired || isCompleted) return false;

      if (!isSearching) {
        if (selectedFilter === "new") {
          if (isViewed || isSubscribed || isFavorite) return false;
        }
        if (selectedFilter === "hot") {
          if (!isHotDeal(deal)) return false;
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
      }

      if (!isSearching) return true;
      const haystack = buildSearchHaystack(deal).toLowerCase();
      return searchMatch(normalizedQuery, haystack);
    });
  }, [
    deals,
    searchText,
    selectedFilter,
    favoriteIds,
    viewedIds,
    joinedIds,
    now,
  ]);

  const sortedDeals = useMemo(() => {
    if (!filteredDeals?.length || !sortField) return filteredDeals;
    const direction = sortOrder === "desc" ? -1 : 1;
    const list = [...filteredDeals];
    list.sort((a, b) => compareDealSort(a, b, sortField, direction));
    return list;
  }, [filteredDeals, sortField, sortOrder]);

  const dealsHeaderTitle = (() => {
    switch (selectedFilter) {
      case "new":
        return "New Deals";
      case "hot":
        return "Hot Deals";
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
    return <DealBuddyLoadingScreen label="Loading deals..." />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <TopPageHeader
        includeSafeArea={false}
        rounded
        style={styles.header}
        customRow={
          <View style={styles.headerContent}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.greetingLabel}>{greetingLabel}</Text>
                <Text style={styles.greetingName}>
                  {profile?.displayName || "Buyer"}
                </Text>
              </View>
              {__DEV__ && (
                <TouchableOpacity
                  style={styles.debugChip}
                  onPress={() => navigation.navigate("StyleGuide")}
                >
                  <Text style={styles.debugChipText}>Style</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.headerDivider} />
            <View style={styles.headerActions}>
              <HeaderActionButton
                label="Search"
                onPress={handleToggleSearch}
                icon={
                  <Search
                    size={16}
                    color={
                      isSearchVisible
                        ? theme.colors.warningBright
                        : theme.colors.onPrimary
                    }
                  />
                }
              />
              <HeaderActionButton
                label="Sort"
                onPress={() => setIsSortVisible(true)}
                icon={
                  <Ionicons
                    name="swap-vertical"
                    size={16}
                    color={
                      sortField ? theme.colors.warningBright : theme.colors.onPrimary
                    }
                  />
                }
              />
              <HeaderActionButton
                label="Alerts"
                onPress={() => navigation.navigate("Notifications")}
                icon={<Bell size={16} color={theme.colors.onPrimary} />}
                showBadge={unreadCount > 0}
              />
              <HeaderActionButton
                label="Profile"
                onPress={() => navigation.navigate("Profile")}
                icon={<UserCircle size={16} color={theme.colors.onPrimary} />}
              />
            </View>
          </View>
        }
      >
        {isSearchVisible ? (
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <AppInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search for deals..."
                containerStyle={styles.searchInputContainer}
                inputStyle={styles.searchInput}
                placeholderTextColor={theme.colors.onPrimaryMuted}
                leftElement={
                  <Search size={18} color={theme.colors.onPrimaryMuted} />
                }
              />
              {searchText.length > 0 && (
                <TouchableOpacity
                  style={styles.clearSearchBtn}
                  onPress={() => setSearchText("")}
                >
                  <View style={styles.clearSearchCircle}>
                    <X size={14} color={theme.colors.onPrimaryMuted} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : null}
      </TopPageHeader>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        <View style={styles.filterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 12 }}
          >
            {STATUS_FILTERS.map((filter) => {
              const count =
                filter.key === "new"
                  ? getNewCount(deals, favoriteIds, viewedIds, joinedIds)
                  : filter.key === "hot"
                    ? getHotCount(deals)
                    : filter.key === "viewed"
                      ? getViewedCount(deals, favoriteIds, viewedIds, joinedIds)
                      : filter.key === "favourite"
                        ? getFavoriteCount(deals, favoriteIds, joinedIds)
                        : getMyDealsCount(deals, joinedIds);

              const accentColor =
                filter.key === "new"
                  ? theme.colors.warningBright
                  : filter.key === "hot"
                    ? theme.colors.purple
                    : filter.key === "viewed"
                      ? theme.colors.primary
                      : filter.key === "favourite"
                        ? theme.colors.danger
                        : theme.colors.success;

              return (
                <FilterChip
                  key={filter.key}
                  label={filter.label}
                  icon={filter.icon}
                  count={count}
                  isSelected={selectedFilter === filter.key}
                  onPress={() =>
                    setSelectedFilter((prev) =>
                      prev === filter.key ? null : filter.key,
                    )
                  }
                  accentColor={accentColor}
                  styles={styles}
                  theme={theme}
                />
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.listWrap}>
          <CardHeader
            title={dealsHeaderTitle}
            right={
              <TouchableOpacity
                onPress={() => {
                  setSelectedFilter(null);
                  setSearchText("");
                }}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            }
          />

          {sortedDeals?.length > 0 ? (
            sortedDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                navigation={navigation}
                isFavorite={favoriteIds.has(deal.id)}
                isJoined={joinedIds.has(deal.id)}
                isViewed={viewedIds.has(deal.id)}
                isHot={isHotDeal(deal)}
                onToggleFavorite={handleToggleFavorite}
                styles={styles}
                theme={theme}
                accentColor={getDealAccentColor({
                  isJoined: joinedIds.has(deal.id),
                  isFavorite: favoriteIds.has(deal.id),
                  isViewed: viewedIds.has(deal.id),
                  isHot: isHotDeal(deal),
                  theme,
                })}
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

      <Modal
        transparent
        animationType="fade"
        visible={isSortVisible}
        onRequestClose={() => setIsSortVisible(false)}
      >
        <View style={styles.sortOverlay}>
          <TouchableOpacity
            style={styles.sortBackdrop}
            activeOpacity={1}
            onPress={() => setIsSortVisible(false)}
          />
          <View style={styles.sortSheet}>
            <Text style={styles.sortTitle}>Sort Deals</Text>
            <View style={styles.sortOrderRow}>
              <TouchableOpacity
                style={[
                  styles.sortOrderChip,
                  sortOrder === "asc" && styles.sortOrderChipActive,
                ]}
                onPress={() => setSortOrder("asc")}
              >
                <Text
                  style={[
                    styles.sortOrderText,
                    sortOrder === "asc" && styles.sortOrderTextActive,
                  ]}
                >
                  Ascending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortOrderChip,
                  sortOrder === "desc" && styles.sortOrderChipActive,
                ]}
                onPress={() => setSortOrder("desc")}
              >
                <Text
                  style={[
                    styles.sortOrderText,
                    sortOrder === "desc" && styles.sortOrderTextActive,
                  ]}
                >
                  Descending
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sortFieldList}>
              {SORT_FIELDS.map((field) => (
                <TouchableOpacity
                  key={field.key}
                  style={[
                    styles.sortFieldRow,
                    sortField === field.key && styles.sortFieldRowActive,
                  ]}
                  onPress={() => handleSelectSortField(field.key)}
                >
                  <Text
                    style={[
                      styles.sortFieldText,
                      sortField === field.key && styles.sortFieldTextActive,
                    ]}
                  >
                    {field.label}
                  </Text>
                  {sortField === field.key ? (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={theme.colors.primary}
                    />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.sortFooterRow}>
              <TouchableOpacity
                style={styles.sortClearButton}
                onPress={() => {
                  setSortField(null);
                  setSortOrder("asc");
                  setIsSortVisible(false);
                }}
              >
                <Text style={styles.sortClearText}>Clear sort</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sortCloseButton}
                onPress={() => setIsSortVisible(false)}
              >
                <Text style={styles.sortCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

function getJoinCount(deal) {
  const joinCountRaw = deal?.currentJoins ?? deal?.joinedUsers ?? 0;
  return Number.isFinite(Number(joinCountRaw)) ? Number(joinCountRaw) : 0;
}

function getMinGroupSize(deal) {
  const minGroupSizeRaw = deal?.minGroupSize ?? deal?.minThreshold ?? 0;
  return Number.isFinite(Number(minGroupSizeRaw)) ? Number(minGroupSizeRaw) : 0;
}

function isHotDeal(deal) {
  const minGroupSize = getMinGroupSize(deal);
  if (!minGroupSize) return false;
  const joinCount = getJoinCount(deal);
  return joinCount / minGroupSize >= 0.8;
}

function getDealType({ isJoined, isFavorite, isViewed, isHot }) {
  if (isJoined) return "joined";
  if (isFavorite) return "favourite";
  if (isViewed) return "viewed";
  if (isHot) return "hot";
  return "new";
}

function getDealTypeLabel(type, status) {
  switch (type) {
    case "joined":
      return "Joined";
    case "favourite":
      return "Favourite";
    case "viewed":
      return "Viewed";
    case "hot":
      return "Hot Deal";
    case "new":
      return "New";
    default:
      return status ? getStatusLabel(status) : "Deal";
  }
}

function getDealBadgeStyle(type, theme) {
  if (!theme?.colors) return null;
  switch (type) {
    case "joined":
      return { backgroundColor: theme.colors.success };
    case "favourite":
      return { backgroundColor: theme.colors.danger };
    case "viewed":
      return { backgroundColor: theme.colors.primary };
    case "hot":
      return { backgroundColor: theme.colors.purple };
    case "new":
      return { backgroundColor: theme.colors.warningBright };
    default:
      return null;
  }
}

function getProgressColor(ratio, theme) {
  if (!theme?.colors) return null;
  if (ratio >= 0.85) return theme.colors.success;
  if (ratio >= 0.6) return theme.colors.warningBright;
  if (ratio >= 0.35) return theme.colors.amberBorder;
  return theme.colors.danger;
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

function getHotCount(deals) {
  if (!deals) return 0;
  const now = Date.now();
  return deals.filter((deal) => {
    const expiryMs = getExpiryMs(deal);
    const isExpired = typeof expiryMs === "number" ? expiryMs <= now : true;
    if (isExpired) return false;
    const isCompleted =
      String(deal?.status || "").toLowerCase() === "completed";
    if (isCompleted) return false;
    return isHotDeal(deal);
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

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s]+/g, " ")
    .trim();
}

function formatEndsIn(expiryMs) {
  if (typeof expiryMs !== "number") return null;
  const diffMs = expiryMs - Date.now();
  if (diffMs <= 0) return "Ends soon";
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  if (days > 0) return `Ends in ${days}d`;
  if (hours > 0) return `Ends in ${hours}h`;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `Ends in ${Math.max(minutes, 1)}m`;
}

function formatCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  if (numeric >= 1000000) {
    return `${(numeric / 1000000).toFixed(1)}m`;
  }
  if (numeric >= 1000) {
    return `${(numeric / 1000).toFixed(numeric >= 10000 ? 0 : 1)}k`;
  }
  return `${numeric}`;
}

function getGreetingLabel(nowMs) {
  const hour = new Date(nowMs).getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
}

function getDealAccentColor({ isJoined, isFavorite, isViewed, isHot, theme }) {
  if (!theme?.colors) return null;
  if (isJoined) return theme.colors.success;
  if (isFavorite) return theme.colors.danger;
  if (isViewed) return theme.colors.primary;
  if (isHot) return theme.colors.purple;
  return theme.colors.warningBright;
}

function getSortNumeric(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getSortText(value) {
  return String(value || "").toLowerCase().trim();
}

function getDealSortValue(deal, field) {
  switch (field) {
    case "title":
      return getSortText(deal?.title);
    case "price":
      return getSortNumeric(deal?.discountPrice ?? deal?.price);
    case "location":
      return getSortText(deal?.location);
    case "vendor":
      return getSortText(deal?.vendorName || deal?.sellerId || deal?.vendorid);
    case "category":
      return getSortText(deal?.category);
    case "deliveryMode":
      return getSortText(deal?.deliveryMode);
    case "expiration":
      return getSortNumeric(getExpiryMs(deal));
    case "joinedUsers":
      return getSortNumeric(getJoinCount(deal));
    case "requiredUsers":
      return getSortNumeric(getMinGroupSize(deal));
    default:
      return null;
  }
}

function compareDealSort(a, b, field, direction) {
  const aValue = getDealSortValue(a, field);
  const bValue = getDealSortValue(b, field);

  if (typeof aValue === "number" || typeof bValue === "number") {
    return (getSortNumeric(aValue) - getSortNumeric(bValue)) * direction;
  }
  return getSortText(aValue).localeCompare(getSortText(bValue)) * direction;
}

const createStyles = (theme, cardStyles) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.surfaceMuted,
    },
    header: {
      paddingTop: 16,
      paddingBottom: 20,
      paddingHorizontal: 20,
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
    },
    headerContent: {
      width: "100%",
      gap: 10,
    },
    headerRow: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerDivider: {
      height: 1,
      width: "100%",
      backgroundColor: theme.colors.onPrimarySoft,
      marginTop: 2,
    },
    greetingLabel: {
      color: theme.colors.onPrimaryMuted,
      fontSize: 11,
      fontWeight: "600",
    },
    greetingName: {
      fontWeight: "800",
      color: theme.colors.onPrimary,
      marginTop: 2,
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
      position: "relative",
    },
    headerIconInner: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: theme.colors.onPrimarySoft,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.onPrimaryMuted,
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
      borderColor: theme.colors.onPrimary,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "center",
      alignSelf: "center",
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
    searchRow: {
      marginTop: 16,
    },
    searchInputWrap: {
      position: "relative",
    },
    searchInputContainer: {
      marginTop: 0,
    },
    searchInput: {
      backgroundColor: theme.colors.onPrimarySoft,
      borderWidth: 1,
      borderColor: theme.colors.onPrimaryMuted,
      color: theme.colors.onPrimary,
      borderRadius: 18,
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
      backgroundColor: theme.colors.onPrimarySoft,
      borderWidth: 1,
      borderColor: theme.colors.onPrimaryMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    debugChip: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: theme.colors.onPrimarySoft,
      borderWidth: 1,
      borderColor: theme.colors.onPrimaryMuted,
    },
    debugChipText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
    sortOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sortBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.overlay,
    },
    sortSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderColor: theme.colors.border,
      gap: 12,
    },
    sortTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: theme.colors.text,
    },
    sortOrderRow: {
      flexDirection: "row",
      gap: 10,
    },
    sortOrderChip: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
    },
    sortOrderChipActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.infoSoft,
    },
    sortOrderText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textMuted,
    },
    sortOrderTextActive: {
      color: theme.colors.primary,
    },
    sortFieldList: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      overflow: "hidden",
    },
    sortFieldRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    sortFieldRowActive: {
      backgroundColor: theme.colors.infoSoft,
    },
    sortFieldText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text,
    },
    sortFieldTextActive: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    sortFooterRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
      marginTop: 2,
    },
    sortClearButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 11,
    },
    sortClearText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textMuted,
    },
    sortCloseButton: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 11,
    },
    sortCloseText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
    filterWrap: {
      paddingTop: 16,
      paddingBottom: 8,
    },
    filterChip: {
      marginRight: 12,
      minWidth: 64,
      alignItems: "center",
      justifyContent: "center",
    },
    filterChipGradient: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      padding: 1,
    },
    filterChipIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    filterChipIconWrapActive: {
      backgroundColor: theme.colors.onPrimarySoft,
      borderWidth: 1,
      borderColor: theme.colors.onPrimaryMuted,
    },
    filterChipIconWrapIdle: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterChipLabel: {
      marginTop: 6,
      fontSize: 10,
      fontWeight: "700",
    },
    filterChipLabelActive: {
      color: theme.colors.text,
    },
    filterChipLabelIdle: {
      color: theme.colors.textMuted,
    },
    filterChipBadge: {
      minWidth: 28,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
      borderWidth: 1,
      marginTop: 4,
    },
    filterChipBadgeActive: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    filterChipBadgeIdle: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
    },
    filterChipBadgeText: {
      fontSize: 9,
      fontWeight: "800",
    },
    filterChipBadgeTextActive: {
      color: theme.colors.text,
    },
    filterChipBadgeTextIdle: {
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
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...cardStyles.shadow,
    },
    cardImageWrap: {
      height: 190,
      backgroundColor: theme.colors.surfaceLight,
      overflow: "hidden",
    },
    cardImage: {
      width: "100%",
      height: "100%",
    },
    cardImagePlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceLight,
    },
    cardBadge: {
      position: "absolute",
      top: 12,
      left: 12,
      backgroundColor: theme.colors.warningBright,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    cardBadgeText: {
      color: theme.colors.onPrimary,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    cardHeart: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceGlass,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    discountTagWrap: {
      position: "absolute",
      top: -2,
      right: 56,
      alignItems: "center",
    },
    discountTagString: {
      width: 2,
      height: 18,
      backgroundColor: theme.colors.amberBorder,
      borderRadius: 1,
    },
    discountTag: {
      minWidth: 86,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.amberChipBg,
      borderWidth: 1,
      borderColor: theme.colors.amberBorder,
      alignItems: "center",
      transform: [{ rotate: "-3deg" }],
    },
    discountTagHole: {
      position: "absolute",
      top: 6,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.amberBorder,
    },
    discountTagLabel: {
      fontSize: 9,
      fontWeight: "700",
      color: theme.colors.amberText,
      letterSpacing: 0.6,
    },
    discountTagValueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 4,
      marginTop: 4,
    },
    discountTagValue: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.text,
    },
    discountTagOff: {
      fontSize: 10,
      fontWeight: "800",
      color: theme.colors.textMuted,
    },
    cardBody: {
      padding: 16,
      gap: 8,
    },
    cardTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 10,
    },
    cardTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "900",
      color: theme.colors.text,
    },
    cardDiscount: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.colors.warningBright,
    },
    cardSubtitle: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    cardSubtitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    cardExpiry: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.colors.warningBright,
    },
    cardMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    metaChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.colors.surfaceLight,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    metaText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.textMuted,
    },
    cardActionRow: {
      alignItems: "flex-end",
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
    progressPercent: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.colors.textMuted,
    },
    progressTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceLight,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
    },
    cardActionBtn: {
      backgroundColor: theme.colors.text,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    cardActionText: {
      color: theme.colors.onPrimary,
      fontSize: 12,
      fontWeight: "700",
    },
  });
