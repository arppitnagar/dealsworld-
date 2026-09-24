import React, { useEffect, useMemo, useState } from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import { useTheme, useI18n, TopPageHeader, CitySearchList } from "@dealsworld/shared";
import { useUserProfile } from "../hooks/useUserProfile";
import apiClient from "../api/client";
import { getProfileBaseStyles } from "../styles/profileStyles";

// Body height for the city list - full-screen usage (unlike the seller's
// in-modal City picker) has a bounded ancestor chain all the way down from
// the screen, so it can afford a generous cap instead of a small fixed one.
const LIST_MAX_HEIGHT = Dimensions.get("window").height * 0.7;

export default function DefaultLocationScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profile, updateProfile } = useUserProfile();
  const { t } = useI18n();
  const [cities, setCities] = useState([]);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/deals/cities")
      .then(({ data }) => {
        if (!cancelled) setCities(data?.cities || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = (city) => {
    updateProfile({ defaultLocation: city || null });
    navigation.goBack();
  };

  return (
    <View style={styles.screen}>
      <TopPageHeader
        title={t("profile.defaultLocation")}
        onBack={() => navigation.goBack()}
        rounded
      />
      <View style={styles.body}>
        <CitySearchList
          cities={cities}
          selectedCity={profile?.defaultLocation || null}
          showAllOption
          allOptionLabel={t("common.allCities")}
          maxHeight={LIST_MAX_HEIGHT}
          onSelect={handleSelect}
        />
      </View>
    </View>
  );
}

const createStyles = (theme) => {
  const base = getProfileBaseStyles(theme);
  return StyleSheet.create({
    ...base,
    body: {
      paddingHorizontal: 20,
      paddingTop: 16,
      flex: 1,
    },
  });
};
