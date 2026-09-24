import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { getStatusToken } from "../utils/statusTokens";
import { useI18n } from "../i18n/I18nProvider";

export default function StatusPill({
  label,
  color,
  status,
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        pill: {
          alignSelf: "flex-start",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 999,
        },
        text: {
          fontSize: 10,
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 1,
        },
      }),
    [theme],
  );
  const token = status ? getStatusToken(status, theme) : null;
  const tokenLabel = token?.label
    ? t(`status.${String(status).toLowerCase()}`, { defaultValue: token.label })
    : null;
  const resolvedLabel = label || tokenLabel || t("status.fallback");
  const resolvedColor = color || token?.color || theme.colors.primary;
  const bg = token?.bg || resolvedColor + "15";
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: resolvedColor }]}>{resolvedLabel}</Text>
    </View>
  );
}
