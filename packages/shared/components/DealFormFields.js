import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
} from "react-native";
import { Camera, X } from "lucide-react-native";
import AppInput from "./ui/AppInput";
import FormSection from "./FormSection";
import PriceBreakupCard from "./PriceBreakupCard";
import { useTheme } from "../theme/ThemeProvider";
import { getFormStyles } from "../styles/forms";
import { calculatePriceBreakup, MAX_PRICING_TIERS } from "../utils/priceBreakup";

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
  onMaxBuyersChange,
  onCategoryPress,
  onCityPress,
  onDeliveryModePress,
  onExpiresAtPress,
  onBlurPrice,
  onBlurDeliveryCharge,
  onDeliveryChargeChange,
  onGstChange,
  onTogglePricingTiers,
  onAddTier,
  onRemoveTier,
  onTierFieldChange,
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
        breakupHint: {
          fontSize: 11,
          color: theme.colors.textMuted,
          marginBottom: 8,
        },
        tierToggleRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        },
        tierHint: {
          fontSize: 11,
          color: theme.colors.textMuted,
          marginTop: 2,
        },
        tierList: {
          gap: 10,
        },
        tierRow: {
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.md,
          padding: 12,
          gap: 4,
        },
        tierRowHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        tierRangeLabel: {
          fontSize: 12,
          fontWeight: "700",
          color: theme.colors.text,
        },
        addTierButton: {
          alignSelf: "flex-start",
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: theme.colors.primary,
        },
        addTierText: {
          fontSize: 12,
          fontWeight: "700",
          color: theme.colors.primary,
        },
        tierBreakupBlock: {
          gap: 6,
          marginBottom: 12,
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

  const parsePriceNumber = (value) =>
    Number(String(value ?? "").replace(/[₹,]/g, "")) || 0;

  const priceBreakup = useMemo(
    () =>
      calculatePriceBreakup({
        basePrice: parsePriceNumber(form.discountPrice),
        gstPercent: form.gstPercent,
        deliveryMode,
        deliveryCharge: parsePriceNumber(form.deliveryCharge),
      }),
    [form.discountPrice, form.gstPercent, deliveryMode, form.deliveryCharge],
  );
  const showBreakupPreview =
    showPricing && showLogistics && parsePriceNumber(form.discountPrice) > 0;

  const tierRows =
    Array.isArray(form.pricingTiers) && form.pricingTiers.length
      ? form.pricingTiers
      : [{ maxBuyers: "", price: "" }];
  // With 2+ tiers, tier 1's own cap is exactly "how many buyers make this
  // deal guaranteed to ship" - so once a seller splits pricing into tiers,
  // Minimum Buyers stops being a second, independently-set number and just
  // follows tier 1's "Up to buyers" value instead (kept in sync by
  // handleTierFieldChange in the screen, same as tier 1's price already
  // mirrors Deal Price). A single, still-open-ended tier has no boundary to
  // derive from, so Minimum Buyers stays manually editable in that case.
  const minGroupSizeDerived = Boolean(form.pricingTiersEnabled) && tierRows.length > 1;
  // Each row only stores its own maxBuyers - minBuyers is always one past
  // wherever the previous row left off, so it's derived here for display
  // rather than kept in sync in form state.
  const tierMinBuyersAt = (index) => {
    let min = 1;
    for (let i = 0; i < index; i += 1) {
      const prevMax = Number(tierRows[i]?.maxBuyers);
      min = Number.isFinite(prevMax) && prevMax > 0 ? prevMax + 1 : min + 1;
    }
    return min;
  };

  // With tiers on, a single breakup preview (always tier 1's price) would
  // hide what the buyer actually sees once the price has dropped a few
  // tiers - so each tier gets its own breakup card instead of just one.
  const showTierBreakupPreview =
    showPricing &&
    showLogistics &&
    Boolean(form.pricingTiersEnabled) &&
    tierRows.length > 1;
  const tierBreakups = showTierBreakupPreview
    ? tierRows.map((row, index) => {
        const minBuyers = tierMinBuyersAt(index);
        const isLast = index === tierRows.length - 1;
        const price =
          index === 0 ? parsePriceNumber(form.discountPrice) : parsePriceNumber(row.price);
        return {
          label: isLast ? `${minBuyers}+ buyers` : `${minBuyers}–${row.maxBuyers || "?"} buyers`,
          breakup: calculatePriceBreakup({
            basePrice: price,
            gstPercent: form.gstPercent,
            deliveryMode,
            deliveryCharge: parsePriceNumber(form.deliveryCharge),
          }),
        };
      })
    : [];

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
        {showImage && errors.images ? (
          <Text style={styles.error}>{errors.images}</Text>
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

          <View style={styles.row}>
            <AppInput
              containerStyle={styles.half}
              label="Minimum Buyers"
              keyboardType="numeric"
              placeholder="Minimum 2 buyers"
              value={minGroupSizeDerived ? tierRows[0]?.maxBuyers || "" : form.minGroupSize}
              editable={!isReadOnly && !minGroupSizeDerived}
              onChangeText={(value) => onMinBuyersChange?.(value)}
              error={errors.minGroupSize}
            />

            <AppInput
              containerStyle={styles.half}
              label="Max Buyers (optional)"
              keyboardType="numeric"
              placeholder="No limit"
              value={form.maxGroupSize}
              editable={!isReadOnly}
              onChangeText={(value) => onMaxBuyersChange?.(value)}
              error={errors.maxGroupSize}
            />
          </View>
          {minGroupSizeDerived ? (
            <Text style={styles.tierHint}>
              Auto-set from your first pricing tier below - edit "Up to
              buyers" on Tier 1 to change it.
            </Text>
          ) : null}
        </FormSection>
      ) : null}

      {showPricing ? (
        <FormSection title="Group Pricing (optional)">
          <View style={styles.tierToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Price drops as more buyers join</Text>
              <Text style={styles.tierHint}>
                Off: everyone pays the Deal Price above. On: set cheaper
                prices once more buyers join.
              </Text>
            </View>
            <Switch
              value={Boolean(form.pricingTiersEnabled)}
              onValueChange={(value) => onTogglePricingTiers?.(value)}
              disabled={isReadOnly}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.onPrimary}
            />
          </View>

          {form.pricingTiersEnabled ? (
            <View style={styles.tierList}>
              {tierRows.map((row, index) => {
                const isFirst = index === 0;
                const isLast = index === tierRows.length - 1;
                const minBuyers = tierMinBuyersAt(index);
                return (
                  <View key={index} style={styles.tierRow}>
                    <View style={styles.tierRowHeader}>
                      <Text style={styles.tierRangeLabel}>
                        {isLast
                          ? `${minBuyers}+ buyers`
                          : `${minBuyers}–${row.maxBuyers || "?"} buyers`}
                      </Text>
                      {!isFirst && !isReadOnly ? (
                        <TouchableOpacity
                          onPress={() => onRemoveTier?.(index)}
                          accessibilityLabel={`Remove tier ${index + 1}`}
                        >
                          <X size={16} color={theme.colors.error} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <View style={styles.row}>
                      {!isLast ? (
                        <AppInput
                          containerStyle={styles.half}
                          label="Up to buyers"
                          keyboardType="numeric"
                          placeholder="e.g. 5"
                          value={row.maxBuyers}
                          editable={!isReadOnly}
                          onChangeText={(value) =>
                            onTierFieldChange?.(index, "maxBuyers", value)
                          }
                          error={errors[`pricingTiers.${index}.maxBuyers`]}
                        />
                      ) : (
                        <View style={styles.half} />
                      )}
                      <AppInput
                        containerStyle={styles.half}
                        label={isFirst ? "Price at this tier (= Deal Price)" : "Price at this tier"}
                        keyboardType="decimal-pad"
                        placeholder="Rs 0.00"
                        value={isFirst ? form.discountPrice : row.price}
                        editable={!isReadOnly}
                        onChangeText={(value) =>
                          isFirst
                            ? onPriceChange?.("discountPrice", value)
                            : onTierFieldChange?.(index, "price", value)
                        }
                        error={
                          isFirst ? errors.discountPrice : errors[`pricingTiers.${index}.price`]
                        }
                      />
                    </View>
                  </View>
                );
              })}

              {tierRows.length < MAX_PRICING_TIERS && !isReadOnly ? (
                <TouchableOpacity style={styles.addTierButton} onPress={onAddTier}>
                  <Text style={styles.addTierText}>+ Add another tier</Text>
                </TouchableOpacity>
              ) : null}

              {errors.pricingTiers ? (
                <Text style={styles.error}>{errors.pricingTiers}</Text>
              ) : null}
            </View>
          ) : null}
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

          <Text style={[styles.label, errors.city && styles.labelError]}>
            City
          </Text>

          <TouchableOpacity
            style={[
              styles.input,
              errors.city && styles.inputError,
              isReadOnly && styles.readOnlyInput,
            ]}
            disabled={isReadOnly}
            onPress={onCityPress}
          >
            <Text
              style={
                isReadOnly
                  ? { color: theme.colors.textMuted }
                  : { color: theme.colors.text }
              }
            >
              {form.city || "Select city"}
            </Text>
          </TouchableOpacity>

          {errors.city ? <Text style={styles.error}>{errors.city}</Text> : null}

          <AppInput
            label="Area / Landmark (optional)"
            placeholder="e.g. Andheri West"
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

          <AppInput
            label="GST (%)"
            keyboardType="decimal-pad"
            placeholder="e.g. 18"
            value={form.gstPercent}
            editable={!isReadOnly}
            onChangeText={(value) =>
              onGstChange
                ? onGstChange(value)
                : handleFieldChange("gstPercent", value)
            }
            error={errors.gstPercent}
          />

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

      {showTierBreakupPreview ? (
        <FormSection title="Buyer Price Breakup Preview">
          <Text style={styles.breakupHint}>
            Exactly what the buyer sees at each tier before paying.
          </Text>
          {tierBreakups.map((tier, index) => (
            <View key={index} style={styles.tierBreakupBlock}>
              <Text style={styles.tierRangeLabel}>{tier.label}</Text>
              <PriceBreakupCard breakup={tier.breakup} />
            </View>
          ))}
        </FormSection>
      ) : showBreakupPreview ? (
        <FormSection title="Buyer Price Breakup Preview">
          <Text style={styles.breakupHint}>
            This is exactly what the buyer will see before paying.
          </Text>
          <PriceBreakupCard breakup={priceBreakup} />
        </FormSection>
      ) : null}
    </>
  );
}
