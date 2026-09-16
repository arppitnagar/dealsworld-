import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBar } from "@dealsworld/shared";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ComingSoonScreen from "../screens/ComingSoonScreen";

const Tab = createBottomTabNavigator();

const icon = (name, outlineName) => (focused, color) => (
  <Ionicons name={focused ? name : outlineName} size={20} color={color} />
);

const TAB_CONFIG = [
  { key: "Home", label: "Home", icon: icon("home", "home-outline") },
  { key: "Search", label: "Search", icon: icon("search", "search-outline") },
  { key: "Deals", label: "Deals", icon: icon("pricetag", "pricetag-outline") },
  {
    key: "Chat",
    label: "Chat",
    icon: icon("chatbubble", "chatbubble-outline"),
  },
  { key: "Profile", label: "Profile", icon: icon("person", "person-outline") },
];

export default function BuyerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} tabs={TAB_CONFIG} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Search"
        component={ComingSoonScreen}
        initialParams={{ title: "Search", subtitle: "Search is on its way." }}
      />
      <Tab.Screen
        name="Deals"
        component={ComingSoonScreen}
        initialParams={{ title: "Deals", subtitle: "Your deals list is on its way." }}
      />
      <Tab.Screen
        name="Chat"
        component={ComingSoonScreen}
        initialParams={{ title: "Chat", subtitle: "A chat inbox is on its way." }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
