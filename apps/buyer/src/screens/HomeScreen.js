import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useDeals } from "../hooks/useDeals";
import { useMyDeliveries, getDeliveryBadge } from "../hooks/useDeliveryStatus";
import { useDealState } from "../hooks/useDealState";
import { useNotifications } from "../hooks/useNotifications";
import { useUserProfile } from "../hooks/useUserProfile";
import { useDealSearchControls } from "../hooks/useDealSearchControls";
import {
  SafeAreaView,
} from "react-native-safe-area-context";
import {
  useTheme,
  EmptyState,
  CardHeader,
  DealBuddyLoadingScreen,
  DealCard,
  ViewModeToggle,
  getDealThumbnails,
} from "@dealsworld/shared";
import DashboardHeader from "../components/DashboardHeader";
import DealSearchModals from "../components/DealSearchModals";
import { searchMatchesDeal } from "../utils/dealSearch";
import {
  getExpiryMs,
  getJoinCount,
  getMinGroupSize,
  getMaxGroupSize,
  isHotDeal,
  isDealActive,
  isDealPaid,
  isPickupDeal,
  matchesCategory,
  formatEndsIn,
  getDealAccentColor,
} from "../utils/dealCategories";

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [now, setNow] = useState(Date.now());
  const controls = useDealSearchControls();
  // Sort/filter/search only give correct results over the full active-deals
  // set, not just whatever pages have been scrolled into so far - fall back
  // to a one-shot full fetch (pausing infinite scroll) while any are active.
  // See useDeals.js.
  const needsFullSet = Boolean(controls.sortField) || controls.isSearching || controls.hasFieldFilter;
  const { profile, updateProfile } = useUserProfile();
  const {
    data: deals,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDeals({ fullSet: needsFullSet, city: profile?.defaultLocation });
  const {
    viewedIds,
    favoriteIds,
    joinedIds,
    toggleFavorite: toggleFavoriteDeal,
    loading: dealStateLoading,
  } = useDealState();
  const { data: myDeliveries, refetch: refetchDeliveries } = useMyDeliveries();
  const { unreadCount } = useNotifications();
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // Stands in for the polling now held off to save Firestore quota (see
  // packages/shared/config/polling.js) - pulls deal status/new deals on
  // demand instead of on a timer.
  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    try {
      await Promise.all([refetch(), refetchDeliveries()]);
    } finally {
      setManualRefreshing(false);
    }
  };

  // Defaults to "list" until the profile loads/has a saved preference;
  // persisted per-buyer so the dashboard reopens the way they left it.
  const viewMode = profile?.dashboardViewMode === "grid" ? "grid" : "list";
  const handleChangeViewMode = (mode) => {
    if (mode === viewMode) return;
    updateProfile({ dashboardViewMode: mode });
  };

  const handleToggleFavorite = (dealId) => {
    if (!dealId) return;
    toggleFavoriteDeal(dealId);
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Home always shows the fixed "New Deals" feed - the New/Hot/Viewed/
  // Favourite/Joined switcher now lives on the Deals tab. A search still
  // reaches every active deal regardless of category.
  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    const sets = { favoriteIds, viewedIds, joinedIds };
    return deals.filter((deal) => {
      if (!isDealActive(deal, now)) return false;
      if (controls.isSearching) return searchMatchesDeal(deal, controls.searchText);
      return matchesCategory(deal, "new", sets);
    });
  }, [deals, controls.isSearching, controls.searchText, favoriteIds, viewedIds, joinedIds, now]);

  const sortedDeals = controls.applyFieldFilterAndSort(filteredDeals);

  const dealsHeaderTitle = `${
    controls.isSearching ? "Search Results" : "New Deals"
  } (${sortedDeals?.length || 0})`;
  const hasDeals = sortedDeals?.length > 0;

  if (isLoading || dealStateLoading) {
    return <DealBuddyLoadingScreen label="Loading deals..." />;
  }

  const renderDeal = ({ item: deal }) => {
    const expiryMs = getExpiryMs(deal);
    const viewsCountRaw = deal?.viewsCount ?? deal?.views ?? 0;
    const favoritesCountRaw = deal?.favoritesCount ?? deal?.favouritesCount ?? 0;
    const needsPay =
      joinedIds.has(deal.id) &&
      isDealActive(deal, now) &&
      !isPickupDeal(deal) &&
      !isDealPaid(deal.id, myDeliveries);
    return (
      <View style={viewMode === "grid" ? styles.gridItem : null}>
        <DealCard
          compact={viewMode === "grid"}
          title={deal.title}
          category={deal?.category || null}
          images={getDealThumbnails(deal)}
          joins={getJoinCount(deal)}
          targetCount={getMinGroupSize(deal)}
          maxCount={getMaxGroupSize(deal)}
          accentColor={getDealAccentColor({
            isJoined: joinedIds.has(deal.id),
            isFavorite: favoriteIds.has(deal.id),
            isViewed: viewedIds.has(deal.id),
            isHot: isHotDeal(deal),
            theme,
          })}
          viewsCount={Number.isFinite(Number(viewsCountRaw)) ? Number(viewsCountRaw) : 0}
          favoritesCount={
            Number.isFinite(Number(favoritesCountRaw)) ? Number(favoritesCountRaw) : 0
          }
          ratingAvg={deal?.ratingAvg ?? deal?.rating ?? null}
          ratingCount={deal?.ratingCount ?? 0}
          originalPrice={deal?.originalPrice}
          discountPrice={deal?.discountPrice}
          badgeLabel={deal?.location ? String(deal.location) : null}
          deliveryBadge={getDeliveryBadge(deal.id, myDeliveries, theme)}
          expiryLabel={formatEndsIn(expiryMs)}
          isFavorite={favoriteIds.has(deal.id)}
          onFavoritePress={() => handleToggleFavorite(deal.id)}
          isJoined={joinedIds.has(deal.id)}
          joinLabel={joinedIds.has(deal.id) ? "Joined" : "Join"}
          onJoinPress={() => navigation.navigate("DealDetails", { dealId: deal.id })}
          payLabel={needsPay ? "Pay" : undefined}
          onPayPress={
            needsPay
              ? () => navigation.navigate("DealDetails", { dealId: deal.id })
              : undefined
          }
          actionLabel="View Deal"
          onActionPress={() => navigation.navigate("DealDetails", { dealId: deal.id })}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <DashboardHeader
        navigation={navigation}
        now={now}
        displayName={profile?.displayName}
        defaultLocation={profile?.defaultLocation}
        unreadCount={unreadCount}
        onPressRefresh={handleManualRefresh}
        refreshing={manualRefreshing}
        searchText={controls.searchText}
        onChangeSearchText={controls.setSearchText}
        sortActive={Boolean(controls.sortField)}
        onPressSort={() => controls.setIsSortVisible(true)}
        filterActive={controls.hasFieldFilter}
        onPressFilter={() => controls.setIsFilterVisible(true)}
      />

      <FlatList
        // numColumns can't change on a live FlatList without remounting.
        key={viewMode}
        data={sortedDeals}
        keyExtractor={(deal) => deal.id}
        numColumns={viewMode === "grid" ? 2 : 1}
        columnWrapperStyle={viewMode === "grid" ? styles.gridRow : undefined}
        renderItem={renderDeal}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, !hasDeals && styles.listWrapEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || manualRefreshing}
            onRefresh={handleManualRefresh}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <CardHeader
            title={dealsHeaderTitle}
            right={
              <View style={styles.headerRight}>
                <ViewModeToggle mode={viewMode} onChange={handleChangeViewMode} />
                <TouchableOpacity
                  onPress={() => {
                    controls.setSearchText("");
                    navigation.navigate("Deals");
                  }}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
            }
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={styles.footerSpinner} color={theme.colors.primary} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="search-outline"
              title={
                controls.isSearching
                  ? "No deals match your search."
                  : "No new deals right now."
              }
              subtitle={
                controls.isSearching
                  ? "Try a different search term."
                  : "Check the Deals tab to browse everything."
              }
            />
          </View>
        }
      />

      <DealSearchModals controls={controls} resultCount={sortedDeals?.length || 0} />
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
    seeAllText: {
      color: theme.colors.primary,
      fontWeight: "700",
      fontSize: 12,
    },
    gridRow: {
      justifyContent: "space-between",
    },
    gridItem: {
      width: "48%",
      marginBottom: 16,
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 24,
    },
    footerSpinner: {
      marginVertical: 16,
    },
  });
