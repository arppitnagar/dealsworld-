import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "@dealsworld/shared";

export const StatCard = ({ title, count, color, width }) => (
  <View style={{ width: width }}>
    {/* Category Header */}
    <View
      style={{ backgroundColor: color }}
      className="h-10 rounded-t-2xl items-center justify-center px-1"
    >
      <Text className="text-[9px] font-black text-white uppercase tracking-tighter text-center">
        {title}
      </Text>
    </View>

    {/* Integrated Information Body */}
    <View
      style={styles.glassBody}
      className="h-32 rounded-b-2xl bg-white border-l border-r border-b border-slate-100 items-center justify-center"
    >
      <Text
        style={{ color: color }}
        className="text-3xl font-black tracking-tighter"
      >
        {count}
      </Text>
      <View className="absolute bottom-0 left-0 right-0 h-1/3 bg-slate-50/40 rounded-b-2xl" />
    </View>
  </View>
);

const styles = StyleSheet.create({
  glassBody: {
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
  },
});
