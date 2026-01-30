import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../config/firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";

const { width } = Dimensions.get("window");

export default function DealDetails({ route, navigation }) {
  const { deal: initialDeal } = route.params;
  const [deal, setDeal] = useState(initialDeal); // Use state to hold the live deal
  const [loading, setLoading] = useState(false);

  // Use the local 'deal' state for all calculations
  const joins = deal.joinedUsers || 0;
  const target = deal.minGroupSize || 1; // Updated to match your CreateDeal field name
  const progress = Math.min(joins / target, 1);
  const isActive = deal.status === "active";
  const isCompleted = deal.status === "completed";

  const handleEndCampaign = () => {
    Alert.alert(
      "End Deal",
      "Are you sure you want to end this deal early? It will be moved to 'Previous' deals.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Now",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const dealRef = doc(db, "deals", deal.id);
              await updateDoc(dealRef, { status: "completed" });
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Could not update deal status.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    // Use route.params.deal.id directly to ensure the listener starts correctly
    const dealRef = doc(db, "deals", route.params.deal.id);

    const unsubscribe = onSnapshot(
      dealRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setDeal({ id: docSnap.id, ...docSnap.data() });
        }
      },
      (error) => {
        console.error("Snapshot error: ", error);
      },
    );

    return () => unsubscribe();
  }, [route.params.deal.id]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {deal.image ? (
            <Image source={{ uri: deal.image }} style={styles.headerImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={60} color="#CBD5E1" />
            </View>
          )}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.category}>{deal.category || "General"}</Text>
              <Text style={styles.title}>{deal.title}</Text>
            </View>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate("CreateDeal", { deal })} // Passing the deal object here
            >
              <Ionicons
                name={isCompleted ? "eye-outline" : "create-outline"}
                size={20}
                color="#7C3AED"
              />
              <Text style={styles.editBtnText}>
                {isCompleted ? "View" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Current Joins</Text>
              <Text style={styles.statValue}>{joins}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Target</Text>
              <Text style={styles.statValue}>{target}</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Campaign Progress</Text>
              <Text style={styles.progressPercent}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progress * 100}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              {deal.description || "No description provided for this deal."}
            </Text>
          </View>
        </View>
      </ScrollView>

      {isActive && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.endBtn}
            onPress={handleEndCampaign}
            disabled={loading}
          >
            <Text style={styles.endBtnText}>
              {loading ? "Processing..." : "End Campaign Early"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  imageContainer: { width: width, height: 280, backgroundColor: "#F1F5F9" },
  headerImage: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 12,
    elevation: 5,
  },
  content: {
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    backgroundColor: "#FFF",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  category: {
    color: "#7C3AED",
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editBtnText: { color: "#7C3AED", fontWeight: "700", marginLeft: 6 },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  statBox: {
    width: (width - 60) / 2,
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  progressSection: { marginBottom: 30 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressTitle: { fontWeight: "700", color: "#0F172A" },
  progressPercent: { fontWeight: "800", color: "#FF4D4D" },
  progressBarBg: {
    height: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: "#FF4D4D" },
  descriptionSection: { marginBottom: 100 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  descriptionText: { lineHeight: 22, color: "#475569", fontSize: 15 },
  footer: {
    position: "absolute",
    bottom: 0,
    width: width,
    padding: 20,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  endBtn: {
    backgroundColor: "#FFF1F2",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  endBtnText: { color: "#E11D48", fontWeight: "800", fontSize: 16 },
});
