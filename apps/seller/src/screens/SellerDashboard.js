import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getCardStyles,
  PrimaryBanner,
  EmptyState,
  DealCard as SharedDealCard,
  SearchBar,
  StatsCard,
  HeaderBar,
  getStatusColor,
  getStatusLabel,
  toDate,
  formatDate,
  formatExpiryLabel,
  formatCountdown,
  theme,
  SkeletonList,
  CardHeader,
  SkeletonStatsRow,
} from "@dealsworld/shared";

const { width } = Dimensions.get("window");
const SPACING = 20;
const cardStyles = getCardStyles(theme);

export default function SellerDashboard({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState({ active: 0, scheduled: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [searchQuery, setSearchQuery] = useState("");

  // Track selected filter: null (all), 'active', or 'pending'
  const [selectedFilter, setSelectedFilter] = useState(null);

  const vendorid = "vendor_001";

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
      where("vendorid", "==", vendorid),
      orderBy("createdAt", "desc"),
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
          const status = String(data.status || "").toLowerCase();

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
        setDeals(dealsList);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [vendorid]);

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
    const status = String(deal.status || "").toLowerCase();
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
      <View style={styles.center}>
        <SkeletonStatsRow />
        <SkeletonList count={3} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
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
        <HeaderBar
          title="Dashboard"
          subtitle={
            selectedFilter
              ? `Showing ${selectedFilter} items`
              : "Real-time performance"
          }
          onTitleLongPress={() => navigation.navigate("StyleGuide")}
          right={
            <View style={styles.headerActions}>
              {__DEV__ && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("StyleGuide")}
                  style={styles.debugChip}
                >
                  <Text style={styles.debugChipText}>Style</Text>
                </TouchableOpacity>
              )}
              {selectedFilter ? (
                <TouchableOpacity onPress={() => setSelectedFilter(null)}>
                  <Text style={styles.clearText}>Show All</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          style={styles.header}
        />

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery("")}
          placeholder="Smart search by any value..."
          style={styles.searchBar}
        />

        {/* Interactive Stats Cards */}
        <View style={styles.statsContainer}>
          <StatsCard
            title="Active"
            count={stats.active}
            color={theme.colors.danger}
            bgColor={theme.colors.dangerSoft}
            icon="flame"
            isSelected={selectedFilter === "active"}
            onPress={() => handleFilterPress("active")}
            style={styles.statCard}
          />
          <StatsCard
            title="pending"
            count={stats.scheduled}
            color={theme.colors.purple}
            bgColor={theme.colors.purpleSoft}
            icon="calendar"
            isSelected={selectedFilter === "pending"}
            onPress={() => handleFilterPress("pending")}
            style={styles.statCard}
          />
        </View>

        <PrimaryBanner
          title="Create New Deal"
          subtitle="Boost your sales today"
          onPress={() => navigation.navigate("CreateDeal")}
          style={styles.createBtn}
        />

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
              const target = deal.minGroupSize || 1;
              const progress = Math.min(joins / target, 1);
              const accentColor = getStatusColor(deal.status);
              const expiryDate = toDate(deal.expiresAt);
              const countdown =
                deal.status === "active" && expiryDate
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
                  target={target}
                  progress={progress}
                  accentColor={accentColor}
                  statusLabel={getStatusLabel(deal.status)}
                  statusColor={accentColor}
                  countdown={countdown}
                  expiryLabel={expiryLabel}
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
    deal.vendorid,
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
    paddingTop: 20,
    marginBottom: 25,
  },
  clearText: { color: theme.colors.purple, fontWeight: "800", fontSize: 13 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING,
    marginBottom: 25,
  },
  searchBar: {
    marginHorizontal: SPACING,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 60) / 2,
  },
  createBtn: {
    marginHorizontal: SPACING,
    marginBottom: 30,
    ...cardStyles.shadow,
  },
  section: { paddingHorizontal: SPACING, marginBottom: 15 },
  emptyContainer: { alignItems: "center", marginTop: 40 },
});
