import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { db } from "../config/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getCardStyles,
  EmptyState,
  DealCard as SharedDealCard,
  AppInput,
  DealBuddyLoadingScreen,
  getStatusColor,
  getStatusLabel,
  toDate,
  formatDate,
  useTheme,
  CardHeader,
  TopPageHeader,
  DEAL_SORT_FIELDS,
  DEAL_FILTER_FIELDS,
  normalizeDealFilterText,
  applyDealFieldFilters,
  sortDealsByField,
  DealSortModal,
  DealFilterModal,
  AppButton,
} from "@dealsworld/shared";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { useNotifications } from "../hooks/useNotifications";

const SPACING = 20;
const STATUS_FILTERS = [
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "rejected", label: "Rejected" },
  { key: "expired", label: "Expired" },
];

const SORT_FIELDS = DEAL_SORT_FIELDS;
const FILTER_FIELDS = DEAL_FILTER_FIELDS;

export default function SellerDashboard({ navigation }) {
  const { theme } = useTheme();
  const cardStyles = useMemo(() => getCardStyles(theme), [theme]);
  const styles = useMemo(() => createStyles(theme, cardStyles), [theme, cardStyles]);

  const FilterChip = ({ label, count, isSelected, onPress }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        isSelected ? styles.filterChipActive : styles.filterChipIdle,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          isSelected ? styles.filterChipTextActive : styles.filterChipTextIdle,
        ]}
      >
        {count !== null && count !== undefined ? `${label} (${count})` : label}
      </Text>
    </TouchableOpacity>
  );

  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { unreadCount } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState({
    active: 0,
    pending: 0,
    rejected: 0,
    expired: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isSortVisible, setIsSortVisible] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filterRules, setFilterRules] = useState([]);
  const [filterField, setFilterField] = useState(null);
  const [filterQuery, setFilterQuery] = useState("");
  const greetingLabel = getGreetingLabel(now);
  const sellerDisplayName = useMemo(() => {
    const explicitName =
      profile?.displayName || profile?.fullName || profile?.name || "";
    if (String(explicitName).trim()) {
      return String(explicitName).trim();
    }
    if (user?.displayName && String(user.displayName).trim()) {
      return String(user.displayName).trim();
    }
    if (user?.email && String(user.email).includes("@")) {
      return String(user.email).split("@")[0];
    }
    return "Seller";
  }, [profile, user]);

  // Track selected filter: null (live), 'active', 'pending', 'rejected', 'expired'
  const [selectedFilter, setSelectedFilter] = useState(null);

  const sellerOwnership = useMemo(() => {
    const idValues = [
      user?.uid,
      profile?.sellerId,
      profile?.legacySellerId,
      profile?.vendorId,
      profile?.vendorid,
      profile?.sellerCode,
      profile?.code,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const nameValues = [
      profile?.displayName,
      profile?.fullName,
      profile?.name,
      profile?.businessName,
      sellerDisplayName,
    ]
      .map((value) => normalizeText(value))
      .filter(Boolean);
    return {
      ids: new Set(idValues),
      names: new Set(nameValues),
    };
  }, [
    profile?.businessName,
    profile?.code,
    profile?.displayName,
    profile?.fullName,
    profile?.legacySellerId,
    profile?.name,
    profile?.sellerCode,
    profile?.sellerId,
    profile?.vendorId,
    profile?.vendorid,
    sellerDisplayName,
    user?.uid,
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  useEffect(() => {
    setLoading(true);
    const dealsRef = collection(db, "deals");
    const unsubscribe = onSnapshot(
      dealsRef,
      (snapshot) => {
        const dealsList = [];
        let activeCount = 0;
        let pendingCount = 0;
        let rejectedCount = 0;
        let expiredCount = 0;
        const nowMs = Date.now();

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!isDealOwnedBySeller(data, sellerOwnership)) {
            return;
          }
          const displayStatus = getDealDisplayStatus(data, nowMs);

          const currentJoins = data.currentJoins ?? data.joinedUsers ?? 0;
          const minGroupSize = data.minGroupSize ?? 1;
          const shouldSetThreshold =
            !data.thresholdReachedAt && currentJoins >= minGroupSize;

          if (shouldSetThreshold) {
            const updates = {
              thresholdReachedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };

            updateDoc(doc.ref, updates).catch((error) => {
              console.error("Failed to update deal:", error);
            });
          }

          dealsList.push({
            id: doc.id,
            ...data,
            thresholdReachedAt: shouldSetThreshold
              ? new Date(nowMs)
              : data.thresholdReachedAt,
          });

          if (displayStatus === "active") {
            activeCount++;
          } else if (displayStatus === "pending") {
            pendingCount++;
          } else if (displayStatus === "rejected") {
            rejectedCount++;
          } else if (displayStatus === "expired") {
            expiredCount++;
          }
        });

        setStats({
          active: activeCount,
          pending: pendingCount,
          rejected: rejectedCount,
          expired: expiredCount,
        });
        dealsList.sort((a, b) => {
          const aDate = toDate(a.createdAt);
          const bDate = toDate(b.createdAt);
          const aMs =
            aDate instanceof Date && !Number.isNaN(aDate.getTime())
              ? aDate.getTime()
              : 0;
          const bMs =
            bDate instanceof Date && !Number.isNaN(bDate.getTime())
              ? bDate.getTime()
              : 0;
          return bMs - aMs;
        });
        setDeals(dealsList);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [sellerOwnership]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Filter Logic
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const queryTokens = normalizedQuery ? normalizedQuery.split(/\s+/) : [];
  const canAddFilterRule = Boolean(
    filterField && filterQuery.trim().length > 0,
  );
  const hasFieldFilter = filterRules.length > 0;

  const filteredDeals = deals.filter((deal) => {
    const displayStatus = getDealDisplayStatus(deal, now);
    if (displayStatus === "completed") return false;

    if (selectedFilter) {
      if (displayStatus !== selectedFilter) {
        return false;
      }
    } else if (!(displayStatus === "active" || displayStatus === "pending")) {
      return false;
    }

    if (!queryTokens.length) return true;

    const haystack = buildSearchText(deal);
    const haystackWords = haystack.split(/\s+/);
    return queryTokens.every((token) =>
      fuzzyMatchToken(token, haystack, haystackWords),
    );
  });

  const fieldFilteredDeals = useMemo(() => {
    if (!filteredDeals?.length || !filterRules.length) return filteredDeals;
    return applyDealFieldFilters(filteredDeals, filterRules, {
      getStatusValue: (deal) => getDealDisplayStatus(deal, now),
    });
  }, [filteredDeals, filterRules, now]);

  const sortedDeals = useMemo(() => {
    if (!fieldFilteredDeals?.length || !sortField) return fieldFilteredDeals;
    return sortDealsByField(fieldFilteredDeals, sortField, sortOrder, {
      getStatusValue: (deal) => getDealDisplayStatus(deal, now),
    });
  }, [fieldFilteredDeals, sortField, sortOrder, now]);

  const handleFilterPress = (status) => {
    setSelectedFilter((prev) => (prev === status ? null : status));
  };

  const handleToggleSearch = () => {
    setIsSearchVisible((prev) => {
      const next = !prev;
      if (!next) setSearchQuery("");
      return next;
    });
  };

  const handleSelectSortField = (field) => {
    setSortField(field);
    setIsSortVisible(false);
  };

  const handleSelectFilterField = (field) => {
    setFilterField(field);
  };

  const handleAddFilterRule = () => {
    if (!canAddFilterRule) return;
    const normalizedValue = filterQuery.trim();
    const nextRule = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      field: filterField,
      query: normalizedValue,
      mode: "contains",
    };
    setFilterRules((prev) => {
      const duplicate = prev.some(
        (rule) =>
          rule.field === nextRule.field &&
          rule.mode === nextRule.mode &&
          normalizeDealFilterText(rule.query) ===
            normalizeDealFilterText(nextRule.query),
      );
      return duplicate ? prev : [...prev, nextRule];
    });
    setFilterQuery("");
  };

  const handleRemoveFilterRule = (ruleId) => {
    setFilterRules((prev) => prev.filter((rule) => rule.id !== ruleId));
  };

  const handleApplyFilters = () => {
    if (canAddFilterRule) {
      handleAddFilterRule();
    }
    setIsFilterVisible(false);
  };

  const HeaderActionButton = ({ label, onPress, icon, showBadge = false }) => (
    <View style={styles.headerActionItem}>
      <TouchableOpacity
        onPress={onPress}
        style={styles.headerIconButton}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDeep]}
          style={styles.headerIconGradient}
        >
          <View style={styles.headerIconInner}>{icon}</View>
          {showBadge ? <View style={styles.badgeDot} /> : null}
        </LinearGradient>
      </TouchableOpacity>
      <Text style={styles.headerActionLabel}>{label}</Text>
    </View>
  );

  if (loading) {
    return <DealBuddyLoadingScreen label="Loading deals..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.danger]}
          />
        }
      >
        <TopPageHeader
          includeSafeArea={false}
          rounded
          style={styles.header}
          customRow={
            <View style={styles.headerContent}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.greetingLabel}>{greetingLabel}</Text>
                  <Text style={styles.greetingName}>{sellerDisplayName}</Text>
                </View>
                {__DEV__ && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate("StyleGuide")}
                    style={styles.debugChip}
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
                    <Ionicons
                      name="search"
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
                        sortField
                          ? theme.colors.warningBright
                          : theme.colors.onPrimary
                      }
                    />
                  }
                />
                <HeaderActionButton
                  label="Filter"
                  onPress={() => setIsFilterVisible(true)}
                  icon={
                    <Ionicons
                      name="options-outline"
                      size={16}
                      color={
                        hasFieldFilter
                          ? theme.colors.warningBright
                          : theme.colors.onPrimary
                      }
                    />
                  }
                />
                <HeaderActionButton
                  label="Alerts"
                  onPress={() => navigation.navigate("Notifications")}
                  icon={
                    <Ionicons
                      name="notifications-outline"
                      size={16}
                      color={theme.colors.onPrimary}
                    />
                  }
                  showBadge={unreadCount > 0}
                />
                <HeaderActionButton
                  label="Profile"
                  onPress={() => navigation.navigate("Profile")}
                  icon={
                    <Ionicons
                      name="person-outline"
                      size={16}
                      color={theme.colors.onPrimary}
                    />
                  }
                />
              </View>
            </View>
          }
        >
          {isSearchVisible ? (
            <View style={styles.searchRow}>
              <View style={styles.searchInputWrap}>
                <AppInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search for deals..."
                  containerStyle={styles.searchInputContainer}
                  inputStyle={styles.searchInput}
                  placeholderTextColor={theme.colors.onPrimaryMuted}
                  leftElement={
                    <Ionicons
                      name="search"
                      size={18}
                      color={theme.colors.onPrimaryMuted}
                    />
                  }
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearSearchBtn}
                    onPress={() => setSearchQuery("")}
                  >
                    <View style={styles.clearSearchCircle}>
                      <Ionicons
                        name="close"
                        size={14}
                        color={theme.colors.onPrimaryMuted}
                      />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : null}
        </TopPageHeader>

        <View style={styles.filterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 12 }}
          >
            {STATUS_FILTERS.map((filter) => {
              const count = stats[filter.key] ?? 0;
              return (
                <FilterChip
                  key={filter.key}
                  label={filter.label}
                  count={count}
                  isSelected={selectedFilter === filter.key}
                  onPress={() => handleFilterPress(filter.key)}
                />
              );
            })}
          </ScrollView>
        </View>

        <AppButton
          title="Create New Deal"
          subtitle="Boost your sales today"
          onPress={() => navigation.navigate("CreateDeal")}
          style={styles.createDealCta}
          leftIcon={
            <Ionicons name="add" size={20} color={theme.colors.onPrimary} />
          }
          rightIcon={
            <Ionicons
              name="arrow-forward"
              size={20}
              color={theme.colors.onPrimaryMuted}
            />
          }
        />

        <View style={styles.section}>
          <CardHeader
            title={
              selectedFilter
                ? `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Deals`
                : "Live Deals"
            }
          />

          {sortedDeals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                title="No matching deals found."
                subtitle="Try adjusting your search or filters."
              />
            </View>
          ) : (
            sortedDeals.map((deal) => {
              const joins = deal.joinedUsers || 0;
              const lifecycleStatus = getDealDisplayStatus(deal, now);
              const accentColor = getStatusColor(lifecycleStatus, theme);
              const expiryDate = toDate(deal.expiresAt);
              const endsInLabel =
                expiryDate instanceof Date && !Number.isNaN(expiryDate.getTime())
                  ? formatEndsIn(expiryDate.getTime(), now)
                  : null;

              return (
                <SharedDealCard
                  key={deal.id}
                  title={deal.title}
                  category={deal.category || null}
                  image={deal.image}
                  joins={joins}
                  targetCount={deal.minGroupSize ?? deal.minThreshold ?? 0}
                  accentColor={accentColor}
                  badgeLabel={getStatusLabel(lifecycleStatus)}
                  statusLabel={getStatusLabel(lifecycleStatus)}
                  viewsCount={deal.viewsCount ?? deal.views ?? 0}
                  favoritesCount={
                    deal.favoritesCount ?? deal.favouritesCount ?? 0
                  }
                  ratingAvg={deal.ratingAvg ?? deal.rating ?? null}
                  ratingCount={deal.ratingCount ?? 0}
                  originalPrice={deal.originalPrice}
                  discountPrice={deal.discountPrice}
                  countdown={null}
                  expiryLabel={endsInLabel}
                  actionLabel="View Deal"
                  onActionPress={() =>
                    navigation.navigate("DealDetails", { deal })
                  }
                  onPress={() => navigation.navigate("DealDetails", { deal })}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      <DealSortModal
        visible={isSortVisible}
        onClose={() => setIsSortVisible(false)}
        fields={SORT_FIELDS}
        selectedField={sortField}
        onSelectField={handleSelectSortField}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onClear={() => {
          setSortField(null);
          setSortOrder("asc");
          setIsSortVisible(false);
        }}
      />

      <DealFilterModal
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        fields={FILTER_FIELDS}
        selectedField={filterField}
        onSelectField={handleSelectFilterField}
        filterQuery={filterQuery}
        onFilterQueryChange={setFilterQuery}
        canAddRule={canAddFilterRule}
        onAddRule={handleAddFilterRule}
        rules={filterRules}
        onRemoveRule={handleRemoveFilterRule}
        onClearAll={() => {
          setFilterRules([]);
          setFilterField(null);
          setFilterQuery("");
          setIsFilterVisible(false);
        }}
        onApply={handleApplyFilters}
        resultCount={sortedDeals?.length || 0}
      />
    </SafeAreaView>
  );
}

// FIXED: Added 'onPress' to the arguments here
function fuzzyMatchToken(token, haystack, words) {
  if (!token) return true;
  if (haystack.includes(token)) return true;
  if (token.length <= 2) return false;

  const maxDist = token.length >= 8 ? 2 : 1;
  return words.some((word) => {
    if (!word) return false;
    if (word.includes(token)) return true;
    if (token.length >= 4 && word.length >= token.length) {
      if (isSubsequence(token, word)) return true;
    }
    const lengthDiff = Math.abs(word.length - token.length);
    if (lengthDiff > maxDist) return false;
    return limitedEditDistance(token, word, maxDist) <= maxDist;
  });
}

function isSubsequence(needle, hay) {
  let i = 0;
  let j = 0;
  while (i < needle.length && j < hay.length) {
    if (needle[i] === hay[j]) {
      i += 1;
    }
    j += 1;
  }
  return i === needle.length;
}

function limitedEditDistance(a, b, maxDist) {
  if (a === b) return 0;
  const aLen = a.length;
  const bLen = b.length;
  if (Math.abs(aLen - bLen) > maxDist) return maxDist + 1;

  const prev = new Array(bLen + 1);
  const curr = new Array(bLen + 1);
  for (let j = 0; j <= bLen; j += 1) prev[j] = j;

  for (let i = 1; i <= aLen; i += 1) {
    curr[0] = i;
    let rowMin = curr[0];
    const aChar = a[i - 1];

    for (let j = 1; j <= bLen; j += 1) {
      const cost = aChar === b[j - 1] ? 0 : 1;
      const del = prev[j] + 1;
      const ins = curr[j - 1] + 1;
      const sub = prev[j - 1] + cost;
      const val = Math.min(del, ins, sub);
      curr[j] = val;
      if (val < rowMin) rowMin = val;
    }

    if (rowMin > maxDist) return maxDist + 1;

    for (let j = 0; j <= bLen; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[bLen];
}

function buildSearchText(deal) {
  const expiryDate = toDate(deal.expiresAt);
  const createdDate = toDate(deal.createdAt);
  const updatedDate = toDate(deal.updatedAt);

  const parts = [
    deal.id,
    deal.title,
    deal.description,
    deal.category,
    deal.location,
    deal.deliveryMode,
    deal.status,
    deal.sellerId,
    deal.originalPrice,
    deal.discountPrice,
    deal.minGroupSize,
    deal.deliveryCharge,
    expiryDate ? formatDate(expiryDate) : "",
    createdDate ? formatDate(createdDate) : "",
    updatedDate ? formatDate(updatedDate) : "",
  ];

  return parts
    .map((value) => {
      if (value === null || value === undefined) return "";
      if (typeof value === "string") return value;
      if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
      }
      if (value instanceof Date) return value.toISOString();
      return String(value);
    })
    .join(" ")
    .toLowerCase();
}

function formatEndsIn(expiryMs, nowMs = Date.now()) {
  if (typeof expiryMs !== "number") return null;
  const diffMs = expiryMs - nowMs;
  if (diffMs <= 0) return "Ends soon";
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  if (days > 0) return `Ends in ${days}d`;
  if (hours > 0) return `Ends in ${hours}h`;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `Ends in ${Math.max(minutes, 1)}m`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isDealOwnedBySeller(deal, ownership) {
  if (!deal || !ownership) return false;
  const idSet = ownership.ids || new Set();
  const nameSet = ownership.names || new Set();
  if (!idSet.size && !nameSet.size) return false;

  const idFields = [
    deal?.sellerId,
    deal?.vendorId,
    deal?.vendorid,
    deal?.legacySellerId,
    deal?.sellerCode,
    deal?.code,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (idFields.some((value) => idSet.has(value))) {
    return true;
  }

  const nameFields = [deal?.sellerName, deal?.sellerDisplayName, deal?.vendorName]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  return nameFields.some((value) => nameSet.has(value));
}

function getGreetingLabel(nowMs) {
  const hour = new Date(nowMs).getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
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
  if (approvalStatus === "rejected" || status === "rejected") {
    return "rejected";
  }
  if (isAdminPublished) return "active";
  return "pending";
}

function getDealDisplayStatus(deal, nowMs = Date.now()) {
  const lifecycleStatus = getDealLifecycleStatus(deal);
  if (lifecycleStatus === "completed" || lifecycleStatus === "rejected") {
    return lifecycleStatus;
  }
  const expiryDate = toDate(deal?.expiresAt);
  const isExpired =
    expiryDate instanceof Date &&
    !Number.isNaN(expiryDate.getTime()) &&
    expiryDate.getTime() <= nowMs;
  if (isExpired) return "expired";
  return lifecycleStatus;
}

const createStyles = (theme, cardStyles) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.dashboardBg },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    width: "100%",
  },
  scrollContent: { paddingBottom: 40 },
  header: {
    paddingHorizontal: SPACING,
    paddingTop: 16,
    paddingBottom: 20,
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
  sortButtonDisabled: {
    opacity: 0.5,
  },
  activeFilterList: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    maxHeight: 150,
  },
  activeFilterEmptyText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activeFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  activeFilterText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: "600",
  },
  filterInputWrap: {
    marginTop: 2,
  },
  filterInputContainer: {
    marginTop: 0,
  },
  filterInput: {
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
  },
  filterWrap: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 10,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipIdle: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: theme.colors.onPrimary,
  },
  filterChipTextIdle: {
    color: theme.colors.textMuted,
  },
  createDealCta: {
    marginHorizontal: SPACING,
    marginBottom: 30,
    ...cardStyles.shadow,
  },
  createDealGradient: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  createDealLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  createDealIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.onPrimarySoft,
    borderWidth: 1,
    borderColor: theme.colors.onPrimaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  createDealTitle: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  createDealSubtitle: {
    marginTop: 2,
    color: theme.colors.onPrimaryMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  section: { paddingHorizontal: SPACING, marginBottom: 15 },
  emptyContainer: { alignItems: "center", marginTop: 40 },
});

