import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Search, X, Bell, ShoppingBag } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, AppInput } from "@dealsworld/shared";

// The one persistent "dashboard" header - brand lockup, bell, avatar, and
// greeting. Home and the Deals tab render this exact same component so
// neither screen's chrome ever looks different; only the content below it
// (which deals are listed) changes. The search input plus its sort/filter
// controls only render on the dedicated Search tab (showSearchControls) -
// everywhere else that whole row is left out entirely, freeing the screen
// space it would otherwise sit in, until the user deliberately asks to
// search.
export default function DashboardHeader({
  navigation,
  now = Date.now(),
  displayName,
  unreadCount = 0,
  searchText,
  onChangeSearchText,
  sortActive,
  onPressSort,
  filterActive,
  onPressFilter,
  showSearchControls = false,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const greetingLabel = getGreetingLabel(now);
  const avatarInitial = (displayName || "Buyer").trim()[0]?.toUpperCase() || "B";

  return (
    <>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDeep]}
            style={styles.logoGradient}
          >
            <ShoppingBag size={18} color={theme.colors.onPrimary} />
          </LinearGradient>
          <View>
            <Text style={styles.brandName}>
              Deal<Text style={{ color: theme.colors.primary }}>Buddy</Text>
            </Text>
            <Text style={styles.brandSub}>DEALSWORLD</Text>
          </View>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate("Notifications")}
            activeOpacity={0.85}
          >
            <Bell size={17} color={theme.colors.text} />
            {unreadCount > 0 ? <View style={styles.badgeDot} /> : null}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryDeep]}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.greetingBlock}>
        <Text style={styles.greetingLabel}>{greetingLabel}</Text>
        <Text style={styles.greetingName}>{displayName || "Buyer"}</Text>
      </View>

      {showSearchControls && (
        <View style={styles.searchRow}>
          <AppInput
            value={searchText}
            onChangeText={onChangeSearchText}
            placeholder="Search deals, stores, categories"
            containerStyle={styles.searchInputContainer}
            inputStyle={styles.searchInput}
            leftElement={<Search size={17} color={theme.colors.textMuted} />}
            rightElement={
              searchText?.length > 0 ? (
                <X size={16} color={theme.colors.text} />
              ) : null
            }
            onRightPress={
              searchText?.length > 0 ? () => onChangeSearchText("") : undefined
            }
          />
          <TouchableOpacity
            style={[styles.squareIconBtn, sortActive && styles.squareIconBtnActive]}
            onPress={onPressSort}
            activeOpacity={0.85}
          >
            <Ionicons
              name="swap-vertical"
              size={18}
              color={sortActive ? theme.colors.onPrimary : theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.squareIconBtn, filterActive && styles.squareIconBtnActive]}
            onPress={onPressFilter}
            activeOpacity={0.85}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={filterActive ? theme.colors.onPrimary : theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

function getGreetingLabel(nowMs) {
  const hour = new Date(nowMs).getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
}

const createStyles = (theme) =>
  StyleSheet.create({
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    logoGradient: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    brandName: {
      fontSize: 17,
      fontWeight: "800",
      color: theme.colors.text,
      letterSpacing: -0.3,
    },
    brandSub: {
      fontSize: 9,
      fontWeight: "700",
      color: theme.colors.textMuted,
      letterSpacing: 0.8,
      marginTop: 2,
    },
    topActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeDot: {
      position: "absolute",
      top: 7,
      right: 7,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.colors.danger,
      borderWidth: 1.5,
      borderColor: theme.colors.surface,
    },
    avatarGradient: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.colors.onPrimary,
    },
    greetingBlock: {
      flexDirection: "row",
      alignItems: "baseline",
      paddingHorizontal: 20,
      marginTop: 12,
      gap: 6,
    },
    greetingLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    greetingName: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.text,
      letterSpacing: -0.3,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 20,
      marginTop: 14,
    },
    searchInputContainer: {
      flex: 1,
      marginTop: 0,
    },
    searchInput: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.text,
      borderRadius: 14,
      height: 48,
    },
    squareIconBtn: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    squareIconBtnActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
  });
