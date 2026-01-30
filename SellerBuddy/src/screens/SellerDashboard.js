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

  // Using lowercase "vendorid" as per your Firestore structure
  const vendorid = "vendor_001";

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  useEffect(() => {
    console.log(
      "DEBUG: Dashboard fetching for VendorID (lowercase):",
      vendorid,
    );

    const dealsRef = collection(db, "deals");

    // Updated query to use lowercase "vendorid" field
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
            // Default to scheduled if null or "scheduled"
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
        <ActivityIndicator size="large" color="#2563EB" />
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
            colors={["#2563EB"]}
            tintColor="#2563EB"
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Dashboard</Text>
            <Text style={styles.subtitle}>Welcome back, Merchant</Text>
          </View>
          <TouchableOpacity style={styles.profileCircle}>
            <Ionicons name="person" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <StatCard
            title="Active"
            count={stats.active}
            color="#2563EB"
            icon="flame"
          />
          <StatCard
            title="Scheduled"
            count={stats.scheduled}
            color="#7C3AED"
            icon="calendar"
          />
          <StatCard
            title="Previous"
            count={stats.previous}
            color="#10B981"
            icon="checkmark-circle"
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
              <Text style={styles.createBtnTitle}>Launch New Deal</Text>
              <Text style={styles.createBtnSub}>Boost your sales today</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Campaigns</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {deals.filter((d) => d.status === "active").length === 0 ? (
            <Text style={styles.emptyText}>
              No active campaigns currently running.
            </Text>
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

/* --- COMPONENTS REMAIN SAME --- */
function StatCard({ title, count, color, icon }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.iconCircle, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{count < 10 ? `0${count}` : count}</Text>
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
      <View style={styles.dealTop}>
        <View style={styles.imageBox}>
          {deal.image ? (
            <Image source={{ uri: deal.image }} style={styles.dealImage} />
          ) : (
            <Ionicons name="image-outline" size={24} color="#CBD5E1" />
          )}
        </View>
        <View style={styles.dealMainInfo}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{deal.category || "General"}</Text>
          </View>
          <Text style={styles.dealTitle} numberOfLines={1}>
            {deal.title}
          </Text>
          <Text style={styles.dealPrice}>
            ₹{deal.discountPrice}{" "}
            <Text style={styles.origPrice}>₹{deal.originalPrice}</Text>
          </Text>
        </View>
      </View>
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressText}>Campaign Progress</Text>
          <Text style={styles.progressPercent}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
          />
        </View>
        <Text style={styles.joinText}>
          {joins} / {target} Buyers Joined
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/* ... Styles same as previous ... */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING,
    paddingTop: 20,
    marginBottom: 25,
  },
  welcome: { fontSize: 28, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 14, color: "#64748B" },
  profileCircle: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
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
    padding: 15,
    alignItems: "center",
    elevation: 2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  statLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F172A",
    marginHorizontal: SPACING,
    padding: 20,
    borderRadius: 24,
    marginBottom: 30,
    elevation: 4,
  },
  createBtnContent: { flexDirection: "row", alignItems: "center" },
  addIconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  createBtnTitle: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  createBtnSub: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  section: { paddingHorizontal: SPACING },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  seeAll: { color: "#2563EB", fontWeight: "600" },
  dealCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  dealTop: { flexDirection: "row", marginBottom: 15 },
  imageBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  dealImage: { width: "100%", height: "100%" },
  dealMainInfo: { flex: 1, justifyContent: "center" },
  tag: {
    backgroundColor: "#EFF6FF",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  tagText: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dealTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  dealPrice: { fontSize: 14, fontWeight: "600", color: "#10B981" },
  origPrice: {
    fontSize: 12,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  progressSection: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: { fontSize: 12, color: "#64748B" },
  progressPercent: { fontSize: 12, color: "#0F172A", fontWeight: "700" },
  progressBarBg: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 3,
  },
  joinText: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  emptyText: { textAlign: "center", color: "#94A3B8", marginTop: 20 },
});
