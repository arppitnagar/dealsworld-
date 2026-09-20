import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useTheme,
  TopPageHeader,
  AppInput,
  AppButton,
  DEAL_CATEGORIES,
} from "@dealsworld/shared";
import { useUserProfile } from "../hooks/useUserProfile";
import { getProfileBaseStyles } from "../styles/profileStyles";

export default function NotificationPreferencesScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profile, loading, updateProfile } = useUserProfile();

  const [enabled, setEnabled] = useState(true);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [cityInput, setCityInput] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // useUserProfile()'s Firestore listener is still async on first mount, so
  // `profile` is null for the initial render(s). Seeding the useState calls
  // above from it directly would freeze on that null/default forever, since
  // a useState initializer only runs once - it never gets corrected when the
  // real profile arrives a tick later. Sync explicitly, once, when loading
  // finishes.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || loading) return;
    initializedRef.current = true;
    const prefs = profile?.notificationPrefs;
    const isEnabled = prefs?.enabled !== false;
    setEnabled(isEnabled);
    // Sub-filters are meaningless while disabled - don't surface stale
    // values from before this buyer turned notifications off (or from data
    // saved prior to the toggle-off-clears-filters fix).
    setCategories(isEnabled ? prefs?.categories || [] : []);
    setCities(isEnabled ? prefs?.cities || [] : []);
    setMinPrice(isEnabled && prefs?.minPrice != null ? String(prefs.minPrice) : "");
    setMaxPrice(isEnabled && prefs?.maxPrice != null ? String(prefs.maxPrice) : "");
  }, [loading, profile]);

  const handleToggleEnabled = (value) => {
    setEnabled(value);
    if (!value) {
      // Sub-filters are meaningless once notifications are off - clear them
      // so there's no stale category/city/price selection left behind that
      // would resurface confusingly if the buyer flips the switch back on.
      setCategories([]);
      setCities([]);
      setCityInput("");
      setMinPrice("");
      setMaxPrice("");
    }
  };

  const toggleCategory = (label) => {
    setCategories((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label],
    );
  };

  const addCity = () => {
    const value = cityInput.trim();
    if (!value) return;
    setCities((prev) =>
      prev.some((c) => c.toLowerCase() === value.toLowerCase())
        ? prev
        : [...prev, value],
    );
    setCityInput("");
  };

  const removeCity = (city) => {
    setCities((prev) => prev.filter((item) => item !== city));
  };

  const handleSave = async () => {
    const min = minPrice.trim() === "" ? null : Number(minPrice);
    const max = maxPrice.trim() === "" ? null : Number(maxPrice);
    if (min != null && Number.isNaN(min)) {
      Alert.alert("Invalid price", "Minimum price must be a number.");
      return;
    }
    if (max != null && Number.isNaN(max)) {
      Alert.alert("Invalid price", "Maximum price must be a number.");
      return;
    }
    if (min != null && max != null && min > max) {
      Alert.alert("Invalid price range", "Minimum price can't be greater than maximum price.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        notificationPrefs: {
          enabled,
          categories,
          cities,
          minPrice: min,
          maxPrice: max,
        },
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert("Couldn't save", error.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <TopPageHeader
        title="Notification Preference"
        onBack={() => navigation.goBack()}
        rounded
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroAccent} />
          <Text style={styles.heroTitle}>Only hear about deals you want</Text>
          <Text style={styles.heroSubtitle}>
            Choose a city, category, or price range and we'll only notify you
            about new deals that match. Payment and delivery updates always
            reach you.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextWrap}>
              <Text style={styles.rowTitle}>New deal notifications</Text>
              <Text style={styles.rowSubtitle}>
                Turn off to stop new-deal alerts entirely.
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.onPrimary}
            />
          </View>
        </View>

        <View
          style={[styles.card, !enabled && styles.cardDisabled]}
          pointerEvents={enabled ? "auto" : "none"}
        >
          <Text style={styles.sectionTitle}>Categories</Text>
          <Text style={styles.sectionHint}>
            Leave all unselected to get every category.
          </Text>
          <View style={styles.chipWrap}>
            {DEAL_CATEGORIES.map((category) => {
              const isSelected = categories.includes(category.label);
              return (
                <TouchableOpacity
                  key={category.label}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => toggleCategory(category.label)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.chipEmoji}>{category.icon}</Text>
                  <Text
                    style={[
                      styles.chipLabel,
                      isSelected && styles.chipLabelActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                  {isSelected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={theme.colors.onPrimary}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View
          style={[styles.card, !enabled && styles.cardDisabled]}
          pointerEvents={enabled ? "auto" : "none"}
        >
          <Text style={styles.sectionTitle}>Cities</Text>
          <Text style={styles.sectionHint}>
            Leave empty to get deals from every city.
          </Text>
          <View style={styles.cityInputRow}>
            <AppInput
              containerStyle={styles.cityInput}
              placeholder="e.g. Pune"
              value={cityInput}
              onChangeText={setCityInput}
              onSubmitEditing={addCity}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addCityButton} onPress={addCity}>
              <Ionicons name="add" size={20} color={theme.colors.onPrimary} />
            </TouchableOpacity>
          </View>
          {cities.length ? (
            <View style={styles.chipWrap}>
              {cities.map((city) => (
                <View key={city} style={[styles.chip, styles.chipActive]}>
                  <Text style={[styles.chipLabel, styles.chipLabelActive]}>
                    {city}
                  </Text>
                  <TouchableOpacity onPress={() => removeCity(city)}>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={theme.colors.onPrimary}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View
          style={[styles.card, !enabled && styles.cardDisabled]}
          pointerEvents={enabled ? "auto" : "none"}
        >
          <Text style={styles.sectionTitle}>Price range</Text>
          <Text style={styles.sectionHint}>
            Leave blank for no lower or upper limit.
          </Text>
          <View style={styles.priceRow}>
            <AppInput
              containerStyle={styles.priceInput}
              label="Min (₹)"
              placeholder="0"
              keyboardType="numeric"
              value={minPrice}
              onChangeText={setMinPrice}
            />
            <AppInput
              containerStyle={styles.priceInput}
              label="Max (₹)"
              placeholder="No limit"
              keyboardType="numeric"
              value={maxPrice}
              onChangeText={setMaxPrice}
            />
          </View>
        </View>

        <AppButton
          title="Save Preferences"
          onPress={handleSave}
          loading={saving}
        />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme) => {
  const base = getProfileBaseStyles(theme);
  return StyleSheet.create({
    ...base,
    card: {
      ...base.card,
      gap: 10,
    },
    cardDisabled: {
      opacity: 0.45,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.colors.text,
    },
    sectionHint: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: -4,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    switchTextWrap: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.text,
    },
    rowSubtitle: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
    },
    chipActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary,
    },
    chipEmoji: {
      fontSize: 14,
    },
    chipLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.text,
    },
    chipLabelActive: {
      color: theme.colors.onPrimary,
    },
    cityInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    cityInput: {
      flex: 1,
      marginTop: 0,
    },
    addCityButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    priceRow: {
      flexDirection: "row",
      gap: 12,
    },
    priceInput: {
      flex: 1,
    },
  });
};
