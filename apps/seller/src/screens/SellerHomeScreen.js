import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useTheme,
  EmptyState,
  CardHeader,
  DealBuddyLoadingScreen,
  DealCard,
  ViewModeToggle,
  getStatusColor,
  getStatusLabel,
  getDealThumbnails,
  toDate,
} from "@dealsworld/shared";
import { useSellerLiveDeals } from "../hooks/useSellerLiveDeals";
import { useNotifications } from "../hooks/useNotifications";
import { useUserProfile } from "../hooks/useUserProfile";
import SellerDashboardHeader from "../components/SellerDashboardHeader";
import {
  getDealDisplayStatus,
  formatEndsIn,
} from "../utils/dealStatus";

// Dashboard tab: a short, fixed "Live Deals" feed (active + pending only) -
// the full Active/Pending/Rejected/Expired browsing lives on the Deals tab,
// same split as the buyer app's Home vs Deals tabs.
export default function SellerHomeScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { deals, loading, sellerDisplayName } = useSellerLiveDeals();
  const { unreadCount } = useNotifications();
  const { profile, updateProfile } = useUserProfile();
  const [now, setNow] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);

  const viewMode = profile?.dashboardViewMode === "grid" ? "grid" : "list";
  const handleChangeViewMode = (mode) => {
    if (mode === viewMode) return;
    updateProfile({ dashboardViewMode: mode });
  };

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Deals already stream in live via Firestore's onSnapshot - pull-to-refresh
  // just gives the gesture a visible response.
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const liveDeals = useMemo(() => {
    if (!deals) return [];
    return deals.filter((deal) => {
      const status = getDealDisplayStatus(deal, now);
      return status === "active" || status === "pending";
    });
  }, [deals, now]);

  const hasDeals = liveDeals.length > 0;

  if (loading) {
    return <DealBuddyLoadingScreen label="Loading deals..." />;
  }

  const renderDeal = ({ item: deal }) => {
    const displayStatus = getDealDisplayStatus(deal, now);
    const expiryDate = toDate(deal.expiresAt);
    const endsInLabel =
      expiryDate instanceof Date && !Number.isNaN(expiryDate.getTime())
        ? formatEndsIn(expiryDate.getTime(), now)
        : null;

    return (
      <View style={viewMode === "grid" ? styles.gridItem : null}>
        <DealCard
          compact={viewMode === "grid"}
          title={deal.title}
          category={deal.category || null}
          images={getDealThumbnails(deal)}
          joins={deal.currentJoins ?? deal.joinedUsers ?? 0}
          targetCount={deal.minGroupSize ?? deal.minThreshold ?? 0}
          maxCount={deal.maxGroupSize ?? null}
          accentColor={getStatusColor(displayStatus, theme)}
          badgeLabel={getStatusLabel(displayStatus)}
          statusLabel={getStatusLabel(displayStatus)}
          viewsCount={deal.viewsCount ?? deal.views ?? 0}
          favoritesCount={deal.favoritesCount ?? deal.favouritesCount ?? 0}
          ratingAvg={deal.ratingAvg ?? deal.rating ?? null}
          ratingCount={deal.ratingCount ?? 0}
          originalPrice={deal.originalPrice}
          discountPrice={deal.discountPrice}
          expiryLabel={endsInLabel}
          actionLabel="View Deal"
          onActionPress={() => navigation.navigate("DealDetails", { deal })}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <SellerDashboardHeader
        navigation={navigation}
        now={now}
        displayName={sellerDisplayName}
        unreadCount={unreadCount}
      />

      <FlatList
        key={viewMode}
        data={liveDeals}
        keyExtractor={(deal) => deal.id}
        numColumns={viewMode === "grid" ? 2 : 1}
        columnWrapperStyle={viewMode === "grid" ? styles.gridRow : undefined}
        renderItem={renderDeal}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, !hasDeals && styles.listWrapEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <CardHeader
            title={`Live Deals (${liveDeals?.length || 0})`}
            right={
              <View style={styles.headerRight}>
                <ViewModeToggle mode={viewMode} onChange={handleChangeViewMode} />
                <TouchableOpacity onPress={() => navigation.navigate("Deals")}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
            }
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="pricetag-outline"
              title="No live deals right now."
              subtitle="Create a deal to get it in front of buyers."
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.surfaceMuted,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 32,
    },
    listWrapEmpty: {
      flex: 1,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    gridRow: {
      justifyContent: "space-between",
    },
    gridItem: {
      width: "48%",
      marginBottom: 16,
    },
    seeAllText: {
      color: theme.colors.primary,
      fontWeight: "700",
      fontSize: 12,
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 24,
    },
  });
