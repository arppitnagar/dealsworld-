import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../config/firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";

const { width } = Dimensions.get("window");

export default function DealDetails({ route, navigation }) {
  const initialDeal = route?.params?.deal;
  const [deal, setDeal] = useState(normalizeDeal(initialDeal)); // Use state to hold the live deal
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Use the local 'deal' state for all calculations
  const joinsCount =
    safeGet(deal, "joinedUsers") ??
    safeGet(deal, "currentJoins") ??
    safeGet(deal, "joinedCount") ??
    0;
  const viewsCount = safeGet(deal, "viewsCount") ?? safeGet(deal, "views") ?? null;
  const leftCount = safeGet(deal, "leftUsers") ?? safeGet(deal, "leftCount") ?? null;
  const avgJoinTimeMs = safeGet(deal, "avgJoinTimeMs");
  const avgJoinTimeSeconds =
    safeGet(deal, "avgJoinTimeSeconds") ??
    safeGet(deal, "avgJoinTime") ??
    (avgJoinTimeMs ? Math.round(avgJoinTimeMs / 1000) : null);
  const conversionRate =
    viewsCount && viewsCount > 0 ? (joinsCount / viewsCount) * 100 : null;
  const dropOffRate =
    leftCount !== null && joinsCount > 0 ? (leftCount / joinsCount) * 100 : null;
  const createdAtDate = getExpiryDate(safeGet(deal, "createdAt"));
  const thresholdReachedDate = getExpiryDate(
    safeGet(deal, "thresholdReachedAt"),
  );
  const timeToThresholdSeconds =
    createdAtDate && thresholdReachedDate
      ? Math.round((thresholdReachedDate.getTime() - createdAtDate.getTime()) / 1000)
      : null;
  const target = safeGet(deal, "minGroupSize") || 1; // Updated to match your CreateDeal field name
  const progress = Math.min(joinsCount / target, 1);
  const isActive = safeGet(deal, "status") === "active";
  const isCompleted = safeGet(deal, "status") === "completed";
  const accentColor = isActive
    ? "#FF4D4D"
    : isCompleted
      ? "#10B981"
      : "#7C3AED";

  const expiryDate = getExpiryDate(safeGet(deal, "expiresAt"));
  const countdown =
    isActive && expiryDate ? formatCountdown(expiryDate.getTime() - now) : null;
  const expiryLabel = expiryDate
    ? expiryDate.getTime() <= now
      ? `Expired on ${formatDate(expiryDate)}`
      : `Expires on ${formatDate(expiryDate)}`
    : null;

  const handleEndCampaign = () => {
    Alert.alert(
      "End Deal",
      "Are you sure you want to end this deal early? It will be moved to 'Previous' deals.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Now",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const dealRef = doc(db, "deals", deal.id);
              await updateDoc(dealRef, { status: "completed" });
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Could not update deal status.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    if (!initialDeal || !initialDeal.id) return;
    // Use route.params.deal.id directly to ensure the listener starts correctly
    const dealRef = doc(db, "deals", initialDeal.id);

    const unsubscribe = onSnapshot(
      dealRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setDeal({ id: docSnap.id, ...docSnap.data() });
        }
      },
      (error) => {
        console.error("Snapshot error: ", error);
      },
    );

    return () => unsubscribe();
  }, [initialDeal?.id]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {deal.image ? (
            <Image source={{ uri: deal.image }} style={styles.headerImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={60} color="#CBD5E1" />
            </View>
          )}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.category}>{deal.category || "General"}</Text>
              <Text style={styles.title}>{deal.title}</Text>
            </View>

            <View style={styles.titleActions}>
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => navigation.navigate("DealChat", { deal })}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color="#0F172A"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate("CreateDeal", { deal })} // Passing the deal object here
              >
                <Ionicons
                  name={isCompleted ? "eye-outline" : "create-outline"}
                  size={20}
                  color="#7C3AED"
                />
                <Text style={styles.editBtnText}>
                  {isCompleted ? "View" : "Edit"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Current Joins</Text>
              <Text style={styles.statValue}>{joinsCount}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Target</Text>
              <Text style={styles.statValue}>{target}</Text>
            </View>
          </View>

          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>Insights</Text>
            <View style={styles.insightsGrid}>
              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Views</Text>
                <Text style={styles.insightValue}>
                  {viewsCount !== null ? formatNumber(viewsCount) : "—"}
                </Text>
              </View>
              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Conversion</Text>
                <Text style={styles.insightValue}>
                  {conversionRate !== null
                    ? `${conversionRate.toFixed(1)}%`
                    : "—"}
                </Text>
              </View>
              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Avg Join Time</Text>
                <Text style={styles.insightValue}>
                  {avgJoinTimeSeconds !== null
                    ? formatDuration(avgJoinTimeSeconds)
                    : "—"}
                </Text>
              </View>
              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Time to Threshold</Text>
                <Text style={styles.insightValue}>
                  {timeToThresholdSeconds !== null
                    ? formatDuration(timeToThresholdSeconds)
                    : "—"}
                </Text>
              </View>
              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Drop-off Rate</Text>
                <Text style={styles.insightValue}>
                  {dropOffRate !== null
                    ? `${dropOffRate.toFixed(1)}%`
                    : "—"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Campaign Progress</Text>
              <Text style={styles.progressPercent}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progress * 100}%` },
                ]}
              />
            </View>
            {countdown && (
              <View style={styles.countdownRow}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={accentColor}
                />
                <Text style={[styles.countdownText, { color: accentColor }]}>
                  {countdown}
                </Text>
              </View>
            )}
            {expiryLabel && (
              <View style={styles.expiryRow}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={accentColor}
                />
                <Text style={[styles.countdownText, { color: accentColor }]}>
                  {expiryLabel}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              {deal.description || "No description provided for this deal."}
            </Text>
          </View>
        </View>
      </ScrollView>

      {isActive && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.endBtn}
            onPress={handleEndCampaign}
            disabled={loading}
          >
            <Text style={styles.endBtnText}>
              {loading ? "Processing..." : "End Campaign Early"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  imageContainer: { width: width, height: 280, backgroundColor: "#F1F5F9" },
  headerImage: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 12,
    elevation: 5,
  },
  content: {
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    backgroundColor: "#FFF",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  titleActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 12,
  },
  chatBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  category: {
    color: "#7C3AED",
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editBtnText: { color: "#7C3AED", fontWeight: "700", marginLeft: 6 },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  insightsSection: {
    marginBottom: 24,
  },
  insightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  insightCard: {
    width: (width - 60) / 2,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  insightLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  insightValue: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },
  statBox: {
    width: (width - 60) / 2,
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  progressSection: { marginBottom: 30 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressTitle: { fontWeight: "700", color: "#0F172A" },
  progressPercent: { fontWeight: "800", color: "#FF4D4D" },
  progressBarBg: {
    height: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: "#FF4D4D" },
  descriptionSection: { marginBottom: 100 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  descriptionText: { lineHeight: 22, color: "#475569", fontSize: 15 },
  footer: {
    position: "absolute",
    bottom: 0,
    width: width,
    padding: 20,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  endBtn: {
    backgroundColor: "#FFF1F2",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  endBtnText: { color: "#E11D48", fontWeight: "800", fontSize: 16 },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: "700",
  },
});

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

function formatDate(date) {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return "—";
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString("en-IN");
}

function normalizeDeal(input) {
  if (!input) return {};
  if (typeof input?.data === "function") {
    const data = input.data();
    return { id: input.id, ...data };
  }
  return input;
}

function safeGet(obj, key) {
  try {
    return obj ? obj[key] : undefined;
  } catch (error) {
    return undefined;
  }
}
