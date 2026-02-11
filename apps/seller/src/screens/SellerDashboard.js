import React, { useState, useEffect, useCallback } from "react";
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
  query,
  where,
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
  formatExpiryLabel,
  formatCountdown,
  theme,
  CardHeader,
} from "@dealsworld/shared";

const SPACING = 20;
const cardStyles = getCardStyles(theme);
const STATUS_FILTERS = [
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
];

const FilterChip = ({ label, count, isSelected, onPress, accentColor }) => (
  <TouchableOpacity
    style={[
      styles.filterChip,
      isSelected ? styles.filterChipActive : styles.filterChipIdle,
      isSelected && { backgroundColor: accentColor, borderColor: accentColor },
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

export default function SellerDashboard({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState({ active: 0, scheduled: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [searchQuery, setSearchQuery] = useState("");
  const greetingLabel = getGreetingLabel(now);

  // Track selected filter: null (all), 'active', or 'pending'
  const [selectedFilter, setSelectedFilter] = useState(null);

  const sellerId = "vendor_001";

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  useEffect(() => {
    const dealsRef = collection(db, "deals");
    const q = query(
      dealsRef,
      where("sellerId", "==", sellerId),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const dealsList = [];
        let activeCount = 0;
        let scheduledCount = 0;
        const nowMs = Date.now();

        snapshot.forEach((doc) => {
          const data = doc.data();
          const expiryDate = toDate(data.expiresAt);
          const isExpired = expiryDate && expiryDate.getTime() <= nowMs;
          const status = getDealLifecycleStatus(data);

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

          if (!isExpired && status !== "completed") {
            if (status === "active") {
              activeCount++;
            } else {
              scheduledCount++;
            }
          }
        });

        setStats({
          active: activeCount,
          scheduled: scheduledCount,
        });
        dealsList.sort((a, b) => {
          const aDate = toDate(a.createdAt);
          const bDate = toDate(b.createdAt);
          const aMs = aDate instanceof Date && !Number.isNaN(aDate.getTime()) ? aDate.getTime() : 0;
          const bMs = bDate instanceof Date && !Number.isNaN(bDate.getTime()) ? bDate.getTime() : 0;
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
  }, [sellerId]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Filter Logic
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const queryTokens = normalizedQuery ? normalizedQuery.split(/\s+/) : [];

  const filteredDeals = deals.filter((deal) => {
    const status = getDealLifecycleStatus(deal);
    const expiryDate = toDate(deal.expiresAt);
    const isExpired = expiryDate && expiryDate.getTime() <= now;
    const isCompleted = status === "completed";
    if (isExpired || isCompleted) return false;

    if (selectedFilter) {
      if (selectedFilter === "pending") {
        if (status === "active" || status === "completed") {
          return false;
        }
      } else if (status !== selectedFilter) {
        return false;
      }
    }

    if (!queryTokens.length) return true;

    const haystack = buildSearchText(deal);
    const haystackWords = haystack.split(/\s+/);
    return queryTokens.every((token) =>
      fuzzyMatchToken(token, haystack, haystackWords),
    );
  });

  const handleFilterPress = (status) => {
    setSelectedFilter((prev) => (prev === status ? null : status));
  };

  if (loading) {
    return (
      <DealBuddyLoadingScreen label="Loading deals..." />
    );
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
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.purple]}
          style={[styles.header, { paddingTop: 16 }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.greetingRow}>
              <View style={styles.avatarWrap}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={theme.colors.onPrimary}
                />
              </View>
              <View>
                <Text style={styles.greetingLabel}>{greetingLabel}</Text>
                <Text style={styles.greetingName}>Seller</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              {__DEV__ && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("StyleGuide")}
                  style={styles.debugChip}
                >
                  <Text style={styles.debugChipText}>Style</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.headerIconBtn}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={theme.colors.onPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>

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
        </LinearGradient>

        <View style={styles.filterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 12 }}
          >
            {STATUS_FILTERS.map((filter) => {
              const count =
                filter.key === "active" ? stats.active : stats.scheduled;
              const accentColor =
                filter.key === "active"
                  ? theme.colors.warningBright
                  : theme.colors.purple;
              return (
                <FilterChip
                  key={filter.key}
                  label={filter.label}
                  count={count}
                  isSelected={selectedFilter === filter.key}
                  onPress={() => handleFilterPress(filter.key)}
                  accentColor={accentColor}
                />
              );
            })}
          </ScrollView>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate("CreateDeal")}
          style={styles.createDealCta}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.purple]}
            style={styles.createDealGradient}
          >
            <View style={styles.createDealLeft}>
              <View style={styles.createDealIconWrap}>
                <Ionicons
                  name="add"
                  size={20}
                  color={theme.colors.onPrimary}
                />
              </View>
              <View>
                <Text style={styles.createDealTitle}>Create New Deal</Text>
                <Text style={styles.createDealSubtitle}>Boost your sales today</Text>
              </View>
            </View>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={theme.colors.onPrimaryMuted}
            />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.section}>
          <CardHeader
            title={
              selectedFilter
                ? `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Deals`
                : "Live Deals"
            }
          />

          {filteredDeals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                title="No matching deals found."
                subtitle="Try adjusting your search or filters."
              />
            </View>
          ) : (
            filteredDeals.map((deal) => {
              const joins = deal.joinedUsers || 0;
              const lifecycleStatus = getDealLifecycleStatus(deal);
              const accentColor = getStatusColor(lifecycleStatus);
              const expiryDate = toDate(deal.expiresAt);
              const countdown =
                lifecycleStatus === "active" && expiryDate
                  ? formatCountdown(expiryDate.getTime() - now)
                  : null;
              const expiryLabel = expiryDate
                ? formatExpiryLabel(expiryDate, now)
                : null;

              return (
                <SharedDealCard
                  key={deal.id}
                  title={deal.title}
                  category={deal.category}
                  image={deal.image}
                  joins={joins}
                  accentColor={accentColor}
                  statusLabel={getStatusLabel(lifecycleStatus)}
                  viewsCount={deal.viewsCount ?? deal.views ?? 0}
                  favoritesCount={
                    deal.favoritesCount ?? deal.favouritesCount ?? 0
                  }
                  countdown={countdown}
                  expiryLabel={expiryLabel}
                  actionLabel="View Deal"
                  onActionPress={() => navigation.navigate("DealDetails", { deal })}
                  onPress={() => navigation.navigate("DealDetails", { deal })}
                />
              );
            })
          )}
        </View>
      </ScrollView>
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

function getGreetingLabel(nowMs) {
  const hour = new Date(nowMs).getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
}

function getDealLifecycleStatus(deal) {
  const approvalStatus = String(deal?.approvalStatus || "").toLowerCase();
  const approved = deal?.approved === true;
  const status = String(deal?.status || "").toLowerCase();

  if (status === "completed") return "completed";
  if (approvalStatus === "rejected" || status === "rejected") {
    return "rejected";
  }
  if (approvalStatus === "pending") return "pending";
  if (approvalStatus === "approved") return "active";
  if (approved || status === "active") return "active";
  return "pending";
}

const styles = StyleSheet.create({
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
    paddingBottom: 20,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.onPrimarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.onPrimaryMuted,
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconBtn: {
    backgroundColor: theme.colors.onPrimarySoft,
    padding: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.onPrimaryMuted,
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
    backgroundColor: theme.colors.warningBright,
    borderColor: theme.colors.warningBright,
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
