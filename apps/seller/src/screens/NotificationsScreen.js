import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState, toDate, useTheme, TopPageHeader } from "@dealsworld/shared";
import { useNotifications } from "../hooks/useNotifications";

export default function NotificationsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { notifications, loading, markNotificationRead } = useNotifications();

  const handleOpen = async (item) => {
    if (!item) return;
    if (item.id && (!item.readAt || !item.isRead)) {
      await markNotificationRead(item.id);
    }
    if (item.dealId) {
      navigation.navigate("DealDetails", { deal: { id: item.dealId } });
    }
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.readAt && !item.isRead;
    const timeLabel = formatNotificationTime(item.createdAt);
    const title =
      item.title ||
      (item.type === "chat"
        ? "Buyer replied"
        : item.type === "deal"
          ? "Deal update"
          : "Notification");
    const body = item.body || item.message || item.preview || "";
    const iconName = item.type === "chat" ? "chatbubble-outline" : "pricetag";

    return (
      <TouchableOpacity
        style={[styles.noticeCard, isUnread && styles.noticeCardUnread]}
        onPress={() => handleOpen(item)}
        activeOpacity={0.8}
      >
        <View style={styles.noticeIcon}>
          <Ionicons name={iconName} size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.noticeContent}>
          <Text
            style={[styles.noticeTitle, isUnread && styles.noticeTitleUnread]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {body ? (
            <Text style={styles.noticeBody} numberOfLines={2}>
              {body}
            </Text>
          ) : null}
          {timeLabel ? (
            <Text style={styles.noticeTime}>{timeLabel}</Text>
          ) : null}
        </View>
        {isUnread ? <View style={styles.unreadDot} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <TopPageHeader
        title="Notifications"
        onBack={() => navigation.goBack()}
        rounded
      />

      {notifications.length === 0 && !loading ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="notifications-outline"
            title="No notifications yet"
            subtitle="Chat replies and deal updates will appear here."
          />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function formatNotificationTime(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const createStyles = (theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.dashboardBg,
    },
    listContent: {
      padding: 20,
      paddingBottom: 24,
      gap: 12,
    },
    noticeCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      ...theme.shadow.card,
    },
    noticeCardUnread: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.infoSoft,
    },
    noticeIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    noticeContent: {
      flex: 1,
      gap: 4,
    },
    noticeTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.text,
    },
    noticeTitleUnread: {
      color: theme.colors.primary,
    },
    noticeBody: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    noticeTime: {
      fontSize: 10,
      color: theme.colors.textMuted,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.danger,
      marginTop: 6,
    },
    emptyWrap: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingBottom: 80,
    },
  });
