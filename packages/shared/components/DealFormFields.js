import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Camera, X } from "lucide-react-native";
import AppInput from "./ui/AppInput";
import FormSection from "./FormSection";
import { useTheme } from "../theme/ThemeProvider";
import { getFormStyles } from "../styles/forms";

export default function DealFormFields({
  form = {},
  errors = {},
  images = [],
  maxImages = 6,
  isReadOnly = false,
  isExpiryLocked = false,
  showImage = true,
  showTitle = true,
  showDescription = true,
  showPricing = true,
  showLogistics = true,
  onPickImage,
  onRemoveImage,
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
  const { theme } = useTheme();
  const formStyles = useMemo(() => getFormStyles(theme), [theme]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        imageRow: {
          flexDirection: "row",
          gap: 10,
        },
        imageBox: {
          width: 110,
          height: 110,
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: 18,
          justifyContent: "center",
          alignItems: "center",
        },
        image: { width: "100%", height: "100%", borderRadius: 18 },
        imageThumbWrap: {
          width: 110,
          height: 110,
          borderRadius: 18,
          overflow: "hidden",
        },
        imageRemoveBtn: {
          position: "absolute",
          top: 6,
          right: 6,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: "rgba(0,0,0,0.6)",
          alignItems: "center",
          justifyContent: "center",
        },
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
      }),
    [formStyles, theme],
  );
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.imageRow}>
              {images.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.imageThumbWrap}>
                  <Image source={{ uri }} style={styles.image} />
                  {!isReadOnly && onRemoveImage ? (
                    <TouchableOpacity
                      style={styles.imageRemoveBtn}
                      onPress={() => onRemoveImage(index)}
                    >
                      <X size={14} color="#fff" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              {!isReadOnly && onPickImage && images.length < maxImages ? (
                <TouchableOpacity
                  style={styles.imageBox}
                  onPress={onPickImage}
                  activeOpacity={0.7}
                >
                  <Camera size={32} color={theme.colors.iconMuted} />
                </TouchableOpacity>
              ) : null}
              {isReadOnly && images.length === 0 ? (
                <View style={styles.imageBox}>
                  <Camera size={32} color={theme.colors.iconMuted} />
                </View>
              ) : null}
            </View>
          </ScrollView>
        ) : null}

        {showTitle ? (
          <AppInput
            label="Deal Title"
            placeholder="e.g. iPhone 15 Pro Max"
            value={form.title}
            editable={!isReadOnly}
            onChangeText={(value) => handleFieldChange("title", value)}
            error={errors.title}
          />
        ) : null}

        {showDescription ? (
          <AppInput
            label="Description"
            placeholder="Describe the deal"
            multiline
            value={form.description}
            editable={!isReadOnly}
            onChangeText={(value) => handleFieldChange("description", value)}
            error={errors.description}
          />
        ) : null}
      </FormSection>

      {showPricing ? (
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
              error={errors.originalPrice}
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
      ) : null}

      {showLogistics ? (
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
      ) : null}
    </>
  );
}
