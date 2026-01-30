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
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Camera, Save } from "lucide-react-native";
import LottieView from "lottie-react-native";

export default function CreateDealScreen({ navigation }) {
  const [form, setForm] = useState({
    title: "",
    originalPrice: "",
    discountPrice: "",
    minThreshold: "",
  });

  const [expiresAt, setExpiresAt] = useState(null);
  const [location, setLocation] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [priceError, setPriceError] = useState("");

  /* ---------- PRICE HANDLER (DECIMAL SAFE) ---------- */
  const handlePriceChange = (field, value) => {
    let clean = value.replace(/[₹,]/g, "");

    // allow only numbers + one decimal
    if (!/^\d*\.?\d*$/.test(clean)) return;

    const updatedForm = {
      ...form,
      [field]: clean ? `₹${clean}` : "",
    };

    const original =
      field === "originalPrice"
        ? parseFloat(clean)
        : parseFloat(updatedForm.originalPrice?.replace(/[₹,]/g, "") || 0);

    const deal =
      field === "discountPrice"
        ? parseFloat(clean)
        : parseFloat(updatedForm.discountPrice?.replace(/[₹,]/g, "") || 0);

    if (original && deal && deal > original) {
      setPriceError("Deal price cannot be greater than original price");
    } else {
      setPriceError("");
    }

    setForm(updatedForm);
  };
  const formatINRWithCommas = (value) => {
    if (!value) return "";

    const num = Number(value.replace(/[₹,]/g, ""));
    if (isNaN(num)) return "";

    return `₹${num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };
  const handleIntegerChange = (value, setter) => {
    // Allow only digits
    const clean = value.replace(/[^0-9]/g, "");
    setter(clean);
  };
  /* ---------- IMAGE PICKER ---------- */
  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!res.canceled) setImage(res.assets[0].uri);
  };

  /* ---------- VALIDATION ---------- */
  const validate = () => {
    let e = {};
    if (!form.title) e.title = "Title required";
    if (!location) e.location = "Location required";
    if (!expiresAt) e.expiresAt = "Expiry date required";
    if (!form.discountPrice) e.discountPrice = "Deal price required";
    if (!form.minThreshold || Number(form.minThreshold) < 2)
      e.minThreshold = "Minimum 2 buyers";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ---------- SUBMIT ---------- */
  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        location,
        expiresAt,
        discountPrice: Number(form.discountPrice),
        originalPrice: Number(form.originalPrice),
        minThreshold: Number(form.minThreshold),
        image,
        createdAt: new Date().toISOString(),
      };

      console.log("PAYLOAD", payload);
      await new Promise((r) => setTimeout(r, 1200));
      setShowSuccess(true);
    } catch {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.heading}>Create New Deal</Text>

        {/* IMAGE */}
        <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <Camera size={40} color="#9ca3af" />
          )}
        </TouchableOpacity>

        {/* TITLE */}
        <Text style={styles.label}>Product Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. iPhone 15 Pro Max"
          value={form.title}
          onChangeText={(v) => setForm({ ...form, title: v })}
        />
        {errors.title && <Text style={styles.error}>{errors.title}</Text>}

        {/* PRICES (2 COLUMNS) */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Original Price</Text>
            <TextInput
              placeholder="₹0.00"
              keyboardType="decimal-pad"
              style={styles.input}
              value={form.originalPrice}
              onChangeText={(v) => handlePriceChange("originalPrice", v)}
              onBlur={() =>
                setForm((prev) => ({
                  ...prev,
                  originalPrice: formatINRWithCommas(prev.originalPrice),
                }))
              }
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Deal Price</Text>
            <TextInput
              placeholder="₹0.00"
              keyboardType="decimal-pad"
              style={styles.input}
              value={form.discountPrice}
              onChangeText={(v) => handlePriceChange("discountPrice", v)}
              onBlur={() =>
                setForm((prev) => ({
                  ...prev,
                  discountPrice: formatINRWithCommas(prev.discountPrice),
                }))
              }
            />
            {errors.discountPrice && (
              <Text style={styles.error}>{errors.discountPrice}</Text>
            )}
            {priceError ? <Text style={styles.error}>{priceError}</Text> : null}
          </View>
        </View>

        {/* MIN BUYERS */}
        <Text style={styles.label}>Minimum Buyers</Text>
        <TextInput
          keyboardType="numeric"
          placeholder="e.g. 5"
          style={styles.input}
          value={form.minThreshold}
          onChangeText={(v) =>
            handleIntegerChange(v, (val) =>
              setForm({ ...form, minThreshold: val }),
            )
          }
        />
        {errors.minThreshold && (
          <Text style={styles.error}>{errors.minThreshold}</Text>
        )}

        {/* EXPIRES AT (ANDROID SAFE) */}
        <Text style={styles.label}>Expires At</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: expiresAt ? "#111827" : "#9ca3af" }}>
            {expiresAt
              ? new Date(expiresAt).toDateString()
              : "Select expiry date"}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={expiresAt ? new Date(expiresAt) : new Date()}
            mode="date" // ← IMPORTANT
            display="default"
            onChange={(e, d) => {
              setShowDatePicker(false);
              if (d) setExpiresAt(d.toISOString());
            }}
          />
        )}

        {/* LOCATION */}
        <Text style={styles.label}>Location</Text>
        <TextInput
          placeholder="e.g. Mumbai, Andheri West"
          style={styles.input}
          value={location}
          onChangeText={setLocation}
        />
        {errors.location && <Text style={styles.error}>{errors.location}</Text>}

        {/* SUBMIT */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !!priceError}
          style={[
            styles.submit,
            (loading || priceError) && { backgroundColor: "#9ca3af" },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Save size={18} color="#fff" />
              <Text style={styles.submitText}>Publish Deal</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* SUCCESS */}
      {showSuccess && (
        <Modal transparent>
          <View style={styles.overlay}>
            <View style={styles.card}>
              <LottieView
                source={require("../../assets/animations/success-check.json")}
                autoPlay
                loop={false}
                style={{ width: 160, height: 160 }}
                onAnimationFinish={() => {
                  setShowSuccess(false);
                  navigation.goBack();
                }}
              />
              <Text style={{ fontWeight: "700" }}>Deal Published!</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  label: { marginTop: 12, color: "#6b7280", fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
  },
  error: { color: "#ef4444", fontSize: 12, marginTop: 4 },
  imageBox: {
    height: 160,
    backgroundColor: "#f3f4f6",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  image: { width: "100%", height: "100%" },
  submit: {
    backgroundColor: "#2563eb",
    marginTop: 30,
    padding: 16,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  submitText: { color: "#fff", fontWeight: "700" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    padding: 40,
    borderRadius: 24,
    alignItems: "center",
  },
});
