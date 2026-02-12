import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Eye, EyeOff } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

export default function MockAuthScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UX Improvement: Inline validation state instead of Alerts
  const [errors, setErrors] = useState({ email: "", password: "" });

  const validate = () => {
    let valid = true;
    let newErrors = { email: "", password: "" };

    if (!email.includes("@")) {
      newErrors.email = "Please enter a valid email address.";
      valid = false;
    }
    if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = () => {
    if (validate()) {
      console.log("Form valid, submitting...");
    }
  };

  // Dynamic styles based on theme
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background || "#FFFFFF",
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    header: {
      marginTop: 40,
      marginBottom: 32,
    },
    logoContainer: {
      width: 50,
      height: 50,
      borderRadius: 16,
      backgroundColor: (theme.colors.primary || "#007AFF") + "20", // 20% opacity
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 32,
      fontWeight: "800",
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textMuted,
      lineHeight: 24,
    },
    form: {
      gap: 20,
    },
    inputGroup: {
      gap: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text,
      marginLeft: 4,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface || "#F2F2F7",
      borderRadius: 16,
      paddingHorizontal: 16,
      height: 56,
      borderWidth: 1,
      borderColor: "transparent",
    },
    inputError: {
      borderColor: theme.colors.error || "#FF3B30",
      backgroundColor: (theme.colors.error || "#FF3B30") + "10",
    },
    inputIcon: {
      marginRight: 12,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      height: "100%",
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.error || "#FF3B30",
      marginLeft: 4,
      marginTop: 4,
    },
    button: {
      backgroundColor: theme.colors.primary,
      height: 56,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
    footer: {
      marginTop: "auto",
      paddingTop: 32,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    footerText: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    footerLink: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.primary,
    },
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons
                name="bag-handle"
                size={28}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.title}>
              {isSignup ? "Create Account" : "Welcome Back"}
            </Text>
            <Text style={styles.subtitle}>
              {isSignup
                ? "Join Deal Buddy to start saving today."
                : "Sign in to continue to Deal Buddy."}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.email && styles.inputError,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="hello@example.com"
                  placeholderTextColor={theme.colors.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: "" });
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.password && styles.inputError,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.textMuted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: "" });
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={theme.colors.textMuted} />
                  ) : (
                    <Eye size={20} color={theme.colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>
                {isSignup ? "Sign Up" : "Sign In"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignup
                ? "Already have an account? "
                : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={() => setIsSignup(!isSignup)}>
              <Text style={styles.footerLink}>
                {isSignup ? "Sign In" : "Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
