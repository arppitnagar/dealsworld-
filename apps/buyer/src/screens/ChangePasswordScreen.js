import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
  ConfirmModal,
  useConfirmModal,
  useI18n,
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
  const { confirm, alert, confirmModalProps } = useConfirmModal();
  const { t } = useI18n();

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user?.email) {
      await alert({ title: t("common.error"), message: t("changePassword.missingEmail"), destructive: true });
      return;
    }
    if (!oldPassword || !newPassword || !confirmPassword) {
      await alert({ title: t("common.missingDetails"), message: t("common.fillAllFields") });
      return;
    }
    if (newPassword !== confirmPassword) {
      await alert({ title: t("changePassword.mismatchTitle"), message: t("changePassword.mismatch") });
      return;
    }
    const validationError = validatePassword(newPassword, t);
    if (validationError) {
      await alert({ title: t("password.weakTitle"), message: validationError });
      return;
    }

    const ok = await confirm({
      title: t("changePassword.confirmTitle"),
      message: t("changePassword.confirmMessage"),
      confirmText: t("changePassword.submit"),
    });
    if (!ok) return;

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      await alert({ title: t("common.success"), message: t("changePassword.updated"), tone: "success" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      await alert({ title: t("common.error"), message: error?.message || t("changePassword.failed"), destructive: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <TopPageHeader
        title={t("profile.changePassword")}
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
          <Text style={styles.heroTitle}>{t("changePassword.heroTitle")}</Text>
          <Text style={styles.heroSubtitle}>{t("changePassword.heroSubtitle")}</Text>
        </View>

        <View style={styles.card}>
          <AppInput
            label={t("changePassword.oldLabel")}
            placeholder={t("changePassword.oldPlaceholder")}
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
            label={t("changePassword.newLabel")}
            placeholder={t("changePassword.newPlaceholder")}
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
            label={t("changePassword.confirmLabel")}
            placeholder={t("changePassword.confirmPlaceholder")}
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
          <Text style={styles.hint}>{t("password.rules")}</Text>
          <AppButton
            title={saving ? t("common.updating") : t("changePassword.submit")}
            onPress={handleSave}
            loading={saving}
            style={styles.submit}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal {...confirmModalProps} />
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
