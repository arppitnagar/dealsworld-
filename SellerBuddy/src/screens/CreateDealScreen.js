import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera, Save } from "lucide-react-native";
import LottieView from "lottie-react-native";

export default function CreateDealScreen({ navigation }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Electronics",
    discountPrice: "",
    originalPrice: "",
    minThreshold: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [image, setImage] = useState(null);

  /* ---------------- Currency (INR) ---------------- */
  // 1. Improved INR Formatter
  const formatINR = (value) => {
    // Remove everything that isn't a digit
    const cleanValue = value.replace(/\D/g, "");

    if (!cleanValue) return "";

    // Convert to number
    const numberValue = parseFloat(cleanValue);

    // Use Indian Locale for formatting (e.g., 1,00,000 instead of 100,000)
    const formatted = new Intl.NumberFormat("en-IN").format(numberValue);

    return `₹${formatted}`;
  };

  const formatCurrency = (value) => {
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue) return "";

    // To make "3" = "$3.00", we treat the cleanValue as the total cents
    // If you want "3" to stay "3", we remove the division by 100
    const amount = parseFloat(cleanValue).toFixed(2);
    return `$${amount.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  const handlePriceChange = (field, value) => {
    // If the user deletes everything, reset to empty string immediately
    if (value === "" || value === "₹") {
      setForm({ ...form, [field]: "" });
      return;
    }

    const formatted = formatINR(value);
    setForm({ ...form, [field]: formatted });
  };

  /* ---------------- Validation ---------------- */

  const validateForm = () => {
    let newErrors = {};

    if (!form.title.trim()) {
      newErrors.title = "Product title is required";
    }

    const dealPrice = parseFloat(form.discountPrice.replace(/[₹,]/g, ""));
    const originalPrice = parseFloat(form.originalPrice.replace(/[₹,]/g, ""));

    if (isNaN(dealPrice) || dealPrice <= 0) {
      newErrors.discountPrice = "Enter a valid deal price";
    }

    if (!isNaN(originalPrice) && dealPrice >= originalPrice) {
      newErrors.discountPrice = "Deal price must be less than original price";
    }

    if (!form.minThreshold || parseInt(form.minThreshold) < 2) {
      newErrors.minThreshold = "Minimum 2 buyers required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ---------------- Image Picker (Optional) ---------------- */

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setImage(base64Image);
    }
  };

  /* ---------------- Submit ---------------- */

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        discountPrice: parseFloat(form.discountPrice.replace(/[₹,]/g, "")),
        originalPrice: parseFloat(form.originalPrice.replace(/[₹,]/g, "")),
        minThreshold: parseInt(form.minThreshold),
        imageUrl: image || null, // OPTIONAL
        createdAt: new Date().toISOString(),
      };

      // 🔥 Replace with API / Firebase call
      await new Promise((r) => setTimeout(r, 1500));

      setShowSuccess(true);
    } catch (e) {
      Alert.alert("Error", e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const ErrorMessage = ({ message }) =>
    message ? <Text style={styles.errorText}>{message}</Text> : null;

  /* ---------------- UI ---------------- */

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.heading}>Create New Deal</Text>

        {/* Image Upload (Optional) */}
        <TouchableOpacity
          onPress={pickImage}
          style={styles.imageBox}
          activeOpacity={0.8}
        >
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={{ alignItems: "center" }}>
              <Camera size={40} color="#9ca3af" />
              <Text style={{ color: "#9ca3af", marginTop: 6 }}>
                Upload Product Image (Optional)
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.label}>Product Title</Text>
        <TextInput
          placeholder="e.g. iPhone 15 Pro Max"
          style={[styles.input, errors.title && styles.inputError]}
          value={form.title}
          onChangeText={(val) => setForm({ ...form, title: val })}
        />
        <ErrorMessage message={errors.title} />

        {/* Original Price */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View className="flex-1">
            <Text style={styles.label}>Original Price</Text>
            <TextInput
              placeholder="₹01"
              keyboardType="numeric"
              className="bg-gray-50 p-4 rounded-xl border border-gray-200"
              value={form.originalPrice}
              onChangeText={(val) => handlePriceChange("originalPrice", val)}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Deal Price</Text>
            <TextInput
              placeholder="₹0.00"
              keyboardType="numeric"
              style={[styles.input, errors.discountPrice && styles.inputError]}
              value={form.discountPrice}
              onChangeText={(val) => handlePriceChange("discountPrice", val)}
            />
            <ErrorMessage message={errors.discountPrice} />
          </View>
        </View>

        {/* Min Buyers */}
        <Text style={styles.label}>Minimum Group Size</Text>
        <TextInput
          placeholder="Minimum buyers required"
          keyboardType="numeric"
          style={[styles.input, errors.minThreshold && styles.inputError]}
          value={form.minThreshold}
          onChangeText={(val) => setForm({ ...form, minThreshold: val })}
        />
        <ErrorMessage message={errors.minThreshold} />

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.submitBtn, loading && { backgroundColor: "#9ca3af" }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Save size={20} color="#fff" />
              <Text style={styles.submitText}>Publish Deal</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Success Modal */}
      {showSuccess && (
        <Modal transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.successCard}>
              <LottieView
                source={require("../../assets/animations/success-check.json")}
                autoPlay
                loop={false}
                style={{ width: 180, height: 180 }}
                onAnimationFinish={() => {
                  setShowSuccess(false);
                  navigation.goBack();
                }}
              />
              <Text style={styles.successText}>Deal Published!</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    color: "#111827",
  },
  label: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
  },
  imageBox: {
    height: 180,
    backgroundColor: "#f3f4f6",
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  submitBtn: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#2563eb",
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  successCard: {
    backgroundColor: "#fff",
    padding: 40,
    borderRadius: 30,
    alignItems: "center",
    width: "80%",
  },
  successText: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 10,
    color: "#111827",
  },
});
