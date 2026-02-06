import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { getSectionStyles } from "../styles/sections";
import { useTheme } from "../theme/ThemeProvider";

export default function SectionHeader({ title, subtitle, right }) {
  const { theme } = useTheme();
  const sectionStyles = useMemo(() => getSectionStyles(theme), [theme]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          ...sectionStyles.row,
        },
        title: {
          ...sectionStyles.title,
        },
        subtitle: {
          ...sectionStyles.subtitle,
          marginTop: 4,
        },
      }),
    [sectionStyles],
  );
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}
