import React, { useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBar, useI18n } from "@dealsworld/shared";
import HomeScreen from "../screens/HomeScreen";
import DealsScreen from "../screens/DealsScreen";
import SearchScreen from "../screens/SearchScreen";

const Tab = createBottomTabNavigator();

const icon = (name, outlineName) => (focused, color) => (
  <Ionicons name={focused ? name : outlineName} size={20} color={color} />
);

// Profile lives behind the avatar in the dashboard header, and chat only
// makes sense once you've joined a deal (reached from that deal's own
// screen) - so neither gets a permanent slot in the bottom bar.
const getTabConfig = (t) => [
  { key: "Home", label: t("tabs.home"), icon: icon("home", "home-outline") },
  { key: "Deals", label: t("tabs.deals"), icon: icon("pricetag", "pricetag-outline") },
  { key: "Search", label: t("tabs.search"), icon: icon("search", "search-outline"), toggle: true },
];

export default function BuyerTabs() {
  const { t } = useI18n();
  const tabConfig = useMemo(() => getTabConfig(t), [t]);
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} tabs={tabConfig} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Deals" component={DealsScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}
