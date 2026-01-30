import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
// Import the db instance you created in src/config/firebase.js
import { db } from "../config/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const { width } = Dimensions.get("window");
const SPACING = 20;
const GAP = 10;
const CARD_WIDTH = (width - SPACING * 2 - GAP * 2) / 3;

export default function SellerDashboard({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState({ active: 0, scheduled: 0, previous: 0 });

  // Use a placeholder or your actual Auth UID
  const vendorId = "vendor_123";

  useEffect(() => {
    // Reference to your 'deals' collection
    const dealsRef = collection(db, "deals");

    // Query deals belonging to this vendor
    const q = query(dealsRef, where("vendorId", "==", vendorId));

    // Listen for real-time changes
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

          // Logic to increment counters based on status
          if (data.status === "active") activeCount++;
          else if (data.status === "scheduled") scheduledCount++;
          else if (data.status === "completed") previousCount++;
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
        console.error("Firestore error: ", error);
        setLoading(false);
      },
    );

    // Stop listening when the component is destroyed
    return () => unsubscribe();
  }, [vendorId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5EA3DB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.welcome}>Welcome 👋</Text>
          <Text style={styles.subtitle}>Your real-time deal performance</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Active Deal"
            count={stats.active}
            color="#5EA3DB"
            icon="flash-outline"
          />
          <StatCard
            title="Scheduled"
            count={stats.scheduled}
            color="#68B298"
            icon="calendar-outline"
          />
          <StatCard
            title="Previous"
            count={stats.previous}
            color="#F1AC4D"
            icon="time-outline"
          />
        </View>

        <TouchableOpacity
          style={styles.createDealBtn}
          onPress={() => navigation.navigate("CreateDeal")}
        >
          <View style={styles.plusIconBg}>
            <Ionicons name="add" size={24} color="#0F172A" />
          </View>
          <Text style={styles.createDealText}>Create New Deal</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Deals</Text>
          {deals
            .filter((d) => d.status === "active")
            .map((deal) => (
              <DealRow
                key={deal.id}
                title={deal.title}
                progress={`${deal.currentJoins || 0}/${deal.minThreshold || 0} joined`}
              />
            ))}
          {deals.filter((d) => d.status === "active").length === 0 && (
            <Text style={styles.emptyText}>No active deals yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ title, count, color, icon }) {
  // Ensures 0 becomes "00" and 5 becomes "05"
  const displayCount = count < 10 ? `0${count}` : count;

  return (
    <View style={[styles.statCard, { width: CARD_WIDTH }]}>
      <View style={[styles.cardHeader, { backgroundColor: color }]}>
        <Text style={styles.cardHeaderText}>{title}</Text>
      </View>
      <View style={styles.cardBody}>
        <Ionicons
          name={icon}
          size={16}
          color={color}
          style={{ marginBottom: 4 }}
        />
        <Text style={[styles.statValue, { color: color }]}>{displayCount}</Text>
        <View style={styles.frosting} />
      </View>
    </View>
  );
}

function DealRow({ title, progress }) {
  return (
    <View style={styles.dealRow}>
      <View style={styles.dealInfo}>
        <View style={styles.dealIconBox}>
          <Ionicons name="cube-outline" size={20} color="#64748B" />
        </View>
        <View>
          <Text style={styles.dealTitle}>{title}</Text>
          <Text style={styles.dealProgress}>{progress}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 20, marginBottom: 24 },
  welcome: { fontSize: 26, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 4 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  statCard: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 3,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardHeader: { height: 36, alignItems: "center", justifyContent: "center" },
  cardHeaderText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  cardBody: { height: 90, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 26, fontWeight: "900" },
  frosting: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "30%",
    backgroundColor: "rgba(248, 250, 252, 0.4)",
  },
  createDealBtn: {
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#E2E8F0",
    marginHorizontal: 20,
    marginTop: 32,
    paddingVertical: 24,
    borderRadius: 24,
    alignItems: "center",
  },
  plusIconBg: {
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 14,
    marginBottom: 8,
    elevation: 2,
  },
  createDealText: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 13,
    textTransform: "uppercase",
  },
  section: { marginTop: 32, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 16,
  },
  dealRow: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  dealInfo: { flexDirection: "row", alignItems: "center" },
  dealIconBox: {
    width: 44,
    height: 44,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  dealTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  dealProgress: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  emptyText: { textAlign: "center", color: "#94A3B8", marginTop: 20 },
});
