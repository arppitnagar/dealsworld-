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
import * as Yup from "yup";
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

const dealSchema = Yup.object().shape({
  title: Yup.string()
    .required("Deal title is required")
    .min(5, "Title must be at least 5 characters"),
  description: Yup.string()
    .required("Description is required")
    .min(10, "Description must be at least 10 characters"),
  category: Yup.string().required("Please select a category"),
  originalPrice: Yup.number()
    .typeError("Original price must be a number")
    .positive("Price must be greater than zero"),
  discountPrice: Yup.number()
    .typeError("Deal price must be a number")
    .required("Deal price is required")
    .positive("Price must be greater than zero")
    .lessThan(
      Yup.ref("originalPrice"),
      "Deal price must be lower than original price",
    ),
  minGroupSize: Yup.number()
    .required("Minimum buyers count is required")
    .min(2, "Minimum buyers must be at least 2"),
  expiresAt: Yup.date()
    .required("Expiry date is required")
    .min(new Date(), "Expiry date cannot be in the past"),
  location: Yup.string().required("Location is required"),
  deliveryMode: Yup.string().required("Delivery mode is required"),
  deliveryCharge: Yup.number().when("deliveryMode", {
    is: "Paid Home Delivery",
    then: (schema) =>
      schema
        .required("Delivery charge is required")
        .min(1, "Charge must be at least ₹1"),
    otherwise: (schema) => schema.nullable(),
  }),
});
export default function CreateDealScreen({ route, navigation }) {
  // 1. Detect if we are in Edit/View mode
  const deal = route.params?.deal;
  const isEditMode = !!deal;
  const isReadOnly = deal?.status === "completed";

  // 2. Initialize state with deal data if it exists
  const [form, setForm] = useState({
    title: deal?.title || "",
    description: deal?.description || "",
    category: deal?.category || "",
    deliveryMode: deal?.deliveryMode || "",
    deliveryCharge: deal?.deliveryCharge?.toString() || "",
    originalPrice: deal?.originalPrice?.toString() || "",
    discountPrice: deal?.discountPrice?.toString() || "",
    minGroupSize: deal?.minGroupSize?.toString() || "2",
    expiresAt: deal?.expiresAt?.toDate
      ? deal.expiresAt.toDate() // Firestore helper to get JS Date
      : deal?.expiresAt
        ? new Date(deal.expiresAt)
        : null,
    location: deal?.location || "",
    vendorid: deal?.vendorid || "vendor_001",
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

  const validate = async () => {
    try {
      // Clean data before validation (removing currency symbols)
      const cleanData = {
        ...form,
        originalPrice: Number(parseNumber(form.originalPrice)),
        discountPrice: Number(parseNumber(form.discountPrice)),
        deliveryCharge: form.deliveryCharge
          ? Number(parseNumber(form.deliveryCharge))
          : 0,
        minGroupSize: Number(form.minGroupSize),
      };

      await dealSchema.validate(cleanData, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err) {
      const newErrors = {};
      err.inner.forEach((error) => {
        newErrors[error.path] = error.message;
      });
      setErrors(newErrors);
      return false;
    }
  };

  /* ---------- SUBMIT ---------- */

  const handleSubmit = async () => {
    const isValid = await validate();
    if (!isValid) return;

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
      if (isEditMode) {
        await updateDoc(doc(db, "deals", deal.id), data);
      } else {
        await addDoc(collection(db, "deals"), {
          ...data,
          createdAt: serverTimestamp(),
          status: "active",
        });
      }
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
        <Text style={styles.heading}>
          {isReadOnly
            ? "View Deal"
            : isEditMode
              ? "Edit Deal"
              : "Create New Deal"}
        </Text>
        {/* IMAGE PICKER SECTION */}
        <TouchableOpacity
          style={[
            styles.imageBox,
            isReadOnly && { borderStyle: "solid", opacity: 0.8 },
          ]}
          onPress={pickImage}
          // This prevents the function from firing
          disabled={isReadOnly}
          activeOpacity={isReadOnly ? 1 : 0.7}
        >
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
          style={[
            styles.input,
            errors.title && styles.inputError,
            isReadOnly && styles.readOnlyInput,
          ]}
          placeholder="e.g. iPhone 15 Pro Max"
          value={form.title}
          // This is the core logic change
          editable={!isReadOnly}
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
            // Add a grey background style if read-only
            isReadOnly && styles.readOnlyInput,
          ]}
          placeholder="Describe the deal"
          multiline
          value={form.description}
          // This is the core logic change
          editable={!isReadOnly}
          onChangeText={(v) => setForm({ ...form, description: v })}
        />
        {errors.description && (
          <Text style={styles.error}>{errors.description}</Text>
        )}

        {/* PRICES */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.label,
                // Add a grey background style if read-only
                isReadOnly && styles.readOnlyInput,
              ]}
            >
              Original Price
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="₹0.00"
              value={form.originalPrice}
              // This is the core logic change
              editable={!isReadOnly}
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
              style={[
                styles.input,
                errors.discountPrice && styles.inputError,
                ,
                // Add a grey background style if read-only
                isReadOnly && styles.readOnlyInput,
              ]}
              keyboardType="decimal-pad"
              placeholder="₹0.00"
              value={form.discountPrice}
              // This is the core logic change
              editable={!isReadOnly}
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
          style={[
            styles.input,
            errors.minGroupSize && styles.inputError,
            // Add a grey background style if read-only
            isReadOnly && styles.readOnlyInput,
          ]}
          keyboardType="numeric"
          placeholder="Minimum 2 buyers"
          value={form.minGroupSize}
          // This is the core logic change
          editable={!isReadOnly}
          onChangeText={handleMinBuyersChange}
        />
        {errors.minGroupSize && (
          <Text style={styles.error}>{errors.minGroupSize}</Text>
        )}

        {/* CATEGORY */}
        <Text style={[styles.label, errors.category && styles.labelError]}>
          Category
        </Text>

        {/* Wrap the TouchableOpacity inside this View */}
        <View pointerEvents={isReadOnly ? "none" : "auto"}>
          <TouchableOpacity
            style={[
              styles.input,
              errors.category && styles.inputError,
              isReadOnly && styles.readOnlyInput,
            ]}
            // Use 'disabled' for TouchableOpacity, not 'editable'
            disabled={isReadOnly}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Text style={isReadOnly ? { color: "#64748b" } : { color: "#000" }}>
              {form.category || "Select category"}
            </Text>
          </TouchableOpacity>
        </View>

        {errors.category && <Text style={styles.error}>{errors.category}</Text>}
        {errors.category && <Text style={styles.error}>{errors.category}</Text>}

        {/* EXPIRES AT */}
        {/* EXPIRES AT */}
        <Text style={[styles.label, errors.expiresAt && styles.labelError]}>
          Expires At
        </Text>

        <View pointerEvents={isReadOnly ? "none" : "auto"}>
          <TouchableOpacity
            style={[
              styles.input,
              errors.expiresAt && styles.inputError,
              isReadOnly && styles.readOnlyInput, // Apply grey background here
            ]}
            // TouchableOpacity uses 'disabled', not 'editable'
            disabled={isReadOnly}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={isReadOnly ? { color: "#64748b" } : { color: "#000" }}>
              {form.expiresAt
                ? new Date(form.expiresAt).toDateString()
                : "Select expiry date"}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && !isReadOnly && (
          <DateTimePicker
            value={form.expiresAt instanceof Date ? form.expiresAt : new Date()}
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
          style={[
            styles.input,
            errors.location && styles.inputError, // Add a grey background style if read-only
            isReadOnly && styles.readOnlyInput,
          ]}
          placeholder="e.g. Mumbai, Andheri"
          value={form.location}
          // This is the core logic change
          editable={!isReadOnly}
          onChangeText={(v) => setForm({ ...form, location: v })}
        />
        {errors.location && <Text style={styles.error}>{errors.location}</Text>}

        {/* DELIVERY MODE */}
        <Text style={[styles.label, errors.deliveryMode && styles.labelError]}>
          Delivery Mode
        </Text>

        <View pointerEvents={isReadOnly ? "none" : "auto"}>
          <TouchableOpacity
            style={[
              styles.input,
              errors.deliveryMode && styles.inputError,
              isReadOnly && styles.readOnlyInput, // Grey background for the box
            ]}
            // TouchableOpacity uses 'disabled' instead of 'editable'
            disabled={isReadOnly}
            onPress={() => setDeliveryModalVisible(true)}
          >
            <Text style={isReadOnly ? { color: "#64748b" } : { color: "#000" }}>
              {form.deliveryMode || "Select delivery mode"}
            </Text>
          </TouchableOpacity>
        </View>

        {errors.deliveryMode && (
          <Text style={styles.error}>{errors.deliveryMode}</Text>
        )}

        {/* DELIVERY CHARGE (ONLY FOR PAID DELIVERY) */}
        {form.deliveryMode === "Paid Home Delivery" && (
          <>
            <Text style={styles.label}>Delivery Charge</Text>
            <TextInput
              style={[
                styles.input, // Add a grey background style if read-only
                isReadOnly && styles.readOnlyInput,
              ]}
              keyboardType="decimal-pad"
              placeholder="₹0.00"
              value={form.deliveryCharge}
              // This is the core logic change
              editable={!isReadOnly}
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
        {/* Only show the button if NOT in Read Only mode */}
        {!isReadOnly && (
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
        )}
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
  readOnlyInput: {
    backgroundColor: "#f3f4f6", // Light grey
    color: "#6b7280", // Muted text color
    borderColor: "#d1d5db", // Subtle border
  },
});
