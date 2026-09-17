import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBar } from "@dealsworld/shared";
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
const TAB_CONFIG = [
  { key: "Home", label: "Home", icon: icon("home", "home-outline") },
  { key: "Deals", label: "Deals", icon: icon("pricetag", "pricetag-outline") },
  { key: "Search", label: "Search", icon: icon("search", "search-outline") },
];

export default function BuyerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} tabs={TAB_CONFIG} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Deals" component={DealsScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}
