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
import { getProfileBaseStyles } from "../styles/profileStyles";

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

const createStyles = (theme) => {
  const base = getProfileBaseStyles(theme);
  return StyleSheet.create({
    ...base,
    inputSpacing: {
      marginTop: 0,
    },
    submit: {
      marginTop: 16,
    },
  });
};
