import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useTheme,
  toDate,
  formatDate,
  TopPageHeader,
  ConfirmModal,
  useConfirmModal,
  useI18n,
  getLanguageInfo,
} from "@dealsworld/shared";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { getProfileBaseStyles } from "../styles/profileStyles";

export default function ProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, logout } = useAuth();
  const { profile } = useUserProfile();
  const { language, t } = useI18n();
  const memberSince = useMemo(() => {
    const date = toDate(profile?.createdAt);
    return date ? formatDate(date, language) : null;
  }, [profile?.createdAt, language]);
  const { confirm, confirmModalProps } = useConfirmModal();

  const handleLogout = async () => {
    const ok = await confirm({
      title: t("profile.logout"),
      message: t("profile.logoutConfirm"),
      confirmText: t("profile.logout"),
      destructive: true,
    });
    if (!ok) return;
    logout();
  };

  return (
    <View style={styles.screen}>
      <TopPageHeader
        title={t("profile.title")}
        onBack={() => navigation.goBack()}
        rounded
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroAccent} />
          <View style={styles.heroRow}>
            <View style={styles.avatar}>
              <Ionicons
                name="person-outline"
                size={26}
                color={theme.colors.onPrimary}
              />
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.profileName}>
                {profile?.displayName || t("common.buyer")}
              </Text>
              <Text style={styles.profileEmail}>{user?.email || ""}</Text>
              {memberSince ? (
                <Text style={styles.memberSince}>
                  {t("profile.memberSince", { date: memberSince })}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{t("common.buyer")}</Text>
            </View>
            {profile?.theme ? (
              <View style={styles.heroChipOutline}>
                <Text style={styles.heroChipOutlineText}>
                  {profile.theme === "dark" ? t("profile.darkMode") : t("profile.lightMode")}
                </Text>
              </View>
            ) : null}
            <View style={styles.heroChipOutline}>
              <Text style={styles.heroChipOutlineText}>
                {getLanguageInfo(language).nativeName}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.menuCard}>
          <Text style={styles.sectionTitle}>{t("profile.account")}</Text>
          <MenuItem
            icon="person-circle-outline"
            label={t("profile.userDetails")}
            onPress={() => navigation.navigate("UserDetails")}
            theme={theme}
          />
          <MenuItem
            icon="lock-closed-outline"
            label={t("profile.changePassword")}
            onPress={() => navigation.navigate("ChangePassword")}
            theme={theme}
          />
          <MenuItem
            icon="location-outline"
            label={t("profile.address")}
            onPress={() => navigation.navigate("AddressBook")}
            theme={theme}
            divider={false}
          />
        </View>

        <View style={styles.menuCard}>
          <Text style={styles.sectionTitle}>{t("profile.preferences")}</Text>
          <MenuItem
            icon="color-palette-outline"
            label={t("profile.changeTheme")}
            onPress={() => navigation.navigate("ThemeSettings")}
            theme={theme}
          />
          <MenuItem
            icon="language-outline"
            label={t("profile.language")}
            onPress={() => navigation.navigate("LanguageSettings")}
            theme={theme}
          />
          <MenuItem
            icon="notifications-outline"
            label={t("profile.notificationPreference")}
            onPress={() => navigation.navigate("NotificationPreferences")}
            theme={theme}
          />
          <MenuItem
            icon="location-outline"
            label={t("profile.defaultLocation")}
            onPress={() => navigation.navigate("DefaultLocation")}
            theme={theme}
            divider={false}
          />
        </View>

        <View style={styles.menuCardDanger}>
          <MenuItem
            icon="log-out-outline"
            label={t("profile.logout")}
            onPress={handleLogout}
            theme={theme}
            danger
            divider={false}
          />
        </View>
      </ScrollView>

      <ConfirmModal {...confirmModalProps} />
    </View>
  );
}

function MenuItem({ icon, label, onPress, theme, danger, divider = true }) {
  const itemStyles = useMemo(() => rowStyles(theme), [theme]);
  return (
    <>
      <TouchableOpacity style={stylesRow(theme, danger)} onPress={onPress}>
        <View
          style={[
            itemStyles.iconWrap,
            danger && { backgroundColor: theme.colors.dangerSoftLight },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={danger ? theme.colors.danger : theme.colors.text}
          />
        </View>
        <Text
          style={[
            itemStyles.label,
            { color: danger ? theme.colors.danger : theme.colors.text },
          ]}
        >
          {label}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={theme.colors.textMuted}
        />
      </TouchableOpacity>
      {divider ? <View style={itemStyles.divider} /> : null}
    </>
  );
}

const rowStyles = (theme) =>
  StyleSheet.create({
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceLight,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginLeft: 48,
    },
  });

const stylesRow = (theme, danger) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  paddingVertical: 14,
  paddingHorizontal: 14,
  borderRadius: 14,
  backgroundColor: danger
    ? theme.colors.dangerSoft
    : theme.colors.surfaceMuted,
});

const createStyles = (theme) => {
  const base = getProfileBaseStyles(theme);
  return StyleSheet.create({
    ...base,
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
      gap: 18,
    },
    heroCard: {
      ...base.heroCard,
      padding: 20,
    },
    heroAccent: {
      ...base.heroAccent,
      marginBottom: 12,
    },
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: theme.colors.onPrimarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    heroInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.onPrimary,
    },
    profileEmail: {
      fontSize: 12,
      color: theme.colors.onPrimaryMuted,
      marginTop: 4,
    },
    memberSince: {
      marginTop: 6,
      fontSize: 11,
      color: theme.colors.onPrimaryMuted,
    },
    heroChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 14,
    },
    heroChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.onPrimarySoft,
    },
    heroChipText: {
      color: theme.colors.onPrimary,
      fontSize: 12,
      fontWeight: "700",
    },
    heroChipOutline: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.onPrimaryMuted,
      backgroundColor: theme.colors.onPrimaryFaint,
    },
    heroChipOutlineText: {
      color: theme.colors.onPrimary,
      fontSize: 12,
      fontWeight: "600",
    },
    menuCard: {
      ...base.card,
      gap: 6,
    },
    menuCardDanger: {
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: 20,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.dangerBorder,
      ...theme.shadow.card,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 6,
    },
  });
};
