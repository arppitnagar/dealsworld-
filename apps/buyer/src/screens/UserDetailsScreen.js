import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  AppButton,
  AppInput,
  useTheme,
  TopPageHeader,
  ConfirmModal,
  useConfirmModal,
  useI18n,
  goBackOrNavigate,
} from "@dealsworld/shared";
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
  const { confirm, alert, confirmModalProps } = useConfirmModal();
  const { t } = useI18n();

  useEffect(() => {
    setName(profile?.displayName || "");
    setPhone(profile?.phone || "");
  }, [profile?.displayName, profile?.phone]);

  const handleSave = async () => {
    const ok = await confirm({
      title: t("userDetails.confirmTitle"),
      message: t("userDetails.confirmMessage"),
      confirmText: t("common.saveChanges"),
    });
    if (!ok) return;
    setSaving(true);
    try {
      await updateProfile({
        displayName: name.trim(),
        phone: phone.trim(),
      });
      await alert({ title: t("common.saved"), message: t("userDetails.saved"), tone: "success" });
    } catch (error) {
      await alert({ title: t("common.error"), message: error?.message || t("userDetails.saveFailed"), destructive: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <TopPageHeader
        title={t("profile.userDetails")}
        onBack={() => goBackOrNavigate(navigation)}
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
          <Text style={styles.heroTitle}>{t("userDetails.heroTitle")}</Text>
          <Text style={styles.heroSubtitle}>{t("userDetails.heroSubtitle")}</Text>
        </View>

        <View style={styles.card}>
          <AppInput
            label={t("common.fullName")}
            placeholder={t("userDetails.namePlaceholder")}
            value={name}
            onChangeText={setName}
            containerStyle={styles.inputSpacing}
          />
          <AppInput
            label={t("common.phone")}
            placeholder={t("common.phoneNumber")}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <AppInput
            label={t("common.email")}
            placeholder={t("common.email")}
            value={user?.email || ""}
            editable={false}
          />
          <AppButton
            title={saving ? t("common.saving") : t("common.saveChanges")}
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
    submit: {
      marginTop: 16,
    },
  });
};
