import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppInput, useTheme } from "@dealsworld/shared";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function UserDetailsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile, updateProfile } = useUserProfile();
  const [name, setName] = useState(profile?.displayName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.displayName || "");
    setPhone(profile?.phone || "");
  }, [profile?.displayName, profile?.phone]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        displayName: name.trim(),
        phone: phone.trim(),
      });
      Alert.alert("Saved", "Your details were updated.");
    } catch (error) {
      Alert.alert("Error", error?.message || "Unable to save details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.headerBar,
          { paddingTop: Math.max(insets.top, 12) },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={theme.colors.onPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroAccent} />
          <Text style={styles.heroTitle}>Your profile details</Text>
          <Text style={styles.heroSubtitle}>
            Keep your name and contact details up to date.
          </Text>
        </View>

        <View style={styles.card}>
          <AppInput
            label="Full Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            containerStyle={styles.inputSpacing}
          />
          <AppInput
            label="Phone"
            placeholder="Phone number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <AppInput
            label="Email"
            placeholder="Email"
            value={user?.email || ""}
            editable={false}
          />
          <AppButton
            title={saving ? "Saving..." : "Save Changes"}
            onPress={handleSave}
            loading={saving}
            style={styles.submit}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.dashboardBg,
    },
    headerBar: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.onPrimarySoft,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.onPrimarySoft,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 0,
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.onPrimary,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 32,
      gap: 18,
    },
    heroCard: {
      backgroundColor: theme.colors.primary,
      borderRadius: 24,
      padding: 18,
      overflow: "hidden",
      ...theme.shadow.card,
    },
    heroAccent: {
      width: 56,
      height: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.onPrimary,
      opacity: 0.7,
      marginBottom: 10,
    },
    heroTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.onPrimary,
    },
    heroSubtitle: {
      fontSize: 12,
      marginTop: 6,
      color: theme.colors.onPrimaryMuted,
    },
    card: {
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    },
    inputSpacing: {
      marginTop: 0,
    },
    submit: {
      marginTop: 16,
    },
  });
