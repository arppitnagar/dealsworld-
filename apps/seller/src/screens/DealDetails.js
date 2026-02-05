import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { db } from "../config/firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import {
  InfoCard,
  DetailHeader,
  StatsGrid,
  StatusPill,
  PriceBlock,
  MetricsGrid,
  getStatusColor,
  getStatusLabel,
  ImageHeader,
  DetailRow,
  CardHeader,
  toDate,
  formatExpiryLabel,
  formatCountdown,
  theme,
  SkeletonBlock,
} from "@dealsworld/shared";

const { width } = Dimensions.get("window");

export default function DealDetails({ route, navigation }) {
  const initialDeal = route?.params?.deal;
  const [deal, setDeal] = useState(normalizeDeal(initialDeal));
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const isDealLoading = !deal || !deal.title;

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
  const createdAtDate = toDate(safeGet(deal, "createdAt"));
  const thresholdReachedDate = toDate(safeGet(deal, "thresholdReachedAt"));
  const timeToThresholdSeconds =
    createdAtDate && thresholdReachedDate
      ? Math.round((thresholdReachedDate.getTime() - createdAtDate.getTime()) / 1000)
      : null;
  const target = safeGet(deal, "minGroupSize") || 1;
  const progress = Math.min(joinsCount / target, 1);
  const accentColor = getStatusColor(safeGet(deal, "status"));

  const expiryDate = toDate(safeGet(deal, "expiresAt"));
  const countdown =
    safeGet(deal, "status") === "active" && expiryDate
      ? formatCountdown(expiryDate.getTime() - now)
      : null;
  const expiryLabel = expiryDate ? formatExpiryLabel(expiryDate, now) : null;

  useEffect(() => {
    if (!initialDeal?.id) return;
    const dealRef = doc(db, "deals", initialDeal.id);
    const unsubscribe = onSnapshot(dealRef, (snap) => {
      if (!snap.exists()) return;
      setDeal(normalizeDeal({ id: snap.id, ...snap.data() }));
    });
    return () => unsubscribe();
  }, [initialDeal?.id]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

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

  if (isDealLoading) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.skeletonContent}>
          <SkeletonBlock height={240} style={styles.skeletonHero} shimmer />
          <View style={styles.skeletonHeaderRow}>
            <SkeletonBlock width={70} height={12} shimmer />
            <SkeletonBlock width={160} height={14} shimmer />
          </View>
          <SkeletonBlock width={180} height={14} shimmer />
          <SkeletonBlock width={220} height={18} style={styles.skeletonGap} shimmer />
          <SkeletonBlock width="100%" height={10} shimmer />
          <SkeletonBlock width="90%" height={10} style={styles.skeletonGap} shimmer />
          <SkeletonBlock width="75%" height={10} shimmer />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ImageHeader
          imageUri={deal.image}
          height={280}
          onBack={() => navigation.goBack()}
        />

        <View style={styles.content}>
          <DetailHeader
            category={deal.category || "General"}
            title={deal.title}
            onChat={() => navigation.navigate("DealChat", { deal })}
            onEdit={() => navigation.navigate("CreateDeal", { deal })}
            editLabel={safeGet(deal, "status") === "completed" ? "View" : "Edit"}
            editIcon={
              safeGet(deal, "status") === "completed"
                ? "eye-outline"
                : "create-outline"
            }
          />
          <View style={styles.statusRow}>
            <StatusPill
              label={getStatusLabel(safeGet(deal, "status"))}
              color={accentColor}
            />
          </View>

          <StatsGrid
            items={[
              {
                key: "joins",
                title: "Current Joins",
                value: <Text style={styles.statValue}>{joinsCount}</Text>,
              },
              {
                key: "target",
                title: "Target",
                value: <Text style={styles.statValue}>{target}</Text>,
              },
            ]}
          />

          <View style={styles.insightsSection}>
            <CardHeader title="Insights" />
            <MetricsGrid
              items={[
                {
                  key: "views",
                  label: "Views",
                  value: viewsCount !== null ? formatNumber(viewsCount) : "—",
                },
                {
                  key: "conversion",
                  label: "Conversion",
                  value:
                    conversionRate !== null
                      ? `${conversionRate.toFixed(1)}%`
                      : "—",
                },
                {
                  key: "avgJoin",
                  label: "Avg Join Time",
                  value:
                    avgJoinTimeSeconds !== null
                      ? formatDuration(avgJoinTimeSeconds)
                      : "—",
                },
                {
                  key: "threshold",
                  label: "Time to Threshold",
                  value:
                    timeToThresholdSeconds !== null
                      ? formatDuration(timeToThresholdSeconds)
                      : "—",
                },
                {
                  key: "dropoff",
                  label: "Drop-off Rate",
                  value:
                    dropOffRate !== null
                      ? `${dropOffRate.toFixed(1)}%`
                      : "—",
                },
              ]}
            />
          </View>

          <View style={styles.priceSection}>
            <InfoCard>
              <PriceBlock
                price={
                  safeGet(deal, "discountPrice") ?? safeGet(deal, "dealPrice")
                }
                original={safeGet(deal, "originalPrice")}
                meta={`${joinsCount} joined · Target ${target}`}
              />
            </InfoCard>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Campaign Progress</Text>
              <Text style={[styles.progressPercent, { color: accentColor }]}>
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
            {countdown && (
              <DetailRow
                icon="time-outline"
                label="Ends"
                value={countdown}
                color={accentColor}
              />
            )}
            {expiryLabel && (
              <DetailRow
                icon="calendar-outline"
                label="Expiry"
                value={expiryLabel}
                color={accentColor}
              />
            )}
          </View>

          <View style={styles.descriptionSection}>
            <CardHeader title="Description" />
            <Text style={styles.descriptionText}>
              {deal.description || "No description provided for this deal."}
            </Text>
          </View>
        </View>
      </ScrollView>

      {safeGet(deal, "status") === "active" && (
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    backgroundColor: theme.colors.background,
  },
  statusRow: { marginTop: 8, marginBottom: 20 },
  insightsSection: {
    marginBottom: 24,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: theme.colors.text },
  progressSection: { marginBottom: 30 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressTitle: { fontWeight: "700", color: theme.colors.text },
  progressPercent: { fontWeight: "800", color: theme.colors.text },
  progressBarBg: {
    height: 12,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: theme.colors.primary },
  descriptionSection: { marginBottom: 100 },
  descriptionText: { lineHeight: 22, color: theme.colors.textMuted, fontSize: 15 },
  footer: {
    position: "absolute",
    bottom: 0,
    width: width,
    padding: 20,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceLight,
  },
  endBtn: {
    backgroundColor: theme.colors.dangerSoftAlt,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  endBtnText: { color: theme.colors.error, fontWeight: "800" },
  priceSection: { marginBottom: 20 },
  skeletonContent: {
    padding: 20,
    gap: 12,
  },
  skeletonHero: {
    borderRadius: 18,
    marginBottom: 12,
  },
  skeletonHeaderRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  skeletonGap: {
    marginTop: 8,
  },
});

function safeGet(obj, key) {
  if (!obj) return undefined;
  return obj[key];
}

function normalizeDeal(deal) {
  if (!deal) return {};
  const normalized = { ...deal };
  if (normalized.createdAt?.toDate) {
    normalized.createdAt = normalized.createdAt.toDate();
  }
  if (normalized.updatedAt?.toDate) {
    normalized.updatedAt = normalized.updatedAt.toDate();
  }
  if (normalized.expiresAt?.toDate) {
    normalized.expiresAt = normalized.expiresAt.toDate();
  }
  if (normalized.thresholdReachedAt?.toDate) {
    normalized.thresholdReachedAt = normalized.thresholdReachedAt.toDate();
  }
  return normalized;
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}
