import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { Camera } from "lucide-react-native";
import AppInput from "./ui/AppInput";
import FormSection from "./FormSection";
import { theme } from "../theme/theme";
import { formStyles } from "../styles/forms";

export default function DealFormFields({
  form = {},
  errors = {},
  image,
  isReadOnly = false,
  isExpiryLocked = false,
  showImage = true,
  onPickImage,
  onFieldChange,
  onPriceChange,
  onMinBuyersChange,
  onCategoryPress,
  onDeliveryModePress,
  onExpiresAtPress,
  onBlurPrice,
  onBlurDeliveryCharge,
  onDeliveryChargeChange,
}) {
  const category = form.category || "";
  const expiresAt = form.expiresAt;
  const deliveryMode = form.deliveryMode || "";
  const showCategoryOther = category === "Other";
  const showDeliveryCharge = deliveryMode === "Paid Home Delivery";
  const expiryLabel = expiresAt
    ? new Date(expiresAt).toDateString()
    : "Select expiry date";

  const handleFieldChange = (key, value) => {
    if (!onFieldChange) return;
    onFieldChange(key, value);
  };

  return (
    <>
      <FormSection title="Deal Details">
        {showImage ? (
          <TouchableOpacity
            style={[
              styles.imageBox,
              isReadOnly && { borderStyle: "solid", opacity: 0.8 },
            ]}
            onPress={onPickImage}
            disabled={isReadOnly || !onPickImage}
            activeOpacity={isReadOnly ? 1 : 0.7}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.image} />
            ) : (
              <Camera size={40} color={theme.colors.iconMuted} />
            )}
          </TouchableOpacity>
        ) : null}

        <AppInput
          label="Deal Title"
          placeholder="e.g. iPhone 15 Pro Max"
          value={form.title}
          editable={!isReadOnly}
          onChangeText={(value) => handleFieldChange("title", value)}
          error={errors.title}
        />

        <AppInput
          label="Description"
          placeholder="Describe the deal"
          multiline
          value={form.description}
          editable={!isReadOnly}
          onChangeText={(value) => handleFieldChange("description", value)}
          error={errors.description}
        />
      </FormSection>

      <FormSection title="Pricing">
        <View style={styles.row}>
          <AppInput
            containerStyle={styles.half}
            label="Original Price"
            keyboardType="decimal-pad"
            placeholder="Rs 0.00"
            value={form.originalPrice}
            editable={!isReadOnly}
            onChangeText={(value) => onPriceChange?.("originalPrice", value)}
            onBlur={() => onBlurPrice?.("originalPrice")}
          />

          <AppInput
            containerStyle={styles.half}
            label="Deal Price"
            keyboardType="decimal-pad"
            placeholder="Rs 0.00"
            value={form.discountPrice}
            editable={!isReadOnly}
            onChangeText={(value) => onPriceChange?.("discountPrice", value)}
            onBlur={() => onBlurPrice?.("discountPrice")}
            error={errors.discountPrice}
          />
        </View>

        <AppInput
          label="Minimum Buyers"
          keyboardType="numeric"
          placeholder="Minimum 2 buyers"
          value={form.minGroupSize}
          editable={!isReadOnly}
          onChangeText={(value) => onMinBuyersChange?.(value)}
          error={errors.minGroupSize}
        />
      </FormSection>

      <FormSection title="Logistics">
        <Text style={[styles.label, errors.category && styles.labelError]}>
          Category
        </Text>

        <TouchableOpacity
          style={[
            styles.input,
            errors.category && styles.inputError,
            isReadOnly && styles.readOnlyInput,
          ]}
          disabled={isReadOnly}
          onPress={onCategoryPress}
        >
          <Text
            style={
              isReadOnly
                ? { color: theme.colors.textMuted }
                : { color: theme.colors.text }
            }
          >
            {form.category || "Select category"}
          </Text>
        </TouchableOpacity>

        {errors.category ? (
          <Text style={styles.error}>{errors.category}</Text>
        ) : null}

        {showCategoryOther ? (
          <AppInput
            label="Other Category"
            placeholder="e.g. Home Appliances"
            value={form.categoryOther}
            editable={!isReadOnly}
            onChangeText={(value) => handleFieldChange("categoryOther", value)}
            error={errors.categoryOther}
          />
        ) : null}

        <Text style={[styles.label, errors.expiresAt && styles.labelError]}>
          Expires At
        </Text>

        <TouchableOpacity
          style={[
            styles.input,
            errors.expiresAt && styles.inputError,
            isExpiryLocked && styles.readOnlyInput,
          ]}
          disabled={isExpiryLocked}
          onPress={onExpiresAtPress}
        >
          <Text
            style={
              isExpiryLocked
                ? { color: theme.colors.textMuted }
                : { color: theme.colors.text }
            }
          >
            {expiryLabel}
          </Text>
        </TouchableOpacity>

        {errors.expiresAt ? (
          <Text style={styles.error}>{errors.expiresAt}</Text>
        ) : null}

        <AppInput
          label="Location"
          placeholder="e.g. Mumbai, Andheri"
          value={form.location}
          editable={!isReadOnly}
          onChangeText={(value) => handleFieldChange("location", value)}
          error={errors.location}
        />

        <Text style={[styles.label, errors.deliveryMode && styles.labelError]}>
          Delivery Mode
        </Text>

        <TouchableOpacity
          style={[
            styles.input,
            errors.deliveryMode && styles.inputError,
            isReadOnly && styles.readOnlyInput,
          ]}
          disabled={isReadOnly}
          onPress={onDeliveryModePress}
        >
          <Text
            style={
              isReadOnly
                ? { color: theme.colors.textMuted }
                : { color: theme.colors.text }
            }
          >
            {form.deliveryMode || "Select delivery mode"}
          </Text>
        </TouchableOpacity>

        {errors.deliveryMode ? (
          <Text style={styles.error}>{errors.deliveryMode}</Text>
        ) : null}

        {showDeliveryCharge ? (
          <AppInput
            label="Delivery Charge"
            keyboardType="decimal-pad"
            placeholder="Rs 0.00"
            value={form.deliveryCharge}
            editable={!isReadOnly}
            onChangeText={(value) =>
              onDeliveryChargeChange
                ? onDeliveryChargeChange(value)
                : handleFieldChange("deliveryCharge", value)
            }
            onBlur={() => onBlurDeliveryCharge?.()}
            error={errors.deliveryCharge}
          />
        ) : null}
      </FormSection>
    </>
  );
}

const styles = StyleSheet.create({
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  half: {
    flex: 1,
  },
  imageBox: {
    height: 160,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  image: { width: "100%", height: "100%" },
  inputError: {
    borderColor: theme.colors.error,
  },
  labelError: {
    color: theme.colors.error,
  },
  readOnlyInput: {
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.textMuted,
    borderColor: theme.colors.border,
  },
});
