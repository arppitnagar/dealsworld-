import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppInput, useTheme } from "@dealsworld/shared";
import { useAddresses } from "../hooks/useAddresses";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getProfileBaseStyles } from "../styles/profileStyles";

const LABELS = ["Home", "Office", "Other"];

export default function AddressFormScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { addAddress, updateAddress, setDefaultAddress } = useAddresses();
  const existing = route?.params?.address || null;

  const [label, setLabel] = useState(existing?.label || "Home");
  const [customLabel, setCustomLabel] = useState(
    existing?.label && !LABELS.includes(existing.label) ? existing.label : "",
  );
  const [name, setName] = useState(existing?.name || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  const [line1, setLine1] = useState(existing?.line1 || "");
  const [line2, setLine2] = useState(existing?.line2 || "");
  const [city, setCity] = useState(existing?.city || "");
  const [stateName, setStateName] = useState(existing?.state || "");
  const [pincode, setPincode] = useState(existing?.pincode || "");
  const [isDefault, setIsDefault] = useState(Boolean(existing?.isDefault));
  const [saving, setSaving] = useState(false);

  const finalLabel = label === "Other" ? customLabel || "Other" : label;

  const handleSave = async () => {
    if (!line1.trim() || !city.trim() || !stateName.trim() || !pincode.trim()) {
      Alert.alert("Missing details", "Please fill required fields.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        label: finalLabel,
        name: name.trim(),
        phone: phone.trim(),
        line1: line1.trim(),
        line2: line2.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim(),
        isDefault,
      };
      if (existing?.id) {
        await updateAddress(existing.id, payload);
        if (isDefault) {
          await setDefaultAddress(existing.id);
        }
      } else {
        const newId = await addAddress(payload);
        if (isDefault && newId) {
          await setDefaultAddress(newId);
        }
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", error?.message || "Unable to save address.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        { paddingBottom: Math.max(insets.bottom, 20) },
      ]}
    >
      <View
        style={[
          styles.headerBar,
          { paddingTop: Math.max(insets.top, 12) },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={theme.colors.onPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {existing ? "Edit Address" : "Add Address"}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.formWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroCard}>
            <View style={styles.heroAccent} />
            <Text style={styles.heroTitle}>
              {existing ? "Update your address" : "Add a new address"}
            </Text>
            <Text style={styles.heroSubtitle}>
              Keep delivery smooth with accurate details.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Label</Text>
            <View style={styles.labelRow}>
              {LABELS.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.labelChip,
                    label === item && styles.labelChipActive,
                  ]}
                  onPress={() => setLabel(item)}
                >
                  <Text
                    style={[
                      styles.labelChipText,
                      label === item && styles.labelChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {label === "Other" ? (
              <AppInput
                label="Custom Label"
                placeholder="e.g. Hostel"
                value={customLabel}
                onChangeText={setCustomLabel}
              />
            ) : null}
            <AppInput
              label="Full Name"
              placeholder="Recipient name"
              value={name}
              onChangeText={setName}
              containerStyle={styles.inputSpacing}
            />
            <AppInput
              label="Phone"
              placeholder="Phone number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <AppInput
              label="Address Line 1"
              placeholder="House no, street"
              value={line1}
              onChangeText={setLine1}
            />
            <AppInput
              label="Address Line 2"
              placeholder="Area, landmark"
              value={line2}
              onChangeText={setLine2}
            />
            <AppInput
              label="City"
              placeholder="City"
              value={city}
              onChangeText={setCity}
            />
            <AppInput
              label="State"
              placeholder="State"
              value={stateName}
              onChangeText={setStateName}
            />
            <TouchableOpacity
              style={styles.defaultRow}
              onPress={() => setIsDefault((prev) => !prev)}
            >
              <Ionicons
                name={isDefault ? "star" : "star-outline"}
                size={18}
                color={
                  isDefault ? theme.colors.warningBright : theme.colors.textMuted
                }
              />
              <Text style={styles.defaultText}>Set as default address</Text>
            </TouchableOpacity>
            <AppInput
              label="Pincode"
              placeholder="Pincode"
              keyboardType="numeric"
              value={pincode}
              onChangeText={setPincode}
            />
            <AppButton
              title={saving ? "Saving..." : "Save Address"}
              onPress={handleSave}
              loading={saving}
              style={styles.submit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme) => {
  const base = getProfileBaseStyles(theme);
  return StyleSheet.create({
    ...base,
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 24,
      gap: 16,
    },
    formWrap: {
      flex: 1,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textMuted,
      marginBottom: 8,
    },
    labelRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 8,
      flexWrap: "wrap",
    },
    labelChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
    },
    labelChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    labelChipText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.text,
    },
    labelChipTextActive: {
      color: theme.colors.onPrimary,
    },
    inputSpacing: {
      marginTop: 0,
    },
    defaultRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
    },
    defaultText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.text,
    },
    submit: {
      marginTop: 16,
    },
  });
};
