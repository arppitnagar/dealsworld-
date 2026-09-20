import React, { useMemo } from "react";
import { View, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useTheme,
  EmptyState,
  CardHeader,
  DealCard,
  DealBuddyLoadingScreen,
  ViewModeToggle,
  getDealImages,
} from "@dealsworld/shared";
import { useDeals } from "../hooks/useDeals";
import { useMyDeliveries, getDeliveryBadge } from "../hooks/useDeliveryStatus";
import { useDealState } from "../hooks/useDealState";
import { useUserProfile } from "../hooks/useUserProfile";
import { useNotifications } from "../hooks/useNotifications";
import { useDealSearchControls } from "../hooks/useDealSearchControls";
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
  formatEndsIn,
  getDealAccentColor,
} from "../utils/dealCategories";

// The Search tab: the only place the search box lives now - Home and Deals
// keep their sort/filter icons but no longer show the input itself, so
// searching is a deliberate action reached by tapping this tab.
export default function SearchScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: deals, isLoading, refetch } = useDeals();
  const {
    viewedIds,
    favoriteIds,
    joinedIds,
    toggleFavorite: toggleFavoriteDeal,
    loading: dealStateLoading,
  } = useDealState();
  const { data: myDeliveries } = useMyDeliveries();
  const { profile, updateProfile } = useUserProfile();
  const { unreadCount } = useNotifications();
  const controls = useDealSearchControls();

  const viewMode = profile?.dashboardViewMode === "grid" ? "grid" : "list";
  const handleChangeViewMode = (mode) => {
    if (mode === viewMode) return;
    updateProfile({ dashboardViewMode: mode });
  };

  // Land on the same active deals everyone else sees - searching narrows
  // that list down, it never starts from an empty one.
  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    const now = Date.now();
    return deals.filter((deal) => {
      if (!isDealActive(deal, now)) return false;
      if (controls.isSearching) return searchMatchesDeal(deal, controls.searchText);
      return true;
    });
  }, [deals, controls.isSearching, controls.searchText]);

  const sortedDeals = controls.applyFieldFilterAndSort(filteredDeals);
  const hasDeals = sortedDeals?.length > 0;

  if (isLoading || dealStateLoading) {
    return <DealBuddyLoadingScreen label="Loading deals..." />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        <DashboardHeader
          navigation={navigation}
          displayName={profile?.displayName}
          unreadCount={unreadCount}
          searchText={controls.searchText}
          onChangeSearchText={controls.setSearchText}
          sortActive={Boolean(controls.sortField)}
          onPressSort={() => controls.setIsSortVisible(true)}
          filterActive={controls.hasFieldFilter}
          onPressFilter={() => controls.setIsFilterVisible(true)}
          showSearchControls
        />

        <View style={[styles.listWrap, !hasDeals && styles.listWrapEmpty]}>
          <CardHeader
            title={controls.isSearching ? "Search Results" : "All Deals"}
            right={<ViewModeToggle mode={viewMode} onChange={handleChangeViewMode} />}
          />

          {hasDeals ? (
            <View style={viewMode === "grid" ? styles.grid : null}>
              {sortedDeals.map((deal) => {
              const expiryMs = getExpiryMs(deal);
              const viewsCountRaw = deal?.viewsCount ?? deal?.views ?? 0;
              const favoritesCountRaw =
                deal?.favoritesCount ?? deal?.favouritesCount ?? 0;
              const needsPay =
                joinedIds.has(deal.id) &&
                isDealActive(deal) &&
                !isPickupDeal(deal) &&
                !isDealPaid(deal.id, myDeliveries);
              return (
                <View
                  key={deal.id}
                  style={viewMode === "grid" ? styles.gridItem : null}
                >
                <DealCard
                  compact={viewMode === "grid"}
                  title={deal.title}
                  category={deal?.category || null}
                  images={getDealImages(deal)}
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
                  viewsCount={
                    Number.isFinite(Number(viewsCountRaw))
                      ? Number(viewsCountRaw)
                      : 0
                  }
                  favoritesCount={
                    Number.isFinite(Number(favoritesCountRaw))
                      ? Number(favoritesCountRaw)
                      : 0
                  }
                  ratingAvg={deal?.ratingAvg ?? deal?.rating ?? null}
                  ratingCount={deal?.ratingCount ?? 0}
                  originalPrice={deal?.originalPrice}
                  discountPrice={deal?.discountPrice}
                  badgeLabel={deal?.location ? String(deal.location) : null}
                  deliveryBadge={getDeliveryBadge(deal.id, myDeliveries, theme)}
                  expiryLabel={formatEndsIn(expiryMs)}
                  isFavorite={favoriteIds.has(deal.id)}
                  onFavoritePress={() => toggleFavoriteDeal(deal.id)}
                  isJoined={joinedIds.has(deal.id)}
                  joinLabel={joinedIds.has(deal.id) ? "Joined" : "Join"}
                  onJoinPress={() =>
                    navigation.navigate("DealDetails", { dealId: deal.id })
                  }
                  payLabel={needsPay ? "Pay" : undefined}
                  onPayPress={
                    needsPay
                      ? () => navigation.navigate("DealDetails", { dealId: deal.id })
                      : undefined
                  }
                  actionLabel="View Deal"
                  onActionPress={() =>
                    navigation.navigate("DealDetails", { dealId: deal.id })
                  }
                />
                </View>
              );
              })}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="search-outline"
                title={
                  controls.isSearching
                    ? "No deals match your search."
                    : "No active deals right now."
                }
                subtitle={
                  controls.isSearching
                    ? "Try a different search term."
                    : "Pull to refresh or check back later."
                }
              />
            </View>
          )}
        </View>
      </ScrollView>

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
    },
    listWrap: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 32,
    },
    listWrapEmpty: {
      flex: 1,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: 16,
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
  });
