import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import SellerDashboard from "./src/screens/SellerDashboard";
import CreateDealScreen from "./src/screens/CreateDealScreen";
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
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </QueryClientProvider>
  );
}
