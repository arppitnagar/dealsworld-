import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

/**
 * Custom bottom tab bar, passed as `tabBar={(props) => <BottomTabBar {...props} tabs={TAB_CONFIG} />}`
 * to a React Navigation `Tab.Navigator`. Default bottom-tabs chrome doesn't
 * match the app's rounded/pill/FAB look, so this owns rendering entirely.
 *
 * `tabs` is an array, one entry per `Tab.Screen`, in the same order:
 *   {
 *     key: string,                              // matches the Tab.Screen name
 *     label: string,
 *     icon: (focused: boolean, color: string) => ReactNode,
 *     isFab?: boolean,                          // renders as a raised circular button instead of a normal tab item
 *     onPress?: (navigation) => void,           // overrides the default tab switch (used by the FAB entry)
 *   }
 */
export default function BottomTabBar({ state, navigation, tabs }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      {state.routes.map((route, index) => {
        const config = tabs[index];
        if (!config) return null;
        const focused = state.index === index;
        const color = focused ? theme.colors.primary : theme.colors.textMuted;

        const handlePress = () => {
          if (config.onPress) {
            config.onPress(navigation);
            return;
          }
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (config.isFab) {
          return (
            <View key={route.key} style={styles.fabSlot}>
              <TouchableOpacity
                style={styles.fabTouchable}
                activeOpacity={0.85}
                onPress={handlePress}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryDeep]}
                  style={styles.fab}
                >
                  {config.icon(focused, theme.colors.onPrimary)}
                </LinearGradient>
              </TouchableOpacity>
              <Text style={[styles.fabLabel, { color: theme.colors.primary }]}>
                {config.label}
              </Text>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            style={[styles.item, focused ? styles.itemActive : null]}
            activeOpacity={0.75}
            onPress={handlePress}
          >
            {config.icon(focused, color)}
            <Text style={[styles.label, { color }]}>{config.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 14,
      paddingTop: 12,
      ...theme.shadow.card,
    },
    item: {
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
    },
    itemActive: {
      backgroundColor: theme.colors.primaryTintBg,
    },
    label: {
      fontSize: 10,
      fontWeight: "700",
    },
    fabSlot: {
      alignItems: "center",
      gap: 5,
      marginTop: -26,
    },
    fabTouchable: {
      borderRadius: 26,
    },
    fab: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 4,
      borderColor: theme.colors.surface,
      ...theme.shadow.card,
    },
    fabLabel: {
      fontSize: 10,
      fontWeight: "800",
    },
  });
