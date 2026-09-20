import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AppButton,
  AppInput,
  useTheme,
  validatePassword,
  TopPageHeader,
} from "@dealsworld/shared";
import { auth } from "../config/firebase";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { getProfileBaseStyles } from "../styles/profileStyles";

export default function ChangePasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user?.email) {
      Alert.alert("Error", "Missing user email for password update.");
      return;
    }
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing details", "Please fill all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New password and confirmation do not match.");
      return;
    }
    const validationError = validatePassword(newPassword);
    if (validationError) {
      Alert.alert("Weak password", validationError);
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      Alert.alert("Success", "Your password has been updated.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <TopPageHeader
        title="Change Password"
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
          <Text style={styles.heroTitle}>Secure your account</Text>
          <Text style={styles.heroSubtitle}>
            Update your password to keep your account safe.
          </Text>
        </View>

        <View style={styles.card}>
          <AppInput
            label="Old Password"
            placeholder="Old password"
            secureTextEntry={!showOldPassword}
            value={oldPassword}
            onChangeText={setOldPassword}
            containerStyle={styles.inputSpacing}
            rightElement={
              showOldPassword ? (
                <Ionicons
                  name="eye-off-outline"
                  size={18}
                  color={theme.colors.primary}
                />
              ) : (
                <Ionicons
                  name="eye-outline"
                  size={18}
                  color={theme.colors.textMuted}
                />
              )
            }
            onRightPress={() => setShowOldPassword((prev) => !prev)}
          />
          <AppInput
            label="New Password"
            placeholder="New password"
            secureTextEntry={!showNewPassword}
            value={newPassword}
            onChangeText={setNewPassword}
            rightElement={
              showNewPassword ? (
                <Ionicons
                  name="eye-off-outline"
                  size={18}
                  color={theme.colors.primary}
                />
              ) : (
                <Ionicons
                  name="eye-outline"
                  size={18}
                  color={theme.colors.textMuted}
                />
              )
            }
            onRightPress={() => setShowNewPassword((prev) => !prev)}
          />
          <AppInput
            label="Confirm Password"
            placeholder="Confirm new password"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            rightElement={
              showConfirmPassword ? (
                <Ionicons
                  name="eye-off-outline"
                  size={18}
                  color={theme.colors.primary}
                />
              ) : (
                <Ionicons
                  name="eye-outline"
                  size={18}
                  color={theme.colors.textMuted}
                />
              )
            }
            onRightPress={() => setShowConfirmPassword((prev) => !prev)}
          />
          <Text style={styles.hint}>
            Minimum 8 chars with upper, lower, number, and special character.
          </Text>
          <AppButton
            title={saving ? "Updating..." : "Update Password"}
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
    hint: {
      marginTop: 8,
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    submit: {
      marginTop: 16,
    },
  });
};
