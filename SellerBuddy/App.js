import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DealDetails from "./src/screens/DealDetails";
import SellerDashboard from "./src/screens/SellerDashboard";
import CreateDealScreen from "./src/screens/CreateDealScreen";
import { AuthProvider } from "./src/context/AuthContext";
import EditDeal from "./src/screens/EditDealScreen"; // Ensure path is correct

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
            <Stack.Screen name="EditDeal" component={EditDeal} />
            {/* 2. Register the screen with the exact name "DealDetails" */}
            <Stack.Screen
              name="DealDetails"
              component={DealDetails}
              options={{ title: "Deal Details" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </QueryClientProvider>
  );
}
