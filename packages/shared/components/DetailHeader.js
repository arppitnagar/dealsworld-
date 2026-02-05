import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function DetailHeader({
  category,
  title,
  onChat,
  onEdit,
  editLabel = "Edit",
  editIcon = "create-outline",
}) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.category}>{category || "General"}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.actions}>
          {onChat ? (
            <TouchableOpacity style={styles.chatBtn} onPress={onChat}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          ) : null}

          {onEdit ? (
            <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
              <Ionicons name={editIcon} size={20} color={theme.colors.purple} />
              <Text style={styles.editBtnText}>{editLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleWrap: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 12,
  },
  chatBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  category: {
    color: theme.colors.purple,
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.text,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.purpleSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editBtnText: {
    color: theme.colors.purple,
    fontWeight: "700",
    marginLeft: 6,
  },
});
