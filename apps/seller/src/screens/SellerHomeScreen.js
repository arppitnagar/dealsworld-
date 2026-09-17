import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
  getStatusColor,
  getStatusLabel,
  getDealImages,
  toDate,
} from "@dealsworld/shared";
import { useSellerLiveDeals } from "../hooks/useSellerLiveDeals";
import { useNotifications } from "../hooks/useNotifications";
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
  const [now, setNow] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SellerDashboardHeader
          navigation={navigation}
          now={now}
          displayName={sellerDisplayName}
          unreadCount={unreadCount}
        />

        <View style={[styles.listWrap, !hasDeals && styles.listWrapEmpty]}>
          <CardHeader
            title="Live Deals"
            right={
              <TouchableOpacity onPress={() => navigation.navigate("Deals")}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            }
          />

          {hasDeals ? (
            liveDeals.map((deal) => {
              const displayStatus = getDealDisplayStatus(deal, now);
              const expiryDate = toDate(deal.expiresAt);
              const endsInLabel =
                expiryDate instanceof Date && !Number.isNaN(expiryDate.getTime())
                  ? formatEndsIn(expiryDate.getTime(), now)
                  : null;

              return (
                <DealCard
                  key={deal.id}
                  title={deal.title}
                  category={deal.category || null}
                  images={getDealImages(deal)}
                  joins={deal.currentJoins ?? deal.joinedUsers ?? 0}
                  targetCount={deal.minGroupSize ?? deal.minThreshold ?? 0}
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
              );
            })
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="pricetag-outline"
                title="No live deals right now."
                subtitle="Create a deal to get it in front of buyers."
              />
            </View>
          )}
        </View>
      </ScrollView>
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
    },
    listWrap: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 32,
    },
    listWrapEmpty: {
      flex: 1,
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
