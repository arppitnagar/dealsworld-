import React, { useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DealDetails from "./src/screens/DealDetails";
import DealChat from "./src/screens/DealChat";
import SellerTabs from "./src/navigation/SellerTabs";
import CreateDealScreen from "./src/screens/CreateDealScreen";
import ScanQrScreen from "./src/screens/ScanQrScreen";
import StyleGuideScreen from "./src/screens/StyleGuideScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RoleMismatchScreen from "./src/screens/RoleMismatchScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import UserDetailsScreen from "./src/screens/UserDetailsScreen";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";
import ThemeSettingsScreen from "./src/screens/ThemeSettingsScreen";
import AddressBookScreen from "./src/screens/AddressBookScreen";
import AddressFormScreen from "./src/screens/AddressFormScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { usePushToken } from "./src/hooks/usePushToken";
import { useUserProfile, UserProfileProvider } from "./src/hooks/useUserProfile";
import { useVersionGate } from "./src/hooks/useVersionGate";
import {
  DealBuddyLoadingScreen,
  UpdateRequiredScreen,
  AppButton,
  theme,
  ThemeProvider,
  useTheme,
} from "@dealsworld/shared";
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
  const { logout } = useAuth();
  const versionGate = useVersionGate();
  usePushToken();
  const role = String(profile?.role || "").toLowerCase();
  const accountStatus = String(profile?.status || "").toLowerCase();

  if (versionGate.blocked) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="UpdateRequired">
          {() => (
            <UpdateRequiredScreen
              message={versionGate.message || undefined}
              updateUrl={versionGate.updateUrl}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  if (loading || (user && profileLoading)) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : role && role !== "seller" ? (
        <Stack.Screen name="RoleMismatch" component={RoleMismatchScreen} />
      ) : accountStatus === "blocked" ? (
        <Stack.Screen name="AccountBlocked">
          {() => (
            <AccountGateScreen
              title="Seller account blocked"
              subtitle="Please contact admin support for account reactivation."
              onLogout={logout}
            />
          )}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={SellerTabs} />
          <Stack.Screen name="CreateDeal" component={CreateDealScreen} />
          <Stack.Screen name="ScanQR" component={ScanQrScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="UserDetails" component={UserDetailsScreen} />
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
          />
          <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
          <Stack.Screen name="AddressBook" component={AddressBookScreen} />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
          />
          <Stack.Screen name="AddressForm" component={AddressFormScreen} />
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

function AccountGateScreen({ title, subtitle, onLogout }) {
  return (
    <View style={gateStyles.screen}>
      <Text style={gateStyles.title}>{title}</Text>
      <Text style={gateStyles.subtitle}>{subtitle}</Text>
      <AppButton title="Logout" onPress={onLogout} style={gateStyles.button} />
    </View>
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
        <UserProfileProvider>
          <ThemeProvider initialMode="light" app="seller">
            <ThemeBootstrap>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </ThemeBootstrap>
          </ThemeProvider>
        </UserProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const gateStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.dashboardBg,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
    maxWidth: 320,
  },
  button: {
    width: 220,
  },
});
