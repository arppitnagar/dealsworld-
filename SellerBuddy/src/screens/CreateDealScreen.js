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
import DateTimePicker from "@react-native-community/datetimepicker";
import { Camera, Save } from "lucide-react-native";
import LottieView from "lottie-react-native";
import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/* ---------- CATEGORY OPTIONS ---------- */
const CATEGORIES = [
  { label: "Food & Beverages", icon: "🍔" },
  { label: "Fashion", icon: "👕" },
  { label: "Electronics", icon: "📱" },
  { label: "Beauty & Wellness", icon: "💄" },
  { label: "Travel", icon: "✈️" },
  { label: "Services", icon: "🛠️" },
  { label: "Entertainment", icon: "🎬" },
];

/* ---------- DELIVERY MODES ---------- */
const DELIVERY_MODES = [
  "Free Home Delivery",
  "Paid Home Delivery",
  "Pick from Store",
];

export default function CreateDealScreen({ navigation }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    deliveryMode: "",
    deliveryCharge: "", //
    originalPrice: "",
    discountPrice: "",
    minGroupSize: "2",
    expiresAt: null,
    location: "",
    vendorid: "vendor_001",
  });

  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [priceError, setPriceError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);

  /* ---------- PRICE HELPERS ---------- */

  const parseNumber = (v) => v.replace(/[₹,]/g, "");

  const formatINRWithCommas = (value) => {
    if (!value) return "";
    const num = Number(parseNumber(value));
    if (isNaN(num)) return "";
    return `₹${num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handlePriceChange = (field, value) => {
    const clean = parseNumber(value);
    if (!/^\d*\.?\d*$/.test(clean)) return;

    const updated = { ...form, [field]: clean ? `₹${clean}` : "" };

    const original = Number(parseNumber(updated.originalPrice));
    const deal = Number(parseNumber(updated.discountPrice));

    if (original && deal && deal > original) {
      setPriceError("Deal price cannot exceed original price");
    } else {
      setPriceError("");
    }

    setForm(updated);
  };

  /* ---------- MIN BUYERS ---------- */

  const handleMinBuyersChange = (value) => {
    const clean = value.replace(/[^0-9]/g, "");
    setForm((p) => ({ ...p, minGroupSize: clean }));
  };

  /* ---------- IMAGE ---------- */

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

    if (!form.title) e.title = "Deal title required";
    if (!form.description || form.description.length < 10)
      e.description = "Minimum 10 characters required";
    if (!form.category) e.category = "Select a category";
    if (!form.deliveryMode) e.deliveryMode = "Delivery mode is required";
    if (!form.discountPrice) e.discountPrice = "Deal price required";
    if (!form.location) e.location = "Location required";
    if (!form.expiresAt) e.expiresAt = "Expiry date required";
    if (form.deliveryMode === "Paid Home Delivery" && !form.deliveryCharge) {
      e.deliveryCharge = "Delivery charge is required";
    }

    const buyers = Number(form.minGroupSize);
    if (!buyers || buyers < 2)
      e.minGroupSize = "Minimum buyers must be at least 2";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ---------- SUBMIT ---------- */

  const handleSubmit = async () => {
    if (!validate() || priceError) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "deals"), {
        ...form,
        originalPrice: Number(parseNumber(form.originalPrice)),
        discountPrice: Number(parseNumber(form.discountPrice)),
        minGroupSize: Number(form.minGroupSize),
        descrption: form.description,
        deliveryMode: form.deliveryMode,
        title: form.title,
        image,
        createdAt: serverTimestamp(),
        status: "active",
        deliveryCharge:
          form.deliveryMode === "Paid Home Delivery"
            ? Number(parseNumber(form.deliveryCharge))
            : 0,
        minGroupSize: Number(form.minGroupSize),
      });
      setShowSuccess(true);
    } catch {
      Alert.alert("Error", "Failed to publish deal");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */

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
        <Text style={[styles.label, errors.title && styles.labelError]}>
          Deal Title
        </Text>
        <TextInput
          style={[styles.input, errors.title && styles.inputError]}
          placeholder="e.g. iPhone 15 Pro Max"
          value={form.title}
          onChangeText={(v) => setForm({ ...form, title: v })}
        />
        {errors.title && <Text style={styles.error}>{errors.title}</Text>}

        {/* DESCRIPTION */}
        <Text style={[styles.label, errors.description && styles.labelError]}>
          Description
        </Text>
        <TextInput
          style={[
            styles.input,
            { height: 100 },
            errors.description && styles.inputError,
          ]}
          placeholder="Describe the deal"
          multiline
          value={form.description}
          onChangeText={(v) => setForm({ ...form, description: v })}
        />
        {errors.description && (
          <Text style={styles.error}>{errors.description}</Text>
        )}

        {/* PRICES */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Original Price</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="₹0.00"
              value={form.originalPrice}
              onChangeText={(v) => handlePriceChange("originalPrice", v)}
              onBlur={() =>
                setForm((p) => ({
                  ...p,
                  originalPrice: formatINRWithCommas(p.originalPrice),
                }))
              }
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[styles.label, errors.discountPrice && styles.labelError]}
            >
              Deal Price
            </Text>
            <TextInput
              style={[styles.input, errors.discountPrice && styles.inputError]}
              keyboardType="decimal-pad"
              placeholder="₹0.00"
              value={form.discountPrice}
              onChangeText={(v) => handlePriceChange("discountPrice", v)}
              onBlur={() =>
                setForm((p) => ({
                  ...p,
                  discountPrice: formatINRWithCommas(p.discountPrice),
                }))
              }
            />
            {priceError && <Text style={styles.error}>{priceError}</Text>}
          </View>
        </View>

        {/* MIN BUYERS */}
        <Text style={[styles.label, errors.minGroupSize && styles.labelError]}>
          Minimum Buyers
        </Text>
        <TextInput
          style={[styles.input, errors.minGroupSize && styles.inputError]}
          keyboardType="numeric"
          placeholder="Minimum 2 buyers"
          value={form.minGroupSize}
          onChangeText={handleMinBuyersChange}
        />
        {errors.minGroupSize && (
          <Text style={styles.error}>{errors.minGroupSize}</Text>
        )}

        {/* CATEGORY */}
        <Text style={[styles.label, errors.category && styles.labelError]}>
          Category
        </Text>
        <TouchableOpacity
          style={[styles.input, errors.category && styles.inputError]}
          onPress={() => setCategoryModalVisible(true)}
        >
          <Text>{form.category || "Select category"}</Text>
        </TouchableOpacity>
        {errors.category && <Text style={styles.error}>{errors.category}</Text>}

        {/* EXPIRES AT */}
        <Text style={[styles.label, errors.expiresAt && styles.labelError]}>
          Expires At
        </Text>
        <TouchableOpacity
          style={[styles.input, errors.expiresAt && styles.inputError]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text>
            {form.expiresAt
              ? new Date(form.expiresAt).toDateString()
              : "Select expiry date"}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={form.expiresAt || new Date()}
            mode="date"
            display="default"
            onChange={(e, d) => {
              setShowDatePicker(false);
              if (d) setForm({ ...form, expiresAt: d });
            }}
          />
        )}

        {/* LOCATION */}
        <Text style={[styles.label, errors.location && styles.labelError]}>
          Location
        </Text>
        <TextInput
          style={[styles.input, errors.location && styles.inputError]}
          placeholder="e.g. Mumbai, Andheri"
          value={form.location}
          onChangeText={(v) => setForm({ ...form, location: v })}
        />
        {errors.location && <Text style={styles.error}>{errors.location}</Text>}
        {/* DELIVERY MODE */}
        <Text style={[styles.label, errors.deliveryMode && styles.labelError]}>
          Delivery Mode
        </Text>
        <TouchableOpacity
          style={[styles.input, errors.deliveryMode && styles.inputError]}
          onPress={() => setDeliveryModalVisible(true)}
        >
          <Text>{form.deliveryMode || "Select delivery mode"}</Text>
        </TouchableOpacity>
        {errors.deliveryMode && (
          <Text style={styles.error}>{errors.deliveryMode}</Text>
        )}

        {/* DELIVERY CHARGE (ONLY FOR PAID DELIVERY) */}
        {form.deliveryMode === "Paid Home Delivery" && (
          <>
            <Text style={styles.label}>Delivery Charge</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="₹0.00"
              value={form.deliveryCharge}
              onChangeText={(v) =>
                setForm({ ...form, deliveryCharge: v.replace(/[₹,]/g, "") })
              }
              onBlur={() =>
                setForm((p) => ({
                  ...p,
                  deliveryCharge: formatINRWithCommas(p.deliveryCharge),
                }))
              }
            />
            {errors.deliveryCharge && (
              <Text style={styles.error}>{errors.deliveryCharge}</Text>
            )}
          </>
        )}

        {/* SUBMIT */}
        <TouchableOpacity
          style={[
            styles.submit,
            (loading || priceError) && { backgroundColor: "#9ca3af" },
          ]}
          disabled={loading || !!priceError}
          onPress={handleSubmit}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Save color="#fff" size={18} />
              <Text style={styles.submitText}>Publish Deal</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* CATEGORY MODAL */}
      <Modal transparent visible={categoryModalVisible}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.label}
                style={styles.categoryRow}
                onPress={() => {
                  setForm({ ...form, category: c.label });
                  setCategoryModalVisible(false);
                }}
              >
                <Text style={{ fontSize: 22 }}>{c.icon}</Text>
                <Text style={{ marginLeft: 12 }}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* DELIVERY MODE MODAL */}
      <Modal transparent visible={deliveryModalVisible}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            {DELIVERY_MODES.map((mode) => (
              <TouchableOpacity
                key={mode}
                style={styles.categoryRow}
                onPress={() => {
                  setForm({
                    ...form,
                    deliveryMode: mode,
                    deliveryCharge:
                      mode === "Paid Home Delivery" ? form.deliveryCharge : "",
                  });
                  setDeliveryModalVisible(false);
                }}
              >
                <Text>{mode}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* SUCCESS */}
      {showSuccess && (
        <Modal transparent>
          <View style={styles.overlay}>
            <LottieView
              source={require("../../assets/animations/success-check.json")}
              autoPlay
              loop={false}
              onAnimationFinish={() => navigation.goBack()}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  label: { marginTop: 12, fontSize: 12, color: "#6b7280" },
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
    padding: 24,
    borderRadius: 20,
    width: "80%",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  inputError: {
    borderColor: "#ef4444",
  },

  labelError: {
    color: "#ef4444",
  },
});
