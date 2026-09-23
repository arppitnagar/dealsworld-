import React, { useEffect, useMemo, useState } from "react";
import { View, FlatList, RefreshControl, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useTheme,
  EmptyState,
  CardHeader,
  DealCard,
  DealBuddyLoadingScreen,
  ViewModeToggle,
  getStatusColor,
  getStatusLabel,
  getDealThumbnails,
  toDate,
} from "@dealsworld/shared";
import { useSellerLiveDeals } from "../hooks/useSellerLiveDeals";
import { useNotifications } from "../hooks/useNotifications";
import { useUserProfile } from "../hooks/useUserProfile";
import { useDealSearchControls } from "../hooks/useDealSearchControls";
import SellerDashboardHeader from "../components/SellerDashboardHeader";
import DealSearchModals from "../components/DealSearchModals";
import { searchMatchesDeal } from "../utils/dealSearch";
import { getDealDisplayStatus, formatEndsIn } from "../utils/dealStatus";

// The Search tab: mirrors the buyer app's Search tab - a plain search box
// over every listable deal, with no status picker attached. The Deals tab
// keeps its Active/Pending/Rejected/Expired picker for browsing; this tab is
// reached deliberately when the seller already knows what they're looking
// for.
export default function SellerSearchScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { deals, loading, sellerDisplayName } = useSellerLiveDeals();
  const { unreadCount } = useNotifications();
  const { profile, updateProfile } = useUserProfile();
  const [now, setNow] = useState(Date.now());
  const controls = useDealSearchControls();

  // Same profile-backed setting the Deals tab uses, so grid/list stays
  // consistent across tabs instead of always resetting to list here.
  const viewMode = profile?.dashboardViewMode === "grid" ? "grid" : "list";
  const handleChangeViewMode = (mode) => {
    if (mode === viewMode) return;
    updateProfile({ dashboardViewMode: mode });
  };

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Land on the same listable deals the Deals tab shows - searching narrows
  // that list down, it never starts from an empty one.
  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    return deals.filter((deal) => {
      if (controls.isSearching) return searchMatchesDeal(deal, controls.searchText);
      return true;
    });
  }, [deals, controls.isSearching, controls.searchText]);

  const sortedDeals = controls.applyFieldFilterAndSort(filteredDeals);
  const hasDeals = sortedDeals?.length > 0;

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
      <SellerDashboardHeader
        navigation={navigation}
        now={now}
        displayName={sellerDisplayName}
        unreadCount={unreadCount}
        searchText={controls.searchText}
        onChangeSearchText={controls.setSearchText}
        sortActive={Boolean(controls.sortField)}
        onPressSort={() => controls.setIsSortVisible(true)}
        filterActive={controls.hasFieldFilter}
        onPressFilter={() => controls.setIsFilterVisible(true)}
        showSearchControls
      />

      <FlatList
        key={viewMode}
        data={sortedDeals}
        keyExtractor={(deal) => deal.id}
        numColumns={viewMode === "grid" ? 2 : 1}
        columnWrapperStyle={viewMode === "grid" ? styles.gridRow : undefined}
        renderItem={renderDeal}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, !hasDeals && styles.listWrapEmpty]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
        ListHeaderComponent={
          <CardHeader
            title={`${controls.isSearching ? "Search Results" : "All Deals"} (${sortedDeals?.length || 0})`}
            right={<ViewModeToggle mode={viewMode} onChange={handleChangeViewMode} />}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="search-outline"
              title={controls.isSearching ? "No deals match your search." : "No deals yet."}
              subtitle={
                controls.isSearching
                  ? "Try a different search term."
                  : "Pull to refresh or check back later."
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
  });
