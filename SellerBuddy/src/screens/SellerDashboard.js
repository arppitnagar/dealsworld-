import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
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
} from "firebase/firestore";

const { width } = Dimensions.get("window");
const SPACING = 20;

export default function SellerDashboard({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState({ active: 0, scheduled: 0, previous: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Track selected filter: null (all), 'active', 'pending', or 'completed'
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
        let previousCount = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          dealsList.push({ id: doc.id, ...data });

          if (data.status === "active") {
            activeCount++;
          } else if (data.status === "completed") {
            previousCount++;
          } else {
            scheduledCount++;
          }
        });

        setStats({
          active: activeCount,
          scheduled: scheduledCount,
          previous: previousCount,
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
  const filteredDeals = selectedFilter
    ? deals.filter((d) => {
        if (selectedFilter === "pending") {
          return d.status !== "active" && d.status !== "completed";
        }
        return d.status === selectedFilter;
      })
    : deals;

  const handleFilterPress = (status) => {
    setSelectedFilter((prev) => (prev === status ? null : status));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF4D4D" />
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
            colors={["#FF4D4D"]}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Dashboard</Text>
            <Text style={styles.subtitle}>
              {selectedFilter
                ? `Showing ${selectedFilter} items`
                : "Real-time performance"}
            </Text>
          </View>
          {selectedFilter && (
            <TouchableOpacity onPress={() => setSelectedFilter(null)}>
              <Text style={styles.clearText}>Show All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Interactive Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Active"
            count={stats.active}
            color="#FF4D4D"
            bgColor="#FFF5F5"
            icon="flame"
            isSelected={selectedFilter === "active"}
            onPress={() => handleFilterPress("active")}
          />
          <StatCard
            title="pending"
            count={stats.scheduled}
            color="#7C3AED"
            bgColor="#F5F3FF"
            icon="calendar"
            isSelected={selectedFilter === "pending"}
            onPress={() => handleFilterPress("pending")}
          />
          <StatCard
            title="Previous"
            count={stats.previous}
            color="#10B981"
            bgColor="#ECFDF5"
            icon="checkmark-circle"
            isSelected={selectedFilter === "completed"}
            onPress={() => handleFilterPress("completed")}
          />
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate("CreateDeal")}
        >
          <View style={styles.createBtnContent}>
            <View style={styles.addIconBox}>
              <Ionicons name="add" size={24} color="#FFF" />
            </View>
            <View>
              <Text style={styles.createBtnTitle}>Create New Deal</Text>
              <Text style={styles.createBtnSub}>Boost your sales today</Text>
            </View>
          </View>
          <Ionicons
            name="arrow-forward"
            size={20}
            color="rgba(255,255,255,0.4)"
          />
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedFilter
              ? `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Deals`
              : "Live Deals"}
          </Text>

          {filteredDeals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>No matching deals found.</Text>
            </View>
          ) : (
            filteredDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                now={now}
                onPress={() => navigation.navigate("DealDetails", { deal })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ title, count, color, bgColor, icon, onPress, isSelected }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.statCard,
        { borderColor: color + "20" },
        isSelected && { borderColor: color, borderWidth: 2, elevation: 8 },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: color }]}>
        {count < 10 ? `0${count}` : count}
      </Text>
      <Text style={styles.statLabel}>{title}</Text>
    </TouchableOpacity>
  );
}

// FIXED: Added 'onPress' to the arguments here
function DealCard({ deal, onPress, now }) {
  const joins = deal.joinedUsers || 0;
  const target = deal.minGroupSize || 1;
  const progress = Math.min(joins / target, 1);
  const accentColor =
    deal.status === "active"
      ? "#FF4D4D"
      : deal.status === "completed"
        ? "#10B981"
        : "#7C3AED";
  const expiryDate = getExpiryDate(deal.expiresAt);
  const countdown =
    deal.status === "active" && expiryDate
      ? formatCountdown(expiryDate.getTime() - now)
      : null;

  return (
    <TouchableOpacity
      style={styles.dealCard}
      onPress={onPress} // This now works because onPress is defined above
      activeOpacity={0.9}
    >
      <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />
      <View style={styles.dealContent}>
        <View style={styles.dealTopRow}>
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: accentColor + "10" },
            ]}
          >
            {deal.image ? (
              <Image source={{ uri: deal.image }} style={styles.dealImage} />
            ) : (
              <Ionicons name="pricetag" size={20} color={accentColor} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: accentColor + "15" },
              ]}
            >
              <Text style={[styles.categoryText, { color: accentColor }]}>
                {deal.category || "General"}
              </Text>
            </View>
            <Text style={styles.dealTitle} numberOfLines={1}>
              {deal.title}
            </Text>
          </View>
        </View>
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPercent}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress * 100}%`, backgroundColor: accentColor },
              ]}
            />
          </View>
          <Text style={styles.joinCount}>
            {joins} / {target} Joined
          </Text>
          {countdown && (
            <View style={styles.countdownRow}>
              <Ionicons name="time-outline" size={14} color={accentColor} />
              <Text style={[styles.countdownText, { color: accentColor }]}>
                {countdown}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getExpiryDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatCountdown(ms) {
  if (ms <= 0) return "Expired";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `Ends in ${days}d ${String(hours).padStart(2, "0")}h ${String(
      minutes,
    ).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `Ends in ${String(hours).padStart(2, "0")}:${String(
    minutes,
  ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING,
    paddingTop: 20,
    marginBottom: 25,
  },
  welcome: { fontSize: 28, fontWeight: "900", color: "#0F172A" },
  subtitle: { fontSize: 14, color: "#64748B", fontWeight: "500" },
  clearText: { color: "#7C3AED", fontWeight: "800", fontSize: 13 },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING,
    marginBottom: 25,
  },
  statCard: {
    width: (width - 60) / 3,
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    elevation: 4,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: { fontSize: 24, fontWeight: "900" },
  statLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F172A",
    marginHorizontal: SPACING,
    padding: 18,
    borderRadius: 24,
    marginBottom: 30,
    elevation: 8,
  },
  createBtnContent: { flexDirection: "row", alignItems: "center" },
  addIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  createBtnTitle: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  createBtnSub: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  section: { paddingHorizontal: SPACING },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 15,
  },
  dealCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    flexDirection: "row",
    marginBottom: 16,
    overflow: "hidden",
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  accentStrip: { width: 6 },
  dealContent: { flex: 1, padding: 16 },
  dealTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  imagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dealImage: { width: "100%", height: "100%", borderRadius: 15 },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  categoryText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  dealTitle: { fontSize: 17, fontWeight: "700", color: "#1E293B" },
  progressSection: {
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
    paddingTop: 12,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  progressPercent: { fontSize: 13, color: "#1E293B", fontWeight: "800" },
  progressBarBg: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: { height: "100%", borderRadius: 4 },
  joinCount: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    marginTop: 10,
    fontWeight: "600",
  },
});
