import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
  Modal,
  SafeAreaView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Camera, Save } from "lucide-react-native";
import LottieView from "lottie-react-native";
import { db } from "../config/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import * as Yup from "yup";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../components/ui/AppInput";
import { AppButton } from "../components/ui/AppButton";
import { theme } from "../theme/theme";
/* ---------- CATEGORY OPTIONS ---------- */
const CATEGORIES = [
  { label: "Food & Beverages", icon: "🍔" },
  { label: "Fashion", icon: "👕" },
  { label: "Electronics", icon: "📱" },
  { label: "Beauty & Wellness", icon: "💄" },
  { label: "Travel", icon: "✈️" },
  { label: "Services", icon: "🛠️" },
  { label: "Entertainment", icon: "🎬" },
  { label: "Other", icon: "🧩" },
];
const CATEGORY_LABELS = CATEGORIES.map((c) => c.label);

/* ---------- DELIVERY MODES ---------- */
const DELIVERY_MODES = [
  "Free Home Delivery",
  "Paid Home Delivery",
  "Pick from Store",
];

/* The above code is defining a schema using Yup for validating a deal object. It specifies the
validation rules for various properties of a deal such as title, description, category, original
price, discount price, minimum group size, expiry date, location, delivery mode, and delivery
charge. */
const dealSchema = Yup.object().shape({
  title: Yup.string()
    .required("Deal title is required")
    .min(5, "Title must be at least 5 characters"),
  description: Yup.string()
    .required("Description is required")
    .min(10, "Description must be at least 10 characters"),
  category: Yup.string().required("Please select a category"),
  categoryOther: Yup.string().when("category", {
    is: "Other",
    then: (schema) =>
      schema
        .required("Please specify the category")
        .min(2, "Category must be at least 2 characters"),
    otherwise: (schema) => schema.nullable(),
  }),
  originalPrice: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" ? undefined : value,
    )
    .typeError("Original price must be a number")
    .positive("Price must be greater than zero")
    .nullable(), // Allows the field to be empty
  discountPrice: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" ? undefined : value,
    )
    .typeError("Deal price must be a number")
    .required("Deal price is required")
    .positive("Price must be greater than zero")
    .test(
      "is-lower",
      "Deal price must be lower than original price",
      function (value) {
        const { originalPrice } = this.parent;
        // If originalPrice is not provided (null/undefined), the test passes.
        // If it IS provided, value must be less than originalPrice.
        return (
          originalPrice === undefined ||
          originalPrice === null ||
          value < originalPrice
        );
      },
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

/**
 * The `CreateDealScreen` function in React Native allows users to create, edit, or view deals with
 * input validation, image selection, and modal selection for categories and delivery modes.
 * @returns The `CreateDealScreen` component is being returned. This component contains a form for
 * creating or editing deals, including fields for deal title, description, prices, minimum buyers,
 * category, expiry date, location, delivery mode, and delivery charge. It also includes functionality
 * for image selection, validation, submission, and modals for selecting category and delivery mode.
 * Additionally, there are styles defined for the component
 */
export default function CreateDealScreen({ route, navigation }) {
  // 1. Detect if we are in Edit/View mode
  const deal = route.params?.deal;
  const isCompleted = deal?.status === "completed";
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);
  const isEditMode = !!deal && !isDuplicateMode;
  const isReadOnly = isCompleted && !isDuplicateMode;
  const isExpiryLocked = isReadOnly;

  // 2. Initialize state with deal data if it exists
  const initialCategory = deal?.category || "";
  const isCustomCategory =
    initialCategory && !CATEGORY_LABELS.includes(initialCategory);
  const [form, setForm] = useState({
    title: deal?.title || "",
    description: deal?.description || "",
    category: isCustomCategory ? "Other" : initialCategory,
    categoryOther: isCustomCategory ? initialCategory : "",
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

  /**
   * The function `handlePriceChange` takes a field and value as input, parses the value to a number,
   * updates the form with the cleaned value formatted as Indian Rupee, and calculates the original and
   * discounted prices.
   * @param field - Field is a string representing the name of the field or property in the form object
   * that is being updated with the new price value.
   * @param value - The `value` parameter in the `handlePriceChange` function represents the new value
   * that is being input for a specific field, such as the original price or discount price. This value
   * will be cleaned and validated before updating the form with the new price information.
   * @returns If the value passed to the `handlePriceChange` function is not a valid number, nothing
   * will be returned. The function will exit early without making any changes to the form state.
   */
  const handlePriceChange = (field, value) => {
    const clean = parseNumber(value);
    if (!/^\d*\.?\d*$/.test(clean)) return;

    const updated = { ...form, [field]: clean ? `₹${clean}` : "" };

    const original = Number(parseNumber(updated.originalPrice));
    const deal = Number(parseNumber(updated.discountPrice));

    setForm(updated);
  };

  /* ---------- MIN BUYERS ---------- */

  /**
   * The handleMinBuyersChange function removes non-numeric characters from the input value and updates
   * the minGroupSize property in the form state.
   * @param value - The `value` parameter in the `handleMinBuyersChange` function likely represents the
   * input value that is being passed when the function is called. In this case, it seems to be a string
   * that may contain non-numeric characters. The function uses a regular expression to remove any
   * non-numeric
   */
  const handleMinBuyersChange = (value) => {
    const clean = value.replace(/[^0-9]/g, "");
    setForm((p) => ({ ...p, minGroupSize: clean }));
  };

  /* ---------- IMAGE ---------- */

  /**
   * The function `pickImage` uses ImagePicker to launch the image library asynchronously and sets the
   * image URI if an image is selected.
   */
  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!res.canceled) setImage(res.assets[0].uri);
  };

  /* ---------- VALIDATION ---------- */

  /**
   * The function `validate` in JavaScript cleans and validates form data, handling errors and returning
   * a boolean based on validation success.
   * @returns The `validate` function is returning a boolean value - `true` if the data passes validation
   * and `false` if there are validation errors.
   */
  const validate = async () => {
    try {
      // Clean data before validation (removing currency symbols)
      const cleanData = {
        ...form,
        originalPrice: form.originalPrice
          ? Number(parseNumber(form.originalPrice))
          : null,
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

  /**
   * The function `handleSubmit` handles form submission by validating input, preparing data, and either
   * updating or adding a deal in a Firestore database.
   * @returns The `handleSubmit` function is returning a Promise because it is an asynchronous function
   * declared with the `async` keyword. The function will return a Promise that resolves to `undefined`
   * unless there is an explicit `return` statement within the function that returns a different value.
   */
  const handleSubmit = async () => {
    const isValid = await validate();
    if (!isValid) return;

    setLoading(true);
    try {
      // 1. Prepare the data object ONCE
      const resolvedCategory =
        form.category === "Other"
          ? form.categoryOther?.trim() || "Other"
          : form.category;
      const dealData = {
        ...form,
        category: resolvedCategory,
        originalPrice: Number(parseNumber(form.originalPrice)) || 0,
        discountPrice: Number(parseNumber(form.discountPrice)) || 0,
        minGroupSize: Number(form.minGroupSize) || 1,
        description: form.description || "", // Fixed typo from 'descrption'
        deliveryMode: form.deliveryMode,
        title: form.title,
        image: image || null,
        deliveryCharge:
          form.deliveryMode === "Paid Home Delivery"
            ? Number(parseNumber(form.deliveryCharge)) || 0
            : 0,
        updatedAt: serverTimestamp(),
      };

      // 2. Choose whether to UPDATE or ADD
      if (isEditMode) {
        // Use the existing deal ID passed from navigation
        const dealRef = doc(db, "deals", deal.id);
        await updateDoc(dealRef, dealData);
      } else {
        // Add new fields required for a fresh deal
        await addDoc(collection(db, "deals"), {
          ...dealData,
          createdAt: serverTimestamp(),
          currentJoins: 0,
          joinedUsers: 0,
          status: "active",
          viewsCount: 0,
          leftCount: 0,
          joinEventsCount: 0,
          avgJoinTimeSeconds: null,
          thresholdReachedAt: null,
          lastViewedAt: null,
        });
      }

      setShowSuccess(true);
    } catch (error) {
      console.error("Detailed Error:", error);
      Alert.alert("Publish Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */

  return (
    <SafeAreaView style={styles.screen}>
      {/* READ-ONLY BANNER */}
      {/* READ-ONLY BANNER */}
      {isCompleted && (
        <View style={styles.readOnlyBanner}>
          <View style={styles.bannerAccent} />
          <View style={styles.bannerContent}>
            {!isDuplicateMode && (
              <View style={styles.bannerHeader}>
                <Ionicons name="lock-closed" size={16} color="#92400e" />
                <Text style={styles.readOnlyBannerText}>
                  This deal has been completed. Editing is disabled; you may
                  create a duplicate deal.
                </Text>
              </View>
            )}

            <View
              style={[
                styles.bannerActions,
                isDuplicateMode && styles.bannerActionsCompact,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.bannerActionCard,
                  isDuplicateMode && styles.bannerActionCardCompact,
                ]}
                onPress={() => setIsDuplicateMode(true)}
              >
                <View style={styles.bannerActionContent}>
                  <View
                    style={[
                      styles.bannerActionIconBox,
                      isDuplicateMode && styles.bannerActionIconBoxCompact,
                    ]}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={isDuplicateMode ? 16 : 18}
                      color="#ffffff"
                    />
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.bannerActionTitle,
                        isDuplicateMode && styles.bannerActionTitleCompact,
                      ]}
                    >
                      Duplicate
                    </Text>
                    {!isDuplicateMode && (
                      <Text style={styles.bannerActionSub}>
                        Create an editable copy
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons
                  name="arrow-forward"
                  size={isDuplicateMode ? 16 : 18}
                  color="rgba(255,255,255,0.4)"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.bannerActionCard,
                  isDuplicateMode && styles.bannerActionCardCompact,
                ]}
                onPress={() => navigation.navigate("SellerDashboard")}
              >
                <View style={styles.bannerActionContent}>
                  <View
                    style={[
                      styles.bannerActionIconBox,
                      isDuplicateMode && styles.bannerActionIconBoxCompact,
                    ]}
                  >
                    <Ionicons
                      name="grid-outline"
                      size={isDuplicateMode ? 16 : 18}
                      color="#ffffff"
                    />
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.bannerActionTitle,
                        isDuplicateMode && styles.bannerActionTitleCompact,
                      ]}
                    >
                      Dashboard
                    </Text>
                    {!isDuplicateMode && (
                      <Text style={styles.bannerActionSub}>
                        Back to overview
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons
                  name="arrow-forward"
                  size={isDuplicateMode ? 16 : 18}
                  color="rgba(255,255,255,0.4)"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
        <AppInput
          label="Deal Title"
          placeholder="e.g. iPhone 15 Pro Max"
          value={form.title}
          editable={!isReadOnly}
          onChangeText={(v) => setForm({ ...form, title: v })}
          error={errors.title}
        />

        {/* DESCRIPTION */}
        <AppInput
          label="Description"
          placeholder="Describe the deal"
          multiline
          value={form.description}
          editable={!isReadOnly}
          onChangeText={(v) => setForm({ ...form, description: v })}
          error={errors.description}
        />

        {/* PRICES */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <AppInput
            containerStyle={{ flex: 1 }}
            label="Original Price"
            keyboardType="decimal-pad"
            placeholder="₹0.00"
            value={form.originalPrice}
            editable={!isReadOnly}
            onChangeText={(v) => handlePriceChange("originalPrice", v)}
            onBlur={() =>
              setForm((p) => ({
                ...p,
                originalPrice: formatINRWithCommas(p.originalPrice),
              }))
            }
          />

          <AppInput
            containerStyle={{ flex: 1 }}
            label="Deal Price"
            keyboardType="decimal-pad"
            placeholder="₹0.00"
            value={form.discountPrice}
            editable={!isReadOnly}
            onChangeText={(v) => handlePriceChange("discountPrice", v)}
            onBlur={() =>
              setForm((p) => ({
                ...p,
                discountPrice: formatINRWithCommas(p.discountPrice),
              }))
            }
            error={errors.discountPrice}
          />
        </View>

        {/* MIN BUYERS */}
        <AppInput
          label="Minimum Buyers"
          keyboardType="numeric"
          placeholder="Minimum 2 buyers"
          value={form.minGroupSize}
          editable={!isReadOnly}
          onChangeText={handleMinBuyersChange}
          error={errors.minGroupSize}
        />

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

        {form.category === "Other" && (
          <>
            <AppInput
              label="Other Category"
              placeholder="e.g. Home Appliances"
              value={form.categoryOther}
              editable={!isReadOnly}
              onChangeText={(v) => setForm((p) => ({ ...p, categoryOther: v }))}
              error={errors.categoryOther}
            />
          </>
        )}

        {/* EXPIRES AT */}
        <Text style={[styles.label, errors.expiresAt && styles.labelError]}>
          Expires At
        </Text>

        <View pointerEvents={isExpiryLocked ? "none" : "auto"}>
          <TouchableOpacity
            style={[
              styles.input,
              errors.expiresAt && styles.inputError,
              isExpiryLocked && styles.readOnlyInput, // Apply grey background here
            ]}
            // TouchableOpacity uses 'disabled', not 'editable'
            disabled={isExpiryLocked}
            onPress={() => setShowDatePicker(true)}
          >
            <Text
              style={isExpiryLocked ? { color: "#64748b" } : { color: "#000" }}
            >
              {form.expiresAt
                ? new Date(form.expiresAt).toDateString()
                : "Select expiry date"}
            </Text>
          </TouchableOpacity>
        </View>
        {errors.expiresAt && (
          <Text style={styles.error}>{errors.expiresAt}</Text>
        )}

        {showDatePicker && !isExpiryLocked && (
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
        <AppInput
          label="Location"
          placeholder="e.g. Mumbai, Andheri"
          value={form.location}
          editable={!isReadOnly}
          onChangeText={(v) => setForm({ ...form, location: v })}
          error={errors.location}
        />

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
            <AppInput
              label="Delivery Charge"
              keyboardType="decimal-pad"
              placeholder="₹0.00"
              value={form.deliveryCharge}
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
              error={errors.deliveryCharge}
            />
          </>
        )}

        {/* SUBMIT */}
        {/* Only show the button if NOT in Read Only mode */}
        {!isReadOnly && (
          <AppButton
            title="Publish Deal"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !!errors.discountPrice}
            leftIcon={<Save color="#fff" size={18} />}
            style={{ marginTop: 30 }}
          />
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
                  setForm((p) => ({
                    ...p,
                    category: c.label,
                    categoryOther: c.label === "Other" ? p.categoryOther : "",
                  }));
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
        <Modal transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.animationContainer}>
              <LottieView
                source={require("../../assets/animations/success-check.json")}
                autoPlay
                loop={false}
                // Set explicit dimensions here
                style={{ width: 200, height: 200 }}
                onAnimationFinish={() => {
                  setShowSuccess(false); // Close modal state
                  navigation.goBack();
                }}
              />
              <Text style={styles.successText}>Deal Published!</Text>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: Platform.OS === "android" ? 96 : 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 18,
    letterSpacing: 0.3,
    color: theme.colors.text,
  },
  label: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  error: { color: theme.colors.error, fontSize: 12, marginTop: 4 },
  imageBox: {
    height: 160,
    backgroundColor: "#f3f4f6",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  image: { width: "100%", height: "100%" },
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
    borderColor: theme.colors.error,
  },

  labelError: {
    color: theme.colors.error,
  },
  readOnlyInput: {
    backgroundColor: theme.colors.surfaceMuted, // Light grey
    color: theme.colors.textMuted, // Muted text color
    borderColor: "#d1d5db", // Subtle border
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)", // Dim the background
    justifyContent: "center",
    alignItems: "center",
  },
  animationContainer: {
    backgroundColor: "#FFF",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    elevation: 5,
  },
  successText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F172A",
  },
  readOnlyBanner: {
    backgroundColor: "#fff7ed", // Soft amber
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 32,
    marginHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f59e0b",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  bannerAccent: {
    width: 8,
    alignSelf: "stretch",
    backgroundColor: "#b45309",
    borderRadius: 4,
    marginRight: 12,
  },
  bannerContent: {
    flex: 1,
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  readOnlyBannerText: {
    color: "#92400e", // Dark amber text
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
    flexShrink: 1,
  },
  bannerActions: {
    flexDirection: "column",
    gap: 12,
    marginTop: 12,
  },
  bannerActionsCompact: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  bannerActionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F172A",
    padding: 14,
    borderRadius: 24,
    elevation: 6,
  },
  bannerActionCardCompact: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    elevation: 4,
  },
  bannerActionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerActionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  bannerActionIconBoxCompact: {
    width: 30,
    height: 30,
    borderRadius: 10,
    marginRight: 8,
  },
  bannerActionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  bannerActionTitleCompact: {
    fontSize: 12,
  },
  bannerActionSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
  },
});
