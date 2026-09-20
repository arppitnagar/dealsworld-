import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { AppButton, AppInput, useTheme, TopPageHeader } from "@dealsworld/shared";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { getProfileBaseStyles } from "../styles/profileStyles";

export default function UserDetailsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
      <TopPageHeader
        title="User Details"
        onBack={() => navigation.goBack()}
        rounded
      />

      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
      </KeyboardAvoidingView>
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
