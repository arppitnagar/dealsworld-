import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Modal,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Save } from "lucide-react-native";
import LottieView from "lottie-react-native";
import { db } from "../config/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import apiClient from "../api/client";
import * as Yup from "yup";
import { Ionicons } from "@expo/vector-icons";
import {
  AppButton,
  useTheme,
  getFormStyles,
  DealFormFields,
  TopPageHeader,
  validatePricingTiers,
  MAX_PRICING_TIERS,
  DEAL_CATEGORIES,
  DEAL_CATEGORY_LABELS,
} from "@dealsworld/shared";
import { useAddresses } from "../hooks/useAddresses";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
/* ---------- CATEGORY OPTIONS ---------- */
const CATEGORIES = DEAL_CATEGORIES;
const CATEGORY_LABELS = DEAL_CATEGORY_LABELS;

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
const trimString = (value) =>
  typeof value === "string" ? value.trim() : value;

const dealSchema = Yup.object().shape({
  title: Yup.string()
    .transform(trimString)
    .required("Deal title is required")
    .min(5, "Title must be at least 5 characters"),
  description: Yup.string()
    .transform(trimString)
    .required("Description is required")
    .min(10, "Description must be at least 10 characters"),
  category: Yup.string().required("Please select a category"),
  categoryOther: Yup.string()
    .transform(trimString)
    .when("category", {
      is: "Other",
      then: (schema) =>
        schema
          .required("Please specify the category")
          .min(2, "Category must be at least 2 characters"),
      otherwise: (schema) => schema.nullable(),
    }),
  originalPrice: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" ||
      originalValue === null ||
      originalValue === undefined
        ? undefined
        : value,
    )
    .typeError("Original price must be a number")
    .required("Original price is required")
    .moreThan(0, "Original price must be greater than zero"),
  discountPrice: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" ||
      originalValue === null ||
      originalValue === undefined
        ? undefined
        : value,
    )
    .typeError("Deal price must be a number")
    .required("Deal price is required")
    .moreThan(0, "Deal price must be greater than zero")
    .test(
      "is-lower",
      "Deal price must be lower than original price",
      function (value) {
        const { originalPrice } = this.parent;
        if (!Number.isFinite(Number(value))) return true;
        if (!Number.isFinite(Number(originalPrice))) return true;
        return Number(value) < Number(originalPrice);
      },
    ),
  minGroupSize: Yup.number()
    .required("Minimum buyers count is required")
    .min(2, "Minimum buyers must be at least 2"),
  maxGroupSize: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null || originalValue === undefined
        ? undefined
        : value,
    )
    .typeError("Max buyers must be a number")
    .nullable()
    .test(
      "gte-min",
      "Max buyers must be greater than or equal to minimum buyers",
      function (value) {
        if (value === undefined || value === null) return true;
        const { minGroupSize } = this.parent;
        if (!Number.isFinite(Number(minGroupSize))) return true;
        return Number(value) >= Number(minGroupSize);
      },
    ),
  expiresAt: Yup.date()
    .required("Expiry date is required")
    .min(new Date(), "Expiry date cannot be in the past"),
  location: Yup.string().transform(trimString).required("Location is required"),
  deliveryMode: Yup.string().required("Delivery mode is required"),
  deliveryCharge: Yup.number().when("deliveryMode", {
    is: "Paid Home Delivery",
    then: (schema) =>
      schema
        .required("Delivery charge is required")
        .min(1, "Charge must be at least ₹1"),
    otherwise: (schema) => schema.nullable(),
  }),
  gstPercent: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null || originalValue === undefined
        ? undefined
        : value,
    )
    .typeError("GST must be a number")
    .required("GST is required (enter 0 if not applicable)")
    .min(0, "GST cannot be negative")
    .max(100, "GST cannot be more than 100%"),
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
  const { theme } = useTheme();
  const formStyles = useMemo(() => getFormStyles(theme), [theme]);
  const styles = useMemo(() => createStyles(theme, formStyles), [theme, formStyles]);
  const { user } = useAuth();
  const { profile } = useUserProfile();
  // 1. Detect if we are in Edit/View mode
  const deal = route.params?.deal;
  const isCompleted = deal?.status === "completed";
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);
  const isEditMode = !!deal && !isDuplicateMode;
  const isReadOnly = isCompleted && !isDuplicateMode;
  const isExpiryLocked = isReadOnly;
  const sellerDisplayName = useMemo(() => {
    const explicitName =
      profile?.displayName || profile?.fullName || profile?.name || "";
    if (String(explicitName).trim()) return String(explicitName).trim();
    if (user?.displayName && String(user.displayName).trim()) {
      return String(user.displayName).trim();
    }
    if (user?.email && String(user.email).includes("@")) {
      return String(user.email).split("@")[0];
    }
    return String(deal?.sellerName || "").trim();
  }, [deal?.sellerName, profile, user]);

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
    gstPercent: deal?.gstPercent?.toString() || "",
    minGroupSize: deal?.minGroupSize?.toString() || "2",
    maxGroupSize: deal?.maxGroupSize?.toString() || "",
    pricingTiersEnabled: Boolean(
      Array.isArray(deal?.pricingTiers) && deal.pricingTiers.length > 1,
    ),
    pricingTiers:
      Array.isArray(deal?.pricingTiers) && deal.pricingTiers.length
        ? deal.pricingTiers.map((tier) => ({
            maxBuyers: tier?.maxBuyers != null ? String(tier.maxBuyers) : "",
            price: tier?.price != null ? String(tier.price) : "",
          }))
        : [{ maxBuyers: "", price: "" }],
    expiresAt: deal?.expiresAt?.toDate
      ? deal.expiresAt.toDate() // Firestore helper to get JS Date
      : deal?.expiresAt
        ? new Date(deal.expiresAt)
        : null,
    location: deal?.location || "",
    sellerId: deal?.sellerId || user?.uid || "",
  });

  const [images, setImages] = useState(() => {
    if (Array.isArray(deal?.images) && deal.images.length) return deal.images;
    const single = deal?.imageUrl || deal?.image;
    return single ? [single] : [];
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
  const [storeAddressModalVisible, setStoreAddressModalVisible] =
    useState(false);
  const [selectedStoreAddressId, setSelectedStoreAddressId] = useState(null);
  const { addresses, loading: addressesLoading } = useAddresses();

  useEffect(() => {
    if (!user?.uid) return;
    setForm((prev) => {
      const current = String(prev?.sellerId || "").trim();
      if (current) return prev;
      return { ...prev, sellerId: user.uid };
    });
  }, [user?.uid]);

  const clearFieldErrors = (...fields) => {
    if (!fields?.length) return;
    setErrors((prev) => {
      let changed = false;
      const next = { ...prev };
      fields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(next, field)) {
          delete next[field];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  const setFieldValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearFieldErrors(key);

    if (key === "category" && value !== "Other") {
      clearFieldErrors("categoryOther");
    }
    if (key === "deliveryMode" && value !== "Paid Home Delivery") {
      clearFieldErrors("deliveryCharge");
    }
  };

  const defaultStoreAddress = useMemo(
    () =>
      Array.isArray(addresses)
        ? addresses.find((item) => item?.isDefault) || null
        : null,
    [addresses],
  );

  const selectedStoreAddress = useMemo(
    () =>
      Array.isArray(addresses)
        ? addresses.find((item) => item.id === selectedStoreAddressId) || null
        : null,
    [addresses, selectedStoreAddressId],
  );

  const effectiveStoreAddress =
    selectedStoreAddress || defaultStoreAddress || null;

  const formatStoreAddress = (address) => {
    if (!address) return "";
    const fullName =
      address.name || address.fullName || address.recipientName || "";
    const parts = [
      fullName,
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.pincode,
      address.country,
      address.phone || address.mobile
        ? `Phone: ${address.phone || address.mobile}`
        : "",
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    return parts.join(", ");
  };

  const normalizeStoreAddressForDeal = (address) => {
    if (!address || typeof address !== "object") return null;
    const normalized = {
      label: String(address.label || "").trim(),
      name: String(address.name || "").trim(),
      phone: String(address.phone || "").trim(),
      line1: String(address.line1 || "").trim(),
      line2: String(address.line2 || "").trim(),
      city: String(address.city || "").trim(),
      state: String(address.state || "").trim(),
      pincode: String(address.pincode || "").trim(),
      country: String(address.country || "").trim(),
    };
    if (
      !normalized.line1 ||
      !normalized.city ||
      !normalized.state ||
      !normalized.pincode
    ) {
      return null;
    }
    return normalized;
  };

  useEffect(() => {
    if (form.deliveryMode !== "Pick from Store") {
      setStoreAddressModalVisible(false);
      return;
    }
    if (!Array.isArray(addresses) || addresses.length === 0) {
      setSelectedStoreAddressId(null);
      return;
    }
    setSelectedStoreAddressId((prev) => {
      if (prev && addresses.some((item) => item.id === prev)) return prev;
      return defaultStoreAddress?.id || null;
    });
  }, [form.deliveryMode, addresses, defaultStoreAddress?.id]);

  useEffect(() => {
    if (form.deliveryMode === "Pick from Store" && effectiveStoreAddress) {
      clearFieldErrors("deliveryMode");
    }
  }, [form.deliveryMode, effectiveStoreAddress]);

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
    clearFieldErrors(field, "discountPrice", "originalPrice");
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
    clearFieldErrors("minGroupSize");
  };

  /* ---------- MAX BUYERS ---------- */

  const handleMaxBuyersChange = (value) => {
    const clean = value.replace(/[^0-9]/g, "");
    setForm((p) => ({ ...p, maxGroupSize: clean }));
    clearFieldErrors("maxGroupSize");
  };

  /* ---------- GST ---------- */

  const handleGstChange = (value) => {
    const clean = value.replace(/[^0-9.]/g, "");
    if (!/^\d*\.?\d*$/.test(clean)) return;
    setForm((p) => ({ ...p, gstPercent: clean }));
    clearFieldErrors("gstPercent");
  };

  /* ---------- GROUP PRICING TIERS ---------- */

  const handleTogglePricingTiers = (enabled) => {
    setForm((p) => {
      const next = { ...p, pricingTiersEnabled: enabled };
      // Turning tiers on with an already-split tier list (e.g. re-enabling
      // after a toggle-off) should immediately re-derive Minimum Buyers
      // from tier 1's cap, same as editing that field would.
      if (enabled && Array.isArray(p.pricingTiers) && p.pricingTiers.length > 1) {
        const tier1Max = p.pricingTiers[0]?.maxBuyers;
        if (tier1Max) next.minGroupSize = tier1Max;
      }
      return next;
    });
    clearFieldErrors("pricingTiers", "minGroupSize");
  };

  const handleAddTier = () => {
    setForm((p) => {
      if (!Array.isArray(p.pricingTiers) || p.pricingTiers.length >= MAX_PRICING_TIERS) {
        return p;
      }
      return { ...p, pricingTiers: [...p.pricingTiers, { maxBuyers: "", price: "" }] };
    });
    clearFieldErrors("pricingTiers");
  };

  const handleRemoveTier = (index) => {
    setForm((p) => {
      if (!Array.isArray(p.pricingTiers) || p.pricingTiers.length <= 1) return p;
      return { ...p, pricingTiers: p.pricingTiers.filter((_, i) => i !== index) };
    });
    clearFieldErrors("pricingTiers");
  };

  const handleTierFieldChange = (index, field, value) => {
    const clean =
      field === "maxBuyers" ? value.replace(/[^0-9]/g, "") : value.replace(/[^0-9.]/g, "");
    setForm((p) => {
      const tiers = Array.isArray(p.pricingTiers) ? p.pricingTiers : [];
      const nextTiers = tiers.map((tier, i) => (i === index ? { ...tier, [field]: clean } : tier));
      const next = { ...p, pricingTiers: nextTiers };
      // Tier 1's cap IS Minimum Buyers once there's more than one tier (see
      // the matching note in DealFormFields.js) - keep them in sync the
      // moment the seller edits it, same direction as tier 1's price
      // mirroring Deal Price.
      if (index === 0 && field === "maxBuyers" && nextTiers.length > 1) {
        next.minGroupSize = clean;
      }
      return next;
    });
    clearFieldErrors("pricingTiers", "minGroupSize");
  };

  // Row 0's minBuyers is always 1 and its price always mirrors discountPrice
  // (both required by firestore.rules isValidPricingTiers), and the last
  // row's maxBuyers is always forced open-ended - the form only ever lets a
  // seller edit the pieces that can actually vary.
  const buildPricingTiersPayload = (formState) => {
    if (!formState.pricingTiersEnabled) return null;
    const rows = Array.isArray(formState.pricingTiers) ? formState.pricingTiers : [];
    if (!rows.length) return null;
    let minBuyers = 1;
    return rows.map((row, index) => {
      const isLast = index === rows.length - 1;
      const maxBuyers = isLast ? null : Number(row.maxBuyers) || null;
      const price =
        index === 0
          ? Number(parseNumber(formState.discountPrice)) || 0
          : Number(row.price) || 0;
      const tier = { minBuyers, maxBuyers, price };
      minBuyers = maxBuyers != null ? maxBuyers + 1 : minBuyers;
      return tier;
    });
  };

  /* ---------- IMAGE ---------- */

  const MAX_DEAL_IMAGES = 6;

  /**
   * `pickImages` opens the library for a multi-select pick, capped so the
   * deal never exceeds MAX_DEAL_IMAGES total.
   */
  const pickImages = async () => {
    const remaining = MAX_DEAL_IMAGES - images.length;
    if (remaining <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!res.canceled) {
      setImages((prev) => [...prev, ...res.assets.map((asset) => asset.uri)]);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * `images` state holds local device file:// URIs right after picking
   * photos - those paths only exist on this phone, so buyers on other
   * devices can never load them. Upload the local ones to the backend (see
   * apps/backend/src/routes/uploads.js, stored on its own disk under
   * uploads/deals/{sellerUid}/) and swap in the public URLs it returns
   * before saving the deal, preserving the original order. URIs that are
   * already https:// (unchanged from an existing deal, or already
   * uploaded) are left as-is instead of being re-uploaded.
   */
  const resolveImagesForSave = async (uris) => {
    const list = (uris || []).filter(Boolean);
    if (!list.length) return [];

    const localUris = list.filter((uri) => !/^https?:\/\//i.test(uri));
    if (!localUris.length) return list;

    const formData = new FormData();
    localUris.forEach((uri, index) => {
      formData.append("images", {
        uri,
        name: `deal-${Date.now()}-${index}.jpg`,
        type: "image/jpeg",
      });
    });
    const response = await apiClient.post("/uploads/deal-images", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const uploadedUrls = response.data?.urls || [];

    let uploadIndex = 0;
    return list
      .map((uri) =>
        /^https?:\/\//i.test(uri) ? uri : uploadedUrls[uploadIndex++] ?? null,
      )
      .filter(Boolean);
  };

  /* ---------- VALIDATION ---------- */

  /**
   * The function `validate` in JavaScript cleans and validates form data, handling errors and returning
   * a boolean based on validation success.
   * @returns The `validate` function is returning a boolean value - `true` if the data passes validation
   * and `false` if there are validation errors.
   */
  const validate = async () => {
    // Clean data before validation (removing currency symbols)
    const cleanData = {
      ...form,
      originalPrice: form.originalPrice
        ? Number(parseNumber(form.originalPrice))
        : undefined,
      discountPrice: form.discountPrice
        ? Number(parseNumber(form.discountPrice))
        : undefined,
      deliveryCharge: form.deliveryCharge
        ? Number(parseNumber(form.deliveryCharge))
        : 0,
      minGroupSize: Number(form.minGroupSize),
      maxGroupSize:
        form.maxGroupSize === "" || form.maxGroupSize === null || form.maxGroupSize === undefined
          ? undefined
          : Number(form.maxGroupSize),
      gstPercent:
        form.gstPercent === "" || form.gstPercent === null || form.gstPercent === undefined
          ? undefined
          : Number(form.gstPercent),
    };

    const newErrors = {};
    if (!Array.isArray(images) || images.length === 0) {
      newErrors.images = "Please add at least one deal image";
    }
    if (form.pricingTiersEnabled) {
      const tierError = validatePricingTiers(buildPricingTiersPayload(form));
      if (tierError) newErrors.pricingTiers = tierError;
    }

    try {
      await dealSchema.validate(cleanData, { abortEarly: false });
    } catch (err) {
      if (Array.isArray(err?.inner) && err.inner.length > 0) {
        err.inner.forEach((error) => {
          if (error?.path) {
            newErrors[error.path] = error.message;
          }
        });
      } else if (err?.path) {
        newErrors[err.path] = err.message;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    try {
      if (cleanData.deliveryMode === "Pick from Store") {
        if (addressesLoading) {
          Alert.alert(
            "Please wait",
            "Loading seller addresses. Try again in a moment.",
          );
          return false;
        }
        const hasAnyAddress = Array.isArray(addresses) && addresses.length > 0;
        if (!hasAnyAddress) {
          setErrors({
            deliveryMode:
              "Add at least one seller address before selecting Pick from Store.",
          });
          Alert.alert(
            "Store address required",
            "To publish a pickup deal, add at least one seller address first.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Add Address",
                onPress: () => navigation.navigate("AddressForm"),
              },
            ],
          );
          return false;
        }
        if (!effectiveStoreAddress) {
          setErrors({
            deliveryMode:
              "Select a store address before publishing this pickup deal.",
          });
          Alert.alert(
            "Select store address",
            "No default address is selected. Please choose one from your saved addresses.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Select Address",
                onPress: () => setStoreAddressModalVisible(true),
              },
            ],
          );
          return false;
        }
      }
      setErrors({});
      return true;
    } catch (err) {
      Alert.alert(
        "Validation failed",
        err?.message || "Something went wrong while validating this deal.",
      );
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
      const resolvedImages = await resolveImagesForSave(images);

      // 1. Prepare the data object ONCE
      const resolvedCategory =
        form.category === "Other"
          ? form.categoryOther?.trim() || "Other"
          : form.category;
      const preferredStoreAddress =
        form.deliveryMode === "Pick from Store" ? effectiveStoreAddress : null;
      const storeAddressObject = normalizeStoreAddressForDeal(
        preferredStoreAddress,
      );
      const existingStoreAddress =
        typeof deal?.storeAddress === "string" && deal.storeAddress.trim()
          ? deal.storeAddress.trim()
          : typeof deal?.pickupAddress === "string" && deal.pickupAddress.trim()
            ? deal.pickupAddress.trim()
            : "";
      const storeAddressText = preferredStoreAddress
        ? formatStoreAddress(preferredStoreAddress)
        : existingStoreAddress;
      const dealData = {
        ...form,
        sellerId: form.sellerId || user?.uid || deal?.sellerId || "",
        sellerName:
          sellerDisplayName || deal?.sellerName || deal?.vendorName || null,
        category: resolvedCategory,
        originalPrice: Number(parseNumber(form.originalPrice)) || 0,
        discountPrice: Number(parseNumber(form.discountPrice)) || 0,
        gstPercent: Number(form.gstPercent) || 0,
        minGroupSize: Number(form.minGroupSize) || 1,
        maxGroupSize: form.maxGroupSize ? Number(form.maxGroupSize) || null : null,
        pricingTiers: buildPricingTiersPayload(form),
        description: form.description?.trim() || "", // Fixed typo from 'descrption'
        deliveryMode: form.deliveryMode,
        title: form.title?.trim() || "",
        location: form.location?.trim() || "",
        images: resolvedImages,
        image: resolvedImages[0] || null,
        imageUrl: resolvedImages[0] || null,
        deliveryCharge:
          form.deliveryMode === "Paid Home Delivery"
            ? Number(parseNumber(form.deliveryCharge)) || 0
            : 0,
        storeAddress:
          form.deliveryMode === "Pick from Store"
            ? storeAddressObject || storeAddressText
            : null,
        pickupAddress:
          form.deliveryMode === "Pick from Store" ? storeAddressText : null,
        updatedAt: serverTimestamp(),
      };
      // pricingTiersEnabled is form-only UI state (the tier editor's on/off
      // toggle) - whether a deal is tiered is derived from pricingTiers
      // itself at read time, so this never belongs in the persisted doc.
      delete dealData.pricingTiersEnabled;

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
          approvalStatus: "pending",
          lifecycleStatus: "pending",
          status: "pending",
          approved: false,
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
      <TopPageHeader
        title={
          isReadOnly
            ? "View Deal"
            : isEditMode
              ? "Edit Deal"
              : "Create New Deal"
        }
        subtitle="Manage your deal details quickly"
        onBack={() => navigation.goBack()}
        style={styles.header}
        titleStyle={styles.headerTitle}
        subtitleStyle={styles.headerSubtitle}
        rounded
        includeSafeArea={false}
      />
      {/* READ-ONLY BANNER */}
      {/* READ-ONLY BANNER */}
      {isCompleted && (
        <View style={styles.readOnlyBanner}>
          <View style={styles.bannerAccent} />
          <View style={styles.bannerContent}>
            {!isDuplicateMode && (
              <View style={styles.bannerHeader}>
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={theme.colors.amberText}
                />
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
                      color={theme.colors.onPrimary}
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
                  color={theme.colors.onPrimaryMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.bannerActionCard,
                  isDuplicateMode && styles.bannerActionCardCompact,
                ]}
                onPress={() =>
                  navigation.navigate("MainTabs", { screen: "Dashboard" })
                }
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
                      color={theme.colors.onPrimary}
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
                  color={theme.colors.onPrimaryMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <DealFormFields
            form={form}
            errors={errors}
            images={images}
            isReadOnly={isReadOnly}
            isExpiryLocked={isExpiryLocked}
            onPickImage={pickImages}
            onRemoveImage={removeImage}
            onFieldChange={setFieldValue}
            onPriceChange={handlePriceChange}
            onMinBuyersChange={handleMinBuyersChange}
            onMaxBuyersChange={handleMaxBuyersChange}
            onTogglePricingTiers={handleTogglePricingTiers}
            onAddTier={handleAddTier}
            onRemoveTier={handleRemoveTier}
            onTierFieldChange={handleTierFieldChange}
            onGstChange={handleGstChange}
            onCategoryPress={() => setCategoryModalVisible(true)}
            onDeliveryModePress={() => setDeliveryModalVisible(true)}
            onExpiresAtPress={() => setShowDatePicker(true)}
            onBlurPrice={(field) =>
              setForm((p) => ({
                ...p,
                [field]: formatINRWithCommas(p[field]),
              }))
            }
            onBlurDeliveryCharge={() =>
              setForm((p) => ({
                ...p,
                deliveryCharge: formatINRWithCommas(p.deliveryCharge),
              }))
            }
            onDeliveryChargeChange={(value) => {
              setForm((p) => ({
                ...p,
                deliveryCharge: value.replace(/[^0-9.]/g, ""),
              }));
              clearFieldErrors("deliveryCharge");
            }}
          />

          {form.deliveryMode === "Pick from Store" ? (
            <View style={styles.storeAddressPanel}>
              <View style={styles.storeAddressPanelHeader}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.storeAddressPanelTitle}>Store Address</Text>
              </View>
              {effectiveStoreAddress ? (
                <Text style={styles.storeAddressText}>
                  {formatStoreAddress(effectiveStoreAddress)}
                </Text>
              ) : (
                <Text style={styles.storeAddressHint}>
                  No default store address selected. Choose one from your saved
                  addresses.
                </Text>
              )}
              <View style={styles.storeAddressPanelActions}>
                <TouchableOpacity
                  style={styles.storeAddressActionGhost}
                  onPress={() => navigation.navigate("AddressBook")}
                >
                  <Text style={styles.storeAddressActionGhostText}>
                    Manage Addresses
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.storeAddressActionPrimary}
                  onPress={() => setStoreAddressModalVisible(true)}
                >
                  <Text style={styles.storeAddressActionPrimaryText}>
                    {effectiveStoreAddress
                      ? "Change Address"
                      : "Select Address"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {showDatePicker && !isExpiryLocked && (
            <DateTimePicker
              value={
                form.expiresAt instanceof Date ? form.expiresAt : new Date()
              }
              mode="date"
              display="default"
              onChange={(e, d) => {
                setShowDatePicker(false);
                if (d) {
                  setForm((prev) => ({ ...prev, expiresAt: d }));
                  clearFieldErrors("expiresAt");
                }
              }}
            />
          )}

          {/* SUBMIT */}
          {/* Only show the button if NOT in Read Only mode */}
          {!isReadOnly && (
            <AppButton
              title="Submit for Approval"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              leftIcon={<Save color={theme.colors.onPrimary} size={18} />}
              style={{ marginTop: 30 }}
            />
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

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
                  clearFieldErrors("category");
                  if (c.label !== "Other") {
                    clearFieldErrors("categoryOther");
                  }
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
                  clearFieldErrors("deliveryMode");
                  if (mode !== "Paid Home Delivery") {
                    clearFieldErrors("deliveryCharge");
                  }
                  setDeliveryModalVisible(false);
                }}
              >
                <Text>{mode}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* STORE ADDRESS MODAL */}
      <Modal
        transparent
        visible={storeAddressModalVisible}
        animationType="slide"
      >
        <View style={styles.overlay}>
          <View style={[styles.card, styles.storeAddressModalCard]}>
            <View style={styles.storeAddressModalHeader}>
              <Text style={styles.storeAddressModalTitle}>
                Select Store Address
              </Text>
              <TouchableOpacity
                onPress={() => setStoreAddressModalVisible(false)}
                style={styles.storeAddressModalClose}
              >
                <Ionicons name="close" size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {addressesLoading ? (
              <Text style={styles.storeAddressLoading}>
                Loading addresses...
              </Text>
            ) : addresses?.length ? (
              <ScrollView
                style={styles.storeAddressList}
                contentContainerStyle={styles.storeAddressListContent}
                showsVerticalScrollIndicator={false}
              >
                {addresses.map((item) => {
                  const isSelected = item.id === selectedStoreAddressId;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.storeAddressOption,
                        isSelected && styles.storeAddressOptionSelected,
                      ]}
                      onPress={() => setSelectedStoreAddressId(item.id)}
                    >
                      <View style={styles.storeAddressOptionHeader}>
                        <Text style={styles.storeAddressOptionLabel}>
                          {item.label || "Address"}
                        </Text>
                        {item.isDefault ? (
                          <View style={styles.storeAddressDefaultTag}>
                            <Ionicons
                              name="star"
                              size={12}
                              color={theme.colors.warningBright}
                            />
                            <Text style={styles.storeAddressDefaultText}>
                              Default
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {item.name ? (
                        <Text style={styles.storeAddressOptionLine}>
                          {item.name}
                        </Text>
                      ) : null}
                      <Text style={styles.storeAddressOptionLine}>
                        {item.line1 || ""}
                      </Text>
                      {item.line2 ? (
                        <Text style={styles.storeAddressOptionLine}>
                          {item.line2}
                        </Text>
                      ) : null}
                      <Text style={styles.storeAddressOptionLine}>
                        {[item.city, item.state, item.pincode]
                          .map((entry) => String(entry || "").trim())
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                      {item.phone ? (
                        <Text style={styles.storeAddressOptionLine}>
                          Phone: {item.phone}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.storeAddressEmpty}>
                <Text style={styles.storeAddressHint}>
                  No saved addresses found.
                </Text>
              </View>
            )}

            <View style={styles.storeAddressModalActions}>
              <TouchableOpacity
                style={styles.storeAddressActionGhost}
                onPress={() => {
                  setStoreAddressModalVisible(false);
                  navigation.navigate("AddressForm");
                }}
              >
                <Text style={styles.storeAddressActionGhostText}>
                  Add Address
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.storeAddressActionPrimary,
                  !selectedStoreAddressId && styles.storeAddressActionDisabled,
                ]}
                disabled={!selectedStoreAddressId}
                onPress={() => setStoreAddressModalVisible(false)}
              >
                <Text style={styles.storeAddressActionPrimaryText}>
                  Use Selected
                </Text>
              </TouchableOpacity>
            </View>
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
              <Text style={styles.successText}>
                Deal submitted for approval!
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

/* ---------- STYLES ---------- */
const createStyles = (theme, formStyles) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.dashboardBg,
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "android" ? 96 : 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  storeAddressPanel: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.colors.infoBorder,
    backgroundColor: theme.colors.infoSoft,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  storeAddressPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  storeAddressPanelTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.text,
  },
  storeAddressText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  storeAddressHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  storeAddressPanelActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  storeAddressActionPrimary: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  storeAddressActionPrimaryText: {
    color: theme.colors.onPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  storeAddressActionGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  storeAddressActionGhostText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  storeAddressActionDisabled: {
    opacity: 0.55,
  },
  label: formStyles.label,
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  error: formStyles.error,
  imageBox: {
    height: 160,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  image: { width: "100%", height: "100%" },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: theme.colors.background,
    padding: 24,
    borderRadius: 20,
    width: "80%",
  },
  storeAddressModalCard: {
    width: "90%",
    maxHeight: "82%",
    padding: 18,
    gap: 10,
  },
  storeAddressModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  storeAddressModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
  },
  storeAddressModalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceMuted,
  },
  storeAddressLoading: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  storeAddressList: {
    maxHeight: 360,
  },
  storeAddressListContent: {
    gap: 10,
    paddingBottom: 6,
  },
  storeAddressOption: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: theme.colors.surface,
    gap: 3,
  },
  storeAddressOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.infoSoft,
  },
  storeAddressOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  storeAddressOptionLabel: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  storeAddressDefaultTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceMuted,
  },
  storeAddressDefaultText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  storeAddressOptionLine: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  storeAddressEmpty: {
    paddingVertical: 10,
  },
  storeAddressModalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
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
    borderColor: theme.colors.border, // Subtle border
  },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay, // Dim the background
    justifyContent: "center",
    alignItems: "center",
  },
  animationContainer: {
    backgroundColor: theme.colors.background,
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    elevation: 5,
  },
  successText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  readOnlyBanner: {
    backgroundColor: theme.colors.amberSoft, // Soft amber
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 32,
    marginHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.amberBorder,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  bannerAccent: {
    width: 8,
    alignSelf: "stretch",
    backgroundColor: theme.colors.amberAccent,
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
    color: theme.colors.amberText, // Dark amber text
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
    backgroundColor: theme.colors.text,
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
    backgroundColor: theme.colors.onPrimarySoft,
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
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  bannerActionTitleCompact: {
    fontSize: 12,
  },
  bannerActionSub: {
    color: theme.colors.onPrimaryMuted,
    fontSize: 11,
  },
});
