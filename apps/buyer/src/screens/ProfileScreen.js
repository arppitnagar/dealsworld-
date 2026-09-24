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
} from "@dealsworld/shared";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { getProfileBaseStyles } from "../styles/profileStyles";

export default function ProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, logout } = useAuth();
  const { profile } = useUserProfile();
  const memberSince = useMemo(() => {
    const date = toDate(profile?.createdAt);
    return date ? formatDate(date) : null;
  }, [profile?.createdAt]);
  const { confirm, confirmModalProps } = useConfirmModal();

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Logout",
      message: "Are you sure you want to log out?",
      confirmText: "Logout",
      destructive: true,
    });
    if (!ok) return;
    logout();
  };

  return (
    <View style={styles.screen}>
      <TopPageHeader
        title="Profile"
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
                {profile?.displayName || "Buyer"}
              </Text>
              <Text style={styles.profileEmail}>{user?.email || ""}</Text>
              {memberSince ? (
                <Text style={styles.memberSince}>
                  Member since {memberSince}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>Buyer</Text>
            </View>
            {profile?.theme ? (
              <View style={styles.heroChipOutline}>
                <Text style={styles.heroChipOutlineText}>
                  {profile.theme === "dark" ? "Dark Mode" : "Light Mode"}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.menuCard}>
          <Text style={styles.sectionTitle}>Account</Text>
          <MenuItem
            icon="person-circle-outline"
            label="User Details"
            onPress={() => navigation.navigate("UserDetails")}
            theme={theme}
          />
          <MenuItem
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => navigation.navigate("ChangePassword")}
            theme={theme}
          />
          <MenuItem
            icon="location-outline"
            label="Address"
            onPress={() => navigation.navigate("AddressBook")}
            theme={theme}
            divider={false}
          />
        </View>

        <View style={styles.menuCard}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <MenuItem
            icon="color-palette-outline"
            label="Change Theme"
            onPress={() => navigation.navigate("ThemeSettings")}
            theme={theme}
          />
          <MenuItem
            icon="notifications-outline"
            label="Notification Preference"
            onPress={() => navigation.navigate("NotificationPreferences")}
            theme={theme}
          />
          <MenuItem
            icon="location-outline"
            label="Default Location"
            onPress={() => navigation.navigate("DefaultLocation")}
            theme={theme}
            divider={false}
          />
        </View>

        <View style={styles.menuCardDanger}>
          <MenuItem
            icon="log-out-outline"
            label="Logout"
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
