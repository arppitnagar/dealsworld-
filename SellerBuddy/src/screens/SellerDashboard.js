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

  // Using lowercase "vendorid" to match your Firestore fields
  const vendorid = "vendor_001";

  // Manual Refresh Handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Real-time listener handles the data; this just provide UX feedback
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  useEffect(() => {
    console.log("DEBUG: Dashboard fetching for VendorID:", vendorid);

    const dealsRef = collection(db, "deals");

    // Query aligned with your Firebase Index (vendorid ASC, createdAt DESC)
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

        console.log(`DEBUG: query returned ${snapshot.docs.length} documents`);

        snapshot.forEach((doc) => {
          const data = doc.data();
          dealsList.push({ id: doc.id, ...data });

          // Logic based on status field
          if (data.status === "active") {
            activeCount++;
          } else if (data.status === "completed") {
            previousCount++;
          } else {
            // Default to scheduled if null/undefined
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
        console.error("DEBUG: Firestore Error:", error.code, error.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [vendorid]);

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
            tintColor="#FF4D4D"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Dashboard</Text>
            <Text style={styles.subtitle}>Real-time performance</Text>
          </View>
          <TouchableOpacity style={styles.profileCircle}>
            <Ionicons name="person" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Vibrant Top Metrics */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Active"
            count={stats.active}
            color="#FF4D4D"
            bgColor="#FFF5F5"
            icon="flame"
          />
          <StatCard
            title="Scheduled"
            count={stats.scheduled}
            color="#7C3AED"
            bgColor="#F5F3FF"
            icon="calendar"
          />
          <StatCard
            title="Previous"
            count={stats.previous}
            color="#10B981"
            bgColor="#ECFDF5"
            icon="checkmark-circle"
          />
        </View>

        {/* Action Button */}
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

        {/* Active Deals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Deals</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {deals.filter((d) => d.status === "active").length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="rocket-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>No active campaigns running.</Text>
            </View>
          ) : (
            deals
              .filter((d) => d.status === "active")
              .map((deal) => <DealCard key={deal.id} deal={deal} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* Sub-Components */

function StatCard({ title, count, color, bgColor, icon }) {
  return (
    <View style={[styles.statCard, { borderColor: color + "20" }]}>
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: color }]}>
        {count < 10 ? `0${count}` : count}
      </Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );
}

function DealCard({ deal }) {
  const joins = deal.currentJoins || 0;
  const target = deal.minThreshold || 1;
  const progress = Math.min(joins / target, 1);

  return (
    <TouchableOpacity style={styles.dealCard} activeOpacity={0.9}>
      <View style={styles.accentStrip} />
      <View style={styles.dealContent}>
        <View style={styles.dealTopRow}>
          <View style={styles.imagePlaceholder}>
            {deal.image ? (
              <Image source={{ uri: deal.image }} style={styles.dealImage} />
            ) : (
              <Ionicons name="pricetag" size={20} color="#FF4D4D" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
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
            <Text style={styles.progressLabel}>Campaign Goal</Text>
            <Text style={styles.progressPercent}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={styles.joinCount}>
            {joins} of {target} joined
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING,
    paddingTop: 20,
    marginBottom: 25,
  },
  welcome: { fontSize: 28, fontWeight: "900", color: "#0F172A" },
  subtitle: { fontSize: 14, color: "#64748B", fontWeight: "500" },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
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
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
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
    letterSpacing: 0.5,
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
    shadowColor: "#0F172A",
    shadowOpacity: 0.3,
    shadowRadius: 20,
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
  createBtnSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "500",
  },
  section: { paddingHorizontal: SPACING },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  seeAll: { color: "#7C3AED", fontWeight: "700", fontSize: 13 },
  dealCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    flexDirection: "row",
    marginBottom: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  accentStrip: { width: 6, backgroundColor: "#FF4D4D" },
  dealContent: { flex: 1, padding: 16 },
  dealTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  imagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dealImage: { width: "100%", height: "100%", borderRadius: 15 },
  categoryBadge: {
    backgroundColor: "#FF4D4D15",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  categoryText: {
    color: "#FF4D4D",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
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
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FF4D4D",
    borderRadius: 4,
  },
  joinCount: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    marginTop: 10,
    fontWeight: "600",
  },
});
