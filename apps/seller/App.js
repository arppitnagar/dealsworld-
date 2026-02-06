import React, { useMemo } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { ActivityIndicator, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DealDetails from "./src/screens/DealDetails";
import DealChat from "./src/screens/DealChat";
import SellerDashboard from "./src/screens/SellerDashboard";
import CreateDealScreen from "./src/screens/CreateDealScreen";
import StyleGuideScreen from "./src/screens/StyleGuideScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RoleMismatchScreen from "./src/screens/RoleMismatchScreen";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { useUserProfile } from "./src/hooks/useUserProfile";
import { theme } from "@dealsworld/shared";

const Stack = createStackNavigator();
const queryClient = new QueryClient();

function LoadingScreen() {
  const styles = useMemo(
    () => ({
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.dashboardBg,
    }),
    [],
  );
  return (
    <View style={styles}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  if (loading || (user && profileLoading)) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : profile?.role && profile.role !== "seller" ? (
        <Stack.Screen name="RoleMismatch" component={RoleMismatchScreen} />
      ) : (
        <>
          <Stack.Screen name="SellerDashboard" component={SellerDashboard} />
          <Stack.Screen name="CreateDeal" component={CreateDealScreen} />
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
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </QueryClientProvider>
  );
}
