import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState, useTheme } from "@dealsworld/shared";

// Placeholder tab content for tabs that don't have a real screen yet
// (Deals, Chat). Functional, non-crashing, swapped out for the real
// screen in a later pass.
export default function ComingSoonScreen({ route }) {
  const { theme } = useTheme();
  const title = route?.params?.title || "Coming soon";
  const subtitle =
    route?.params?.subtitle || "This screen is on its way.";
  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: "center",
        },
      }),
    [theme],
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <EmptyState icon="construct-outline" title={title} subtitle={subtitle} />
    </SafeAreaView>
  );
}
