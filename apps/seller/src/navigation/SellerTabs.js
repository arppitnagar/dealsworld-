import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBar } from "@dealsworld/shared";
import SellerDashboard from "../screens/SellerDashboard";
import ProfileScreen from "../screens/ProfileScreen";
import ComingSoonScreen from "../screens/ComingSoonScreen";

const Tab = createBottomTabNavigator();

const icon = (name, outlineName) => (focused, color) => (
  <Ionicons name={focused ? name : outlineName} size={20} color={color} />
);

// "Create" never actually shows this — BottomTabBar intercepts it and
// pushes the real CreateDeal stack screen instead (see its `onPress`
// below), but React Navigation still requires a component for the route.
const CreatePlaceholder = () => null;

const TAB_CONFIG = [
  { key: "Dashboard", label: "Dashboard", icon: icon("grid", "grid-outline") },
  { key: "Deals", label: "Deals", icon: icon("pricetag", "pricetag-outline") },
  {
    key: "Create",
    label: "Create",
    isFab: true,
    icon: (focused, color) => <Ionicons name="add" size={22} color={color} />,
    onPress: (navigation) => navigation.getParent()?.navigate("CreateDeal"),
  },
  {
    key: "Chat",
    label: "Chat",
    icon: icon("chatbubble", "chatbubble-outline"),
  },
  { key: "Profile", label: "Profile", icon: icon("person", "person-outline") },
];

export default function SellerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} tabs={TAB_CONFIG} />}
    >
      <Tab.Screen name="Dashboard" component={SellerDashboard} />
      <Tab.Screen
        name="Deals"
        component={ComingSoonScreen}
        initialParams={{ title: "Deals", subtitle: "Your full deals list is on its way." }}
      />
      <Tab.Screen name="Create" component={CreatePlaceholder} />
      <Tab.Screen
        name="Chat"
        component={ComingSoonScreen}
        initialParams={{ title: "Chat", subtitle: "A chat inbox is on its way." }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
