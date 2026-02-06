import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getCardStyles } from "../styles/cards";
import { useTheme } from "../theme/ThemeProvider";
import PrimaryBanner from "./PrimaryBanner";
import SectionHeader from "./SectionHeader";
import StatusPill from "./StatusPill";
import MetricRow from "./MetricRow";
import StatsCard from "./StatsCard";
import InfoCard from "./InfoCard";
import FormSection from "./FormSection";
import AppInput from "./ui/AppInput";
import AppButton from "./ui/AppButton";
import MetricsGrid from "./MetricsGrid";
import PriceBlock from "./PriceBlock";
import SkeletonBlock from "./SkeletonBlock";
import SkeletonList from "./SkeletonList";
import SkeletonStatsRow from "./SkeletonStatsRow";
import ChatSkeleton from "./ChatSkeleton";

export default function ComponentGallery() {
  const { theme } = useTheme();
  const cardStyles = useMemo(() => getCardStyles(theme), [theme]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          backgroundColor: theme.colors.surfaceMuted,
        },
        content: {
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
          paddingBottom: theme.spacing.xl,
        },
        row: {
          flexDirection: "row",
          gap: theme.spacing.sm,
          flexWrap: "wrap",
        },
        buttonRow: {
          flexDirection: "row",
          gap: theme.spacing.sm,
        },
        noteCard: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          ...cardStyles.base,
          ...cardStyles.padded,
        },
        noteText: {
          color: theme.colors.textMuted,
          fontSize: 12,
        },
        speedChip: {
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 999,
          backgroundColor: theme.colors.surfaceMuted,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        speedChipActive: {
          backgroundColor: theme.colors.text,
          borderColor: theme.colors.text,
        },
        speedChipText: {
          fontSize: 11,
          fontWeight: "700",
          color: theme.colors.textMuted,
        },
        speedChipTextActive: {
          color: theme.colors.onPrimary,
        },
      }),
    [cardStyles, theme],
  );
  const [shimmerDuration, setShimmerDuration] = useState(
    theme.skeleton.shimmerDuration,
  );
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Primary Banner" />
      <PrimaryBanner
        title="Create New Deal"
        subtitle="Boost your sales today"
        onPress={() => {}}
      />

      <SectionHeader title="Status Pills" />
      <View style={styles.row}>
        <StatusPill label="Active" color={theme.colors.statusActive} />
        <StatusPill label="Scheduled" color={theme.colors.statusScheduled} />
        <StatusPill label="Expired" color={theme.colors.statusExpired} />
      </View>

      <SectionHeader title="Metric Row" />
      <MetricRow
        icon="calendar-outline"
        value="Expires on 04 Feb 2026"
        color={theme.colors.textMuted}
      />

      <SectionHeader title="Stats Cards" />
      <View style={styles.row}>
        <StatsCard
          title="Active"
          count={12}
          color={theme.colors.statusActive}
          bgColor={theme.colors.dangerSoft}
          icon="flame"
        />
        <StatsCard
          title="Pending"
          count={4}
          color={theme.colors.statusScheduled}
          bgColor={theme.colors.purpleSoft}
          icon="calendar"
        />
        <StatsCard
          title="Completed"
          count={9}
          color={theme.colors.success}
          bgColor={theme.colors.successSoftAlt}
          icon="checkmark-circle"
        />
      </View>

      <SectionHeader title="Info Card + Price Block" />
      <InfoCard>
        <PriceBlock
          price={199}
          original={299}
          meta="42 joined · Target 100"
        />
      </InfoCard>

      <SectionHeader title="Metrics Grid" />
      <MetricsGrid
        items={[
          { key: "views", label: "Views", value: "1,284" },
          { key: "joins", label: "Joined", value: "342" },
          { key: "conversion", label: "Conversion", value: "26.6%" },
          { key: "dropoff", label: "Drop-off", value: "3.2%" },
        ]}
      />

      <SectionHeader title="Form Section" />
      <FormSection title="Deal Details">
        <AppInput placeholder="Deal title" />
        <AppInput placeholder="Location" />
      </FormSection>

      <SectionHeader title="Skeleton Speed" />
      <View style={styles.row}>
        {[600, 1200, 1800].map((value) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.speedChip,
              shimmerDuration === value && styles.speedChipActive,
            ]}
            onPress={() => setShimmerDuration(value)}
          >
            <Text
              style={[
                styles.speedChipText,
                shimmerDuration === value && styles.speedChipTextActive,
              ]}
            >
              {value}ms
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <SkeletonBlock height={16} shimmer shimmerDuration={shimmerDuration} />
      <SkeletonStatsRow shimmerDuration={shimmerDuration} />
      <SkeletonList shimmerDuration={shimmerDuration} />
      <ChatSkeleton shimmerDuration={shimmerDuration} />

      <View style={styles.buttonRow}>
        <AppButton title="Primary Action" onPress={() => {}} />
        <AppButton
          title="Secondary"
          variant="secondary"
          onPress={() => {}}
        />
      </View>

      <View style={styles.noteCard}>
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={theme.colors.textMuted}
        />
        <Text style={styles.noteText}>
          Use this screen to preview shared UI components and tokens.
        </Text>
      </View>
    </ScrollView>
  );
}
