import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { db } from "../config/firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function EditDealScreen({ route, navigation }) {
  const { deal } = route.params;
  const isReadOnly = deal.status === "completed"; // Logic change: define read-only mode

  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(deal.image);
  const [formData, setFormData] = useState({
    title: deal.title || "",
    category: deal.category || "",
    description: deal.description || "",
    minThreshold: deal.minThreshold?.toString() || "1",
    discountPrice: deal.discountPrice?.toString() || "0",
  });

  const pickImage = async () => {
    if (isReadOnly) return; // Prevent picking if read-only

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need permissions to upload images.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const dealRef = doc(db, "deals", deal.id);
      await updateDoc(dealRef, {
        ...formData,
        image: image,
        minThreshold: parseInt(formData.minThreshold),
        discountPrice: parseFloat(formData.discountPrice),
        updatedAt: new Date(),
      });

      Alert.alert("Success", "Deal updated!", [
        { text: "OK", onPress: () => navigation.pop(2) },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to update deal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isReadOnly ? "View Deal" : "Edit Deal"}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Deal Image</Text>
        <TouchableOpacity
          style={[styles.imagePicker, isReadOnly && { borderStyle: "solid" }]}
          onPress={pickImage}
          activeOpacity={isReadOnly ? 1 : 0.7}
        >
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={32} color="#94A3B8" />
              <Text style={styles.imagePlaceholderText}>No Image</Text>
            </View>
          )}
          {!isReadOnly && (
            <View style={styles.editIconBadge}>
              <Ionicons name="pencil" size={14} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Deal Title</Text>
        <TextInput
          style={[styles.input, isReadOnly && styles.readOnlyInput]}
          value={formData.title}
          editable={!isReadOnly}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          style={[styles.input, isReadOnly && styles.readOnlyInput]}
          value={formData.category}
          editable={!isReadOnly}
          onChangeText={(text) => setFormData({ ...formData, category: text })}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Min Joins</Text>
            <TextInput
              style={[styles.input, isReadOnly && styles.readOnlyInput]}
              value={formData.minThreshold}
              editable={!isReadOnly}
              keyboardType="numeric"
              onChangeText={(text) =>
                setFormData({ ...formData, minThreshold: text })
              }
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Price</Text>
            <TextInput
              style={[styles.input, isReadOnly && styles.readOnlyInput]}
              value={formData.discountPrice}
              editable={!isReadOnly}
              keyboardType="numeric"
              onChangeText={(text) =>
                setFormData({ ...formData, discountPrice: text })
              }
            />
          </View>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            isReadOnly && styles.readOnlyInput,
          ]}
          value={formData.description}
          editable={!isReadOnly}
          multiline
          numberOfLines={4}
          onChangeText={(text) =>
            setFormData({ ...formData, description: text })
          }
        />

        {!isReadOnly && (
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: "700", color: "#64748B", marginBottom: 8 },
  imagePicker: {
    width: "100%",
    height: 180,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center" },
  imagePlaceholderText: { color: "#94A3B8", marginTop: 8, fontWeight: "600" },
  editIconBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#7C3AED",
    padding: 8,
    borderRadius: 20,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: "#0F172A",
    marginBottom: 20,
  },
  readOnlyInput: {
    backgroundColor: "#F1F5F9",
    color: "#64748B",
    borderColor: "#CBD5E1",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  textArea: { height: 100, textAlignVertical: "top" },
  saveBtn: {
    backgroundColor: "#7C3AED",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  saveBtnText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
});
