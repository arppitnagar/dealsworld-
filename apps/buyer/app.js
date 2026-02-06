import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HomeScreen from "./src/screens/HomeScreen";
import DealDetailsScreen from "./src/screens/DealDetailsScreen";
import DealChatScreen from "./src/screens/DealChatScreen";
import StyleGuideScreen from "./src/screens/StyleGuideScreen";

const Stack = createStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="DealDetails" component={DealDetailsScreen} />
          <Stack.Screen name="DealChat" component={DealChatScreen} />
          <Stack.Screen name="StyleGuide" component={StyleGuideScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
