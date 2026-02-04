import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../config/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { theme } from "../theme/theme";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function DealChat({ route, navigation }) {
  const deal = route?.params?.deal;
  const dealId = deal?.id;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const listRef = useRef(null);
  const insets = useSafeAreaInsets();
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 48) : insets.bottom;

  useEffect(() => {
    if (!dealId) return;
    const messagesRef = collection(db, "deals", dealId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setMessages(list);
    });
    return () => unsubscribe();
  }, [dealId]);

  useEffect(() => {
    if (!listRef.current || messages.length === 0) return;
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 60);
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !dealId) return;
    setText("");
    await addDoc(collection(db, "deals", dealId, "messages"), {
      text: trimmed,
      createdAt: serverTimestamp(),
      senderRole: "seller",
      senderId: deal?.vendorid || "seller",
      senderName: "Seller",
    });
  };

  const renderItem = ({ item }) => {
    const isSeller = item.senderRole === "seller";
    const messageTime = formatTime(getMessageDate(item.createdAt));
    return (
      <View
        style={[
          styles.messageRow,
          isSeller ? styles.messageRowRight : styles.messageRowLeft,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isSeller ? styles.bubbleRight : styles.bubbleLeft,
          ]}
        >
          <Text
            style={[styles.messageText, isSeller && styles.messageTextRight]}
          >
            {item.text}
          </Text>
          {messageTime ? (
            <Text style={[styles.timeText, isSeller && styles.timeTextRight]}>
              {messageTime}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {deal?.title || "Deal Chat"}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {deal?.category || "Deal"}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatBody}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 84 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 24 + bottomInset + 56 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={36}
                color="#CBD5E1"
              />
              <Text style={styles.emptyText}>
                No messages yet. Start the conversation.
              </Text>
            </View>
          }
        />

        <View style={[styles.inputBar, { paddingBottom: 10 + bottomInset }]}>
          <TextInput
            style={styles.input}
            placeholder="Type a message"
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getMessageDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTime(date) {
  if (!date) return null;
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingTop:
      Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.primary,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    borderBottomWidth: 0,
    ...theme.shadow.card,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.onPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  chatBody: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 8,
    color: theme.colors.textMuted,
  },
  messageRow: {
    flexDirection: "row",
  },
  messageRowRight: {
    justifyContent: "flex-end",
  },
  messageRowLeft: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleRight: {
    backgroundColor: "#2563EB",
    borderTopRightRadius: 4,
  },
  bubbleLeft: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  messageText: {
    fontSize: 14,
    color: "#0F172A",
  },
  messageTextRight: {
    color: "#FFFFFF",
  },
  timeText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeTextRight: {
    color: "rgba(255,255,255,0.8)",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 0,
    marginBottom: Platform.OS === "android" ? 12 : 0,
    borderRadius: 0,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
});
