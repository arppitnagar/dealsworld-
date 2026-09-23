import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "./ui/AppButton";
import AppInput from "./ui/AppInput";
import ConfirmModal from "./ui/ConfirmModal";
import useConfirmModal from "../hooks/useConfirmModal";
import { useTheme } from "../theme/ThemeProvider";
import { validatePassword } from "../utils/passwordPolicy";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_BG_IMAGE = null;

const getAuthErrorMessage = (error, mode) => {
  const code = error?.code || "";
  const isSignup = mode === "signup";

  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/missing-email":
      return "Email is required to continue.";
    case "auth/user-not-found":
      return "No account found for this email.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    case "auth/email-already-in-use":
      return "This email is already registered. Try signing in.";
    case "auth/weak-password":
      return "Password is too weak. Please choose a stronger password.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled.";
    default:
      return isSignup
        ? "Unable to sign up right now. Please try again."
        : "Unable to sign in right now. Please try again.";
  }
};

export default function AuthScreen({
  backgroundImage = DEFAULT_BG_IMAGE,
  title = "Welcome To Deal Buddy",
  signupTitle,
  subtitle = "Sign in to continue",
  signupSubtitle = "Create your account",
  brandTitle = "Deal Buddy",
  brandTagline = "Together, We Can Save More",
  onLogin,
  onRegister,
  onForgotPassword,
  onGoogleLogin,
  onAppleLogin,
  showSocialButtons = true,
  showGoogleButton = true,
  showAppleButton = true,
  allowSignup = true,
  signInLabel = "Sign In",
  signUpLabel = "Create Account",
  toggleToSignupLabel = "Create a new account",
  toggleToSigninLabel = "Back to Sign In",
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { alert, confirmModalProps } = useConfirmModal();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      await alert({ title: "Missing details", message: "Please enter email and password." });
      return;
    }
    if (typeof onLogin !== "function") {
      await alert({ title: "Unavailable", message: "Login is not configured." });
      return;
    }
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
    } catch (error) {
      await alert({ title: "Login failed", message: getAuthErrorMessage(error, "login"), destructive: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      await alert({ title: "Missing details", message: "Please fill all fields." });
      return;
    }
    if (password !== confirmPassword) {
      await alert({ title: "Mismatch", message: "Passwords do not match." });
      return;
    }
    const validationError = validatePassword(password);
    if (validationError) {
      await alert({ title: "Weak password", message: validationError });
      return;
    }
    if (typeof onRegister !== "function") {
      await alert({ title: "Unavailable", message: "Sign up is not configured." });
      return;
    }
    setLoading(true);
    try {
      await onRegister(email.trim(), password);
    } catch (error) {
      await alert({ title: "Sign up failed", message: getAuthErrorMessage(error, "signup"), destructive: true });
    } finally {
      setLoading(false);
    }
  };

  const showSignup = allowSignup && typeof onRegister === "function";
  const displayTitle = isSignup ? signupTitle || title : title;
  const displaySubtitle = isSignup ? signupSubtitle : subtitle;

  const handleForgotPassword = async () => {
    if (typeof onForgotPassword === "function") {
      onForgotPassword(email.trim());
      return;
    }
    await alert({ title: "Forgot password", message: "Password reset is not configured yet." });
  };

  const handleSocialLogin = async (provider) => {
    const handler =
      provider === "google"
        ? onGoogleLogin
        : provider === "apple"
          ? onAppleLogin
          : null;
    if (typeof handler !== "function") {
      await alert({ title: "Coming soon", message: "Social login is not available yet." });
      return;
    }
    setLoading(true);
    try {
      await handler();
    } catch (error) {
      if (error?.code !== "SIGN_IN_CANCELLED" && error?.code !== "-5") {
        await alert({ title: "Sign-in failed", message: getAuthErrorMessage(error, "login"), destructive: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const Wrapper = backgroundImage ? ImageBackground : View;
  const wrapperProps = backgroundImage
    ? { source: backgroundImage, resizeMode: "cover" }
    : {};

  return (
    <Wrapper style={styles.screen} {...wrapperProps}>
      <View style={styles.meshBackground}>
        <View style={styles.meshOrbPrimary} />
        <View style={styles.meshOrbAccent} />
        <View style={styles.meshOrbSoft} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(insets.top, 24),
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandBlock}>
            <View style={styles.brandLogo}>
              <Ionicons
                name="bag-handle"
                size={28}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.brandTitle}>{brandTitle}</Text>
            <Text style={styles.brandTagline}>{brandTagline}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{displayTitle}</Text>
              <Text style={styles.subtitle}>{displaySubtitle}</Text>
            </View>

            <AppInput
              label="Email Address"
              placeholder="hello@dealbuddy.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              containerStyle={styles.inputSpacing}
              labelStyle={styles.inputLabel}
              inputStyle={styles.input}
              leftElement={
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={theme.colors.textMuted}
                />
              }
            />

            <AppInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              labelStyle={styles.inputLabel}
              inputStyle={styles.input}
              leftElement={
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={theme.colors.textMuted}
                />
              }
              rightElement={
                showPassword ? (
                  <EyeOff size={18} color={theme.colors.primary} />
                ) : (
                  <Eye size={18} color={theme.colors.textMuted} />
                )
              }
              onRightPress={() => setShowPassword((prev) => !prev)}
              rightContainerStyle={styles.eyeButton}
            />

            {showSignup && isSignup ? (
              <AppInput
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                labelStyle={styles.inputLabel}
                inputStyle={styles.input}
                leftElement={
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={theme.colors.textMuted}
                  />
                }
                rightElement={
                  showPassword ? (
                    <EyeOff size={18} color={theme.colors.primary} />
                  ) : (
                    <Eye size={18} color={theme.colors.textMuted} />
                  )
                }
                onRightPress={() => setShowPassword((prev) => !prev)}
                rightContainerStyle={styles.eyeButton}
              />
            ) : null}

            {showSignup && isSignup ? (
              <Text style={styles.hint}>
                Minimum 8 chars with upper case, lower case, number, and special
                character.
              </Text>
            ) : null}

            {!isSignup ? (
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotWrap}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            ) : null}

            <AppButton
              title={
                loading
                  ? isSignup
                    ? "Creating..."
                    : "Signing in..."
                  : isSignup
                    ? signUpLabel
                    : signInLabel
              }
              onPress={isSignup ? handleSignup : handleLogin}
              loading={loading}
              compact
              style={styles.submit}
              textStyle={styles.submitText}
            />

            {showSocialButtons ? (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Or connect with</Text>
                  <View style={styles.dividerLine} />
                </View>
                <View style={styles.socialRow}>
                  {showGoogleButton ? (
                    <TouchableOpacity
                      style={styles.socialButtonLight}
                      onPress={() => handleSocialLogin("google")}
                      disabled={loading}
                    >
                      <Ionicons
                        name="logo-google"
                        size={18}
                        color={theme.colors.text}
                      />
                      <Text style={styles.socialTextDark}>Google</Text>
                    </TouchableOpacity>
                  ) : null}
                  {showAppleButton ? (
                    <TouchableOpacity
                      style={styles.socialButtonDark}
                      onPress={() => handleSocialLogin("apple")}
                      disabled={loading}
                    >
                      <Ionicons
                        name="logo-apple"
                        size={18}
                        color={theme.colors.onPrimary}
                      />
                      <Text style={styles.socialTextLight}>Apple</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>

          {showSignup ? (
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                {isSignup
                  ? "Already have an account?"
                  : `New to ${brandTitle}?`}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsSignup((prev) => !prev);
                  setConfirmPassword("");
                }}
              >
                <Text style={styles.footerLink}>
                  {isSignup ? toggleToSigninLabel : toggleToSignupLabel}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal {...confirmModalProps} />
    </Wrapper>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.primary,
    },
    meshBackground: {
      ...StyleSheet.absoluteFillObject,
    },
    meshOrbPrimary: {
      position: "absolute",
      top: -80,
      left: -60,
      width: 220,
      height: 220,
      borderRadius: 120,
      backgroundColor: theme.colors.onPrimary,
      opacity: 0.18,
    },
    meshOrbAccent: {
      position: "absolute",
      bottom: -100,
      right: -80,
      width: 260,
      height: 260,
      borderRadius: 160,
      backgroundColor: theme.colors.purple,
      opacity: 0.25,
    },
    meshOrbSoft: {
      position: "absolute",
      top: "35%",
      right: -60,
      width: 180,
      height: 180,
      borderRadius: 120,
      backgroundColor: theme.colors.primary,
      opacity: 0.2,
    },
    keyboardWrap: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 32,
      justifyContent: "center",
      gap: 20,
    },
    brandBlock: {
      alignItems: "center",
      gap: 6,
    },
    brandLogo: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: theme.colors.onPrimary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.colors.text,
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    brandTitle: {
      fontSize: 26,
      fontWeight: "800",
      color: theme.colors.onPrimary,
      letterSpacing: 0.4,
    },
    brandTagline: {
      fontSize: 12,
      color: theme.colors.onPrimaryMuted,
      fontWeight: "600",
    },
    card: {
      backgroundColor: theme.colors.surfaceGlassStrong,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.colors.onPrimarySoft,
      ...theme.shadow.card,
      gap: 8,
    },
    cardHeader: {
      marginBottom: 6,
    },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: theme.colors.text,
    },
    subtitle: {
      marginTop: 4,
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    inputSpacing: {
      marginTop: 0,
    },
    inputLabel: {
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
      color: theme.colors.textMuted,
      marginLeft: 6,
    },
    input: {
      backgroundColor: theme.colors.surfaceGlass,
      borderWidth: 0,
      borderRadius: 999,
      paddingVertical: 14,
      paddingLeft: 44,
      color: theme.colors.text,
    },
    eyeButton: {
      backgroundColor: theme.colors.surfaceLight,
    },
    forgotWrap: {
      alignItems: "flex-end",
      marginTop: 4,
    },
    forgotText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    submit: {
      marginTop: 12,
      borderRadius: 20,
    },
    submitText: {
      fontWeight: "800",
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 18,
      marginBottom: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    socialRow: {
      flexDirection: "row",
      gap: 12,
    },
    socialButtonLight: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    socialButtonDark: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 12,
      backgroundColor: theme.colors.text,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    socialTextDark: {
      color: theme.colors.text,
      fontSize: 12,
      fontWeight: "700",
    },
    socialTextLight: {
      color: theme.colors.onPrimary,
      fontSize: 12,
      fontWeight: "700",
    },
    footerRow: {
      alignItems: "center",
      gap: 6,
    },
    footerText: {
      color: theme.colors.onPrimaryMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    footerLink: {
      color: theme.colors.onPrimary,
      fontSize: 12,
      fontWeight: "800",
      textDecorationLine: "underline",
    },
    hint: {
      marginTop: 6,
      fontSize: 11,
      color: theme.colors.textMuted,
    },
  });
