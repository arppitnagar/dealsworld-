import React, { useRef, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  DealBuddyLoadingScreen,
  ThemeProvider,
  useTheme,
} from "@dealsworld/shared";
import HomeScreen from "./src/screens/HomeScreen";
import DealDetailsScreen from "./src/screens/DealDetailsScreen";
import DealChatScreen from "./src/screens/DealChatScreen";
import StyleGuideScreen from "./src/screens/StyleGuideScreen";
import LoginScreen from "./src/screens/LoginScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import UserDetailsScreen from "./src/screens/UserDetailsScreen";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";
import ThemeSettingsScreen from "./src/screens/ThemeSettingsScreen";
import AddressBookScreen from "./src/screens/AddressBookScreen";
import AddressFormScreen from "./src/screens/AddressFormScreen";
import RoleMismatchScreen from "./src/screens/RoleMismatchScreen";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { useUserProfile } from "./src/hooks/useUserProfile";
import {
  getStoredThemeMode,
  setStoredThemeMode,
} from "./src/utils/themeStorage";

const Stack = createStackNavigator();
const queryClient = new QueryClient();

function LoadingScreen() {
  return <DealBuddyLoadingScreen label="Checking your account..." />;
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
      ) : profile?.role && profile.role !== "buyer" ? (
        <Stack.Screen name="RoleMismatch" component={RoleMismatchScreen} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="DealDetails" component={DealDetailsScreen} />
          <Stack.Screen name="DealChat" component={DealChatScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="UserDetails" component={UserDetailsScreen} />
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
          />
          <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
          <Stack.Screen name="AddressBook" component={AddressBookScreen} />
          <Stack.Screen name="AddressForm" component={AddressFormScreen} />
          <Stack.Screen name="StyleGuide" component={StyleGuideScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

function ThemeBootstrap({ children }) {
  const { profile } = useUserProfile();
  const { mode, setMode } = useTheme();
  const [hydrated, setHydrated] = useState(false);
  const storedThemeRef = useRef(null);
  const profileAppliedRef = useRef(false);
  const profileIdRef = useRef(null);

  React.useEffect(() => {
    let isActive = true;
    const hydrate = async () => {
      const stored = await getStoredThemeMode();
      if (!isActive) return;
      if (stored) {
        storedThemeRef.current = stored;
        if (stored !== mode) {
          setMode(stored);
        }
      }
      setHydrated(true);
    };
    hydrate();
    return () => {
      isActive = false;
    };
  }, [setMode]);

  React.useEffect(() => {
    if (!hydrated) return;
    if (profile?.id && profile?.id !== profileIdRef.current) {
      profileAppliedRef.current = false;
      profileIdRef.current = profile.id;
    }
    if (!profile?.theme) return;
    if (storedThemeRef.current) return;
    if (profileAppliedRef.current) return;
    if (profile.theme !== mode) {
      setMode(profile.theme);
    }
    profileAppliedRef.current = true;
  }, [hydrated, profile?.id, profile?.theme, mode, setMode]);

  React.useEffect(() => {
    storedThemeRef.current = mode;
    setStoredThemeMode(mode);
  }, [mode]);

  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider initialMode="light">
          <ThemeBootstrap>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </ThemeBootstrap>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
