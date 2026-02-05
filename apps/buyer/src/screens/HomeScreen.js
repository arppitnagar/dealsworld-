import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Search, Flame, MapPin, ChevronRight } from "lucide-react-native";
import { useDeals } from "../hooks/useDeals";
import {
  CountdownTimer,
  theme,
  ui,
  EmptyState,
  StatusPill,
  getStatusColor,
  getStatusLabel,
  cardStyles,
  CardHeader,
  SkeletonList,
  SkeletonStatsRow,
} from "@dealsworld/shared";

const CATEGORIES = ["All", "Food", "Fashion", "Electronics", "Home", "Fitness"];

const DealCard = ({ deal, navigation }) => {
  const progress = Math.min((deal.joinedUsers / deal.minGroupSize) * 100, 100);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("DealDetails", { dealId: deal.id })}
      style={styles.card}
    >
      <View>
        <Image
          source={{
            uri: deal.imageUrl || "https://via.placeholder.com/400x200",
          }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.timerWrap}>
          <CountdownTimer expiryTime={deal.expiryTime} />
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryPillText}>{deal.category}</Text>
            <StatusPill
              label={getStatusLabel(deal.status)}
              color={getStatusColor(deal.status)}
            />
          </View>
          <View style={styles.joinedRow}>
            <Flame size={14} color={theme.colors.warningBright} />
            <Text style={styles.joinedText}>{deal.joinedUsers} joined</Text>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={1}>
          {deal.title}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>â‚¹{deal.discountPrice}</Text>
          <Text style={styles.priceOriginal}>â‚¹{deal.originalPrice}</Text>
          <View style={styles.discountPill}>
            <Text style={styles.discountText}>
              {Math.round(
                ((deal.originalPrice - deal.discountPrice) /
                  deal.originalPrice) *
                  100,
              )}
              % OFF
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.cardFooterRow}>
          <Text style={styles.neededText}>
            {deal.minGroupSize - deal.joinedUsers > 0
              ? `${deal.minGroupSize - deal.joinedUsers} more users needed`
              : "Deal Unlocked!"}
          </Text>

          <View style={styles.viewDealRow}>
            <Text style={styles.viewDealText}>View Deal</Text>
            <ChevronRight size={16} color={theme.colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen({ navigation }) {
  const { data: deals, isLoading, refetch } = useDeals();

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <SkeletonStatsRow />
        <SkeletonList count={3} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <TouchableOpacity
              activeOpacity={0.7}
              onLongPress={() => navigation.navigate("StyleGuide")}
            >
              <Text style={styles.locationLabel}>Your Location</Text>
            </TouchableOpacity>
            <View style={styles.locationRow}>
              <MapPin
                size={16}
                color={theme.colors.primary}
                fill={theme.colors.primary}
                fillOpacity={0.2}
              />
              <Text style={styles.locationText}>Mumbai, MH</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {__DEV__ && (
              <TouchableOpacity
                style={styles.debugChip}
                onPress={() => navigation.navigate("StyleGuide")}
              >
                <Text style={styles.debugChipText}>Style</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.searchBtn}>
              <Search size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        <View style={styles.bannerWrap}>
          <TouchableOpacity style={styles.banner}>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Refer & Earn â‚¹100</Text>
              <Text style={styles.bannerSubtitle}>
                Get rewards when your friends join a deal
              </Text>
            </View>
            <View style={styles.bannerIcon}>
              <ChevronRight size={24} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.categoryWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20 }}
          >
            {CATEGORIES.map((cat, index) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  index === 0 ? styles.categoryPillActive : styles.categoryPillIdle,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    index === 0
                      ? styles.categoryTextActive
                      : styles.categoryTextIdle,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.listWrap}>
          <CardHeader
            title="Featured Deals"
            right={
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            }
          />

          {deals?.length > 0 ? (
            deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} navigation={navigation} />
            ))
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="search-outline"
                title="No active deals nearby"
                subtitle="Try adjusting your location or search."
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.surfaceMuted,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    padding: 20,
    width: "100%",
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  locationText: {
    fontWeight: "700",
    color: theme.colors.text,
    marginLeft: 6,
  },
  searchBtn: {
    backgroundColor: theme.colors.surfaceMuted,
    padding: 10,
    borderRadius: 999,
  },
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
  bannerWrap: {
    padding: 20,
  },
  banner: {
    ...ui.banner,
    flexDirection: "row",
    alignItems: "center",
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    ...theme.typography.bannerTitle,
  },
  bannerSubtitle: {
    ...theme.typography.bannerSubtitle,
    marginTop: 4,
  },
  bannerIcon: {
    backgroundColor: theme.colors.onPrimarySoft,
    padding: 12,
    borderRadius: 18,
  },
  categoryWrap: {
    marginBottom: 16,
  },
  categoryPill: {
    marginRight: 8,
    ...ui.pill,
  },
  categoryPillActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  categoryPillIdle: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
  },
  categoryText: {
    fontWeight: "700",
    fontSize: 12,
  },
  categoryTextActive: {
    color: theme.colors.onPrimary,
  },
  categoryTextIdle: {
    color: theme.colors.textMuted,
  },
  listWrap: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  seeAllText: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  emptyWrap: {
    paddingVertical: 80,
    alignItems: "center",
  },
  card: {
    marginBottom: 20,
    overflow: "hidden",
    ...cardStyles.base,
    ...cardStyles.shadow,
  },
  cardImage: {
    width: "100%",
    height: 192,
  },
  timerWrap: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  cardContent: {
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    backgroundColor: theme.colors.infoSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  joinedRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  joinedText: {
    color: theme.colors.warningBright,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  priceText: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
  },
  priceOriginal: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textDecorationLine: "line-through",
    marginLeft: 8,
  },
  discountPill: {
    marginLeft: "auto",
    backgroundColor: theme.colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: theme.colors.successDark,
    fontSize: 10,
    fontWeight: "700",
  },
  progressTrack: {
    backgroundColor: theme.colors.border,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  neededText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  viewDealRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewDealText: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 12,
    marginRight: 4,
  },
});
