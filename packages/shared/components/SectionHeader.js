import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme/theme";
import { sectionStyles } from "../styles/sections";

export default function SectionHeader({ title, subtitle, right }) {
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

const styles = StyleSheet.create({
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
});
