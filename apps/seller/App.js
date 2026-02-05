import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DealDetails from "./src/screens/DealDetails";
import DealChat from "./src/screens/DealChat";
import SellerDashboard from "./src/screens/SellerDashboard";
import CreateDealScreen from "./src/screens/CreateDealScreen";
import StyleGuideScreen from "./src/screens/StyleGuideScreen";
import { AuthProvider } from "./src/context/AuthContext";

const Stack = createStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="SellerDashboard"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="SellerDashboard" component={SellerDashboard} />
            <Stack.Screen name="CreateDeal" component={CreateDealScreen} />
            {/* 2. Register the screen with the exact name "DealDetails" */}
            <Stack.Screen
              name="DealDetails"
              component={DealDetails}
              options={{ title: "Deal Details" }}
            />
            <Stack.Screen
              name="DealChat"
              component={DealChat}
              options={{ title: "Deal Chat" }}
            />
            <Stack.Screen
              name="StyleGuide"
              component={StyleGuideScreen}
              options={{ title: "Style Guide" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </QueryClientProvider>
  );
}
