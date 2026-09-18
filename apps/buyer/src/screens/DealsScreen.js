import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet } from "react-native";
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
import { useDeals, useJoinedDeals } from "../hooks/useDeals";
import { useMyDeliveries, getDeliveryBadge, getOrderBadge } from "../hooks/useDeliveryStatus";
import { useDealState } from "../hooks/useDealState";
import { useUserProfile } from "../hooks/useUserProfile";
import { useNotifications } from "../hooks/useNotifications";
import { useDealSearchControls } from "../hooks/useDealSearchControls";
import DashboardHeader from "../components/DashboardHeader";
import DealSearchModals from "../components/DealSearchModals";
import DealCategoryModal from "../components/DealCategoryModal";
import { searchMatchesDeal } from "../utils/dealSearch";
import {
  getExpiryMs,
  getJoinCount,
  getMinGroupSize,
  getMaxGroupSize,
  isHotDeal,
  isDealActive,
  isDealOrder,
  isDealPaid,
  isPickupDeal,
  matchesCategory,
  getCategoryCount,
  getAllCategoryCounts,
  formatEndsIn,
  getDealAccentColor,
} from "../utils/dealCategories";

const ACCENT_BY_KEY = (theme) => ({
  new: theme.colors.warningBright,
  hot: theme.colors.purple,
  viewed: theme.colors.primary,
  favourite: theme.colors.danger,
  my: theme.colors.success,
  orders: theme.colors.primary,
});

const TITLE_BY_KEY = {
  new: "New Deals",
  hot: "Hot Deals",
  viewed: "Viewed Deals",
  favourite: "Loved Deals",
  my: "Joined Deals",
  orders: "My Orders",
};

// Deals tab: the exact same dashboard header as Home (brand, greeting,
// search, sort/filter) so the app's chrome never changes between tabs.
// Tapping the tab opens a bottom-sheet picker with New/Hot/Viewed/
// Favourite/Joined; picking one closes the sheet and updates only the deal
// list underneath - no extra pill or dropdown sits under the search box.
export default function DealsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: deals, isLoading, refetch } = useDeals();
  const { data: joinedDeals } = useJoinedDeals();
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
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const viewMode = profile?.dashboardViewMode === "grid" ? "grid" : "list";
  const handleChangeViewMode = (mode) => {
    if (mode === viewMode) return;
    updateProfile({ dashboardViewMode: mode });
  };

  const sets = { favoriteIds, viewedIds, joinedIds, deliveries: myDeliveries };
  const accentByKey = ACCENT_BY_KEY(theme);

  // Open the picker once the screen has actually mounted and laid out
  // (rather than as its very first paint's state) so the header's safe-area
  // inset is already settled before the overlay appears on top of it.
  useEffect(() => {
    setIsPickerVisible(true);
  }, []);

  // Re-open the picker every time the user taps the Deals tab (including
  // tapping it again while already on it, to change the category).
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", () => {
      setIsPickerVisible(true);
    });
    return unsubscribe;
  }, [navigation]);

  const counts = useMemo(
    () => ({
      ...getAllCategoryCounts(deals, sets, Date.now()),
      orders: joinedDeals?.filter((deal) => isDealOrder(deal, myDeliveries)).length || 0,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deals, joinedDeals, favoriteIds, viewedIds, joinedIds, myDeliveries],
  );

  const allCount = useMemo(
    () => getCategoryCount(deals, null, sets, Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deals, favoriteIds, viewedIds, joinedIds],
  );

  // Searching (via the shared header) bypasses the category pick entirely,
  // same as Home - it reaches every active deal, not just the current one.
  // "My Orders" is the one exception: it's sourced from useJoinedDeals()
  // instead of the active-only deals list, since it exists specifically to
  // stay reachable once a deal's campaign has ended - or, now, as soon as
  // the buyer has paid for it, even while the campaign is still active.
  const isOrdersView = selectedFilter === "orders" && !controls.isSearching;
  const filteredDeals = useMemo(() => {
    if (controls.isSearching) {
      if (!deals) return [];
      return deals.filter((deal) => searchMatchesDeal(deal, controls.searchText));
    }
    if (selectedFilter === "orders") {
      if (!joinedDeals) return [];
      return joinedDeals.filter((deal) => isDealOrder(deal, myDeliveries));
    }
    if (!deals) return [];
    const now = Date.now();
    return deals.filter(
      (deal) => isDealActive(deal, now) && matchesCategory(deal, selectedFilter, sets),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals, joinedDeals, controls.isSearching, controls.searchText, selectedFilter, favoriteIds, viewedIds, joinedIds, myDeliveries]);

  const sortedDeals = controls.applyFieldFilterAndSort(filteredDeals);

  const sectionTitle = controls.isSearching
    ? "Search Results"
    : selectedFilter
      ? TITLE_BY_KEY[selectedFilter] || "Deals"
      : "All Deals";

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
        />

        <View
          style={[
            styles.listWrap,
            !sortedDeals?.length && styles.listWrapEmpty,
          ]}
        >
          <CardHeader
            title={`${sectionTitle} (${sortedDeals?.length || 0})`}
            right={<ViewModeToggle mode={viewMode} onChange={handleChangeViewMode} />}
          />

          {sortedDeals?.length > 0 ? (
            <View style={viewMode === "grid" ? styles.grid : null}>
              {sortedDeals.map((deal) => {
              const expiryMs = getExpiryMs(deal);
              const viewsCountRaw = deal?.viewsCount ?? deal?.views ?? 0;
              const favoritesCountRaw =
                deal?.favoritesCount ?? deal?.favouritesCount ?? 0;
              const needsPay =
                !isOrdersView &&
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
                  deliveryBadge={
                    isOrdersView
                      ? getOrderBadge(deal, myDeliveries, theme)
                      : getDeliveryBadge(deal.id, myDeliveries, theme)
                  }
                  expiryLabel={isOrdersView ? null : formatEndsIn(expiryMs)}
                  isFavorite={favoriteIds.has(deal.id)}
                  onFavoritePress={() => toggleFavoriteDeal(deal.id)}
                  isJoined={joinedIds.has(deal.id)}
                  joinLabel={isOrdersView ? undefined : joinedIds.has(deal.id) ? "Joined" : "Join"}
                  onJoinPress={
                    isOrdersView
                      ? undefined
                      : () => navigation.navigate("DealDetails", { dealId: deal.id })
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
                icon="pricetag-outline"
                title={
                  controls.isSearching
                    ? "No deals match your search."
                    : isOrdersView
                      ? "No orders yet."
                      : selectedFilter
                        ? "No deals in this category."
                        : "No active deals right now."
                }
                subtitle={
                  controls.isSearching
                    ? "Try a different search term."
                    : isOrdersView
                      ? "Deals you've paid for, or that have ended, will show up here."
                      : "Pull to refresh or pick another category."
                }
              />
            </View>
          )}
        </View>
      </ScrollView>

      <DealCategoryModal
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        selectedFilter={selectedFilter}
        onSelectFilter={setSelectedFilter}
        counts={counts}
        accentByKey={accentByKey}
        allCount={allCount}
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
