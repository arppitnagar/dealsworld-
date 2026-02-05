import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { MessageCircle } from "lucide-react-native";
import {
  CountdownTimer,
  AppButton,
  InfoCard,
  DetailHeader,
  PriceBlock,
  MetricsGrid,
  SectionHeader,
  StatusPill,
  getStatusColor,
  getStatusLabel,
  MetricRow,
  DetailRow,
  toDate,
  formatExpiryLabel,
  ImageHeader,
  theme,
  SkeletonBlock,
} from "@dealsworld/shared";
import { useDeals, useRecordDealView, useLeaveDeal } from "../hooks/useDeals";
import { hasViewedDeal, markViewedDeal } from "../utils/viewCache";

export default function DealDetailsScreen({ route, navigation }) {
  const { dealId } = route.params || {};
  const { data: deals, isLoading } = useDeals();
  const { mutate: recordView } = useRecordDealView();
  const { mutate: leaveDeal, isLoading: leaving } = useLeaveDeal();
  const hasRecorded = useRef(false);
  const [hasLeft, setHasLeft] = useState(false);

  const deal = useMemo(
    () => deals?.find((d) => d.id === dealId),
    [deals, dealId],
  );
  const expiryDate = toDate(deal?.expiryTime);
  const expiryLabel = expiryDate ? formatExpiryLabel(expiryDate) : null;

  useEffect(() => {
    if (!dealId || hasRecorded.current) return;
    if (!hasViewedDeal(dealId)) {
      recordView(dealId, {
        onSuccess: () => markViewedDeal(dealId),
      });
    }
    hasRecorded.current = true;
  }, [dealId, recordView]);

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <SkeletonBlock height={220} style={styles.skeletonHero} shimmer />
        <View style={styles.skeletonHeaderRow}>
          <SkeletonBlock width={70} height={12} shimmer />
          <SkeletonBlock width={160} height={14} shimmer />
        </View>
        <SkeletonBlock width={180} height={14} shimmer />
        <SkeletonBlock width={220} height={18} style={styles.skeletonGap} shimmer />
        <SkeletonBlock width="100%" height={10} shimmer />
        <SkeletonBlock width="90%" height={10} style={styles.skeletonGap} shimmer />
        <SkeletonBlock width="75%" height={10} shimmer />
      </View>
    );
  }

  if (!deal) {
    return (
      <View style={styles.notFoundScreen}>
        <Text style={styles.notFoundText}>Deal not found.</Text>
        <AppButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{
            backgroundColor: theme.colors.text,
            borderColor: theme.colors.text,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: theme.radii.md,
          }}
          textStyle={{ color: theme.colors.onPrimary }}
        />
      </View>
    );
  }

  const handleLeaveDeal = () => {
    if (!dealId || leaving || hasLeft) return;
    Alert.alert(
      "Leave Deal",
      "Are you sure you want to leave this deal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            leaveDeal(dealId, {
              onSuccess: () => setHasLeft(true),
            });
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <ImageHeader
          imageUri={deal.imageUrl || "https://via.placeholder.com/600x300"}
          height={256}
          onBack={() => navigation.goBack()}
          right={
            <>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("DealChat", { dealId: deal.id, deal })
                }
                style={styles.chatButton}
              >
                <MessageCircle size={18} color={theme.colors.text} />
              </TouchableOpacity>
              <CountdownTimer expiryTime={deal.expiryTime} />
            </>
          }
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <DetailHeader category={deal.category} title={deal.title} />
        <View style={styles.statusRow}>
          <StatusPill
            label={getStatusLabel(deal.status)}
            color={getStatusColor(deal.status)}
          />
        </View>
        <DetailRow
          icon="location-outline"
          label="Location"
          value={deal.location || "Location"}
          color={theme.colors.textMuted}
          style={styles.locationRow}
        />
        {expiryLabel ? (
          <DetailRow
            icon="calendar-outline"
            label="Expiry"
            value={expiryLabel}
            color={theme.colors.textMuted}
            style={styles.expiryRow}
          />
        ) : null}
        <Text style={styles.description}>{deal.description}</Text>

        <InfoCard style={{ marginTop: 20 }}>
          <PriceBlock
            price={deal.discountPrice}
            original={deal.originalPrice}
            meta={`${deal.joinedUsers || 0} joined · Target ${deal.minGroupSize || 1}`}
          />
        </InfoCard>

        <View style={styles.metricsSection}>
          <SectionHeader title="Stats" />
          <MetricsGrid
            items={[
              {
                key: "joined",
                label: "Joined",
                value: String(deal.joinedUsers || 0),
              },
              {
                key: "target",
                label: "Target",
                value: String(deal.minGroupSize || 1),
              },
            ]}
          />
        </View>

        <InfoCard title="Participation" style={{ marginTop: 24 }}>
          <AppButton
            title={
              hasLeft ? "You left this deal" : leaving ? "Leaving..." : "Leave Deal"
            }
            onPress={handleLeaveDeal}
            loading={leaving}
            disabled={leaving || hasLeft}
            style={{
              backgroundColor: leaving || hasLeft
                ? theme.colors.surfaceMuted
                : theme.colors.dangerSoftLight,
              borderColor: leaving || hasLeft
                ? theme.colors.border
                : theme.colors.dangerBorder,
              borderRadius: theme.radii.md,
            }}
            textStyle={{
              color: leaving || hasLeft ? theme.colors.textMuted : theme.colors.dangerDark,
            }}
          />
        </InfoCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.surfaceMuted,
  },
  header: {
    backgroundColor: theme.colors.background,
  },
  chatButton: {
    backgroundColor: theme.colors.surfaceGlass,
    padding: 8,
    borderRadius: 999,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  locationRow: {
    marginTop: 8,
  },
  expiryRow: {
    marginTop: 6,
  },
  statusRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 12,
    lineHeight: 20,
  },
  metricsSection: {
    marginTop: 20,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
    gap: 12,
  },
  skeletonHero: {
    borderRadius: 18,
    width: "100%",
  },
  skeletonHeaderRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  skeletonGap: {
    marginTop: 8,
  },
  notFoundScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
  },
  notFoundText: {
    color: theme.colors.textMuted,
    fontWeight: "600",
    marginBottom: 16,
  },
});
