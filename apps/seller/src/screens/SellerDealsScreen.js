import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useTheme,
  EmptyState,
  CardHeader,
  DealCard,
  DealBuddyLoadingScreen,
  getStatusColor,
  getStatusLabel,
  getDealImages,
  toDate,
} from "@dealsworld/shared";
import { useSellerLiveDeals } from "../hooks/useSellerLiveDeals";
import { useNotifications } from "../hooks/useNotifications";
import { useDealSearchControls } from "../hooks/useDealSearchControls";
import SellerDashboardHeader from "../components/SellerDashboardHeader";
import SellerStatusModal from "../components/SellerStatusModal";
import DealSearchModals from "../components/DealSearchModals";
import { searchMatchesDeal } from "../utils/dealSearch";
import {
  getDealDisplayStatus,
  matchesStatusFilter,
  getAllStatusCounts,
  formatEndsIn,
} from "../utils/dealStatus";

const TITLE_BY_KEY = {
  active: "Active Deals",
  pending: "Pending Deals",
  completed: "Completed Deals",
  rejected: "Rejected Deals",
  expired: "Expired Deals",
};

// Deals tab: the same dashboard header as Dashboard (brand, greeting) plus
// the search/sort/filter row. Tapping the tab opens a bottom-sheet status
// picker with All/Active/Pending/Completed/Rejected/Expired; picking one
// closes the sheet and updates only the list underneath. The separate Search
// tab (SellerSearchScreen) covers plain search with no status picker
// attached.
export default function SellerDealsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { deals, loading, sellerDisplayName } = useSellerLiveDeals();
  const { unreadCount } = useNotifications();
  const [now, setNow] = useState(Date.now());
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const getStatusValue = (deal) => getDealDisplayStatus(deal, now);
  const controls = useDealSearchControls(getStatusValue);

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Open the picker once the screen has actually mounted (rather than as its
  // very first paint's state) so the header's safe-area inset is already
  // settled before the overlay appears on top of it.
  useEffect(() => {
    setIsPickerVisible(true);
  }, []);

  // Re-open the picker every time the seller taps the Deals tab (including
  // tapping it again while already on it, to change the status).
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", () => {
      setIsPickerVisible(true);
    });
    return unsubscribe;
  }, [navigation]);

  const listableDeals = useMemo(() => deals || [], [deals]);

  const counts = useMemo(() => getAllStatusCounts(listableDeals, now), [listableDeals, now]);
  const allCount = listableDeals.length;

  const filteredDeals = useMemo(() => {
    return listableDeals.filter((deal) => {
      if (controls.isSearching) return searchMatchesDeal(deal, controls.searchText);
      return matchesStatusFilter(deal, selectedStatus, now);
    });
  }, [listableDeals, controls.isSearching, controls.searchText, selectedStatus, now]);

  const sortedDeals = controls.applyFieldFilterAndSort(filteredDeals);

  const sectionTitle = controls.isSearching
    ? "Search Results"
    : selectedStatus
      ? TITLE_BY_KEY[selectedStatus] || "Deals"
      : "All Deals";

  if (loading) {
    return <DealBuddyLoadingScreen label="Loading deals..." />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
      >
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

        <View style={[styles.listWrap, !sortedDeals?.length && styles.listWrapEmpty]}>
          <CardHeader
            title={`${sectionTitle} (${sortedDeals?.length || 0})`}
          />

          {sortedDeals?.length > 0 ? (
            sortedDeals.map((deal) => {
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
                title={
                  controls.isSearching
                    ? "No deals match your search."
                    : selectedStatus
                      ? "No deals with this status."
                      : "No deals yet."
                }
                subtitle={
                  controls.isSearching
                    ? "Try a different search term."
                    : "Pull to refresh or pick another status."
                }
              />
            </View>
          )}
        </View>
      </ScrollView>

      <SellerStatusModal
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        counts={counts}
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
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 24,
    },
  });
