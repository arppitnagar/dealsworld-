import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBar } from "@dealsworld/shared";
import SellerHomeScreen from "../screens/SellerHomeScreen";
import SellerDealsScreen from "../screens/SellerDealsScreen";
import SellerSearchScreen from "../screens/SellerSearchScreen";

const Tab = createBottomTabNavigator();

const icon = (name, outlineName) => (focused, color) => (
  <Ionicons name={focused ? name : outlineName} size={20} color={color} />
);

// "Create" never actually shows this — BottomTabBar intercepts it and
// pushes the real CreateDeal stack screen instead (see its `onPress`
// below), but React Navigation still requires a component for the route.
const CreatePlaceholder = () => null;

const TAB_CONFIG = [
  { key: "Dashboard", label: "Home", icon: icon("home", "home-outline") },
  { key: "Deals", label: "Deals", icon: icon("pricetag", "pricetag-outline") },
  {
    key: "Create",
    label: "Create",
    isFab: true,
    icon: (focused, color) => <Ionicons name="add" size={22} color={color} />,
    onPress: (navigation) => navigation.getParent()?.navigate("CreateDeal"),
  },
  { key: "Search", label: "Search", icon: icon("search", "search-outline") },
];

export default function SellerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} tabs={TAB_CONFIG} />}
    >
      <Tab.Screen name="Dashboard" component={SellerHomeScreen} />
      <Tab.Screen name="Deals" component={SellerDealsScreen} />
      <Tab.Screen name="Create" component={CreatePlaceholder} />
      <Tab.Screen name="Search" component={SellerSearchScreen} />
    </Tab.Navigator>
  );
}
