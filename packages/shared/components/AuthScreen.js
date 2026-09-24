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
import { useI18n } from "../i18n/I18nProvider";
import { validatePassword } from "../utils/passwordPolicy";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_BG_IMAGE = null;

const AUTH_ERROR_KEYS = {
  "auth/invalid-email": "invalidEmail",
  "auth/missing-email": "missingEmail",
  "auth/user-not-found": "userNotFound",
  "auth/wrong-password": "wrongPassword",
  "auth/invalid-credential": "invalidCredential",
  "auth/user-disabled": "userDisabled",
  "auth/too-many-requests": "tooManyRequests",
  "auth/network-request-failed": "network",
  "auth/email-already-in-use": "emailInUse",
  "auth/weak-password": "weakPassword",
  "auth/operation-not-allowed": "notAllowed",
};

const getAuthErrorMessage = (error, mode, t) => {
  const key = AUTH_ERROR_KEYS[error?.code || ""];
  if (key) return t(`auth.errors.${key}`);
  return mode === "signup" ? t("auth.errors.signupFailed") : t("auth.errors.loginFailed");
};

export default function AuthScreen({
  backgroundImage = DEFAULT_BG_IMAGE,
  title,
  signupTitle,
  subtitle,
  signupSubtitle,
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
  signInLabel,
  signUpLabel,
  toggleToSignupLabel,
  toggleToSigninLabel,
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
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
      await alert({ title: t("common.missingDetails"), message: t("auth.enterEmailPassword") });
      return;
    }
    if (typeof onLogin !== "function") {
      await alert({ title: t("auth.unavailable"), message: t("auth.loginNotConfigured") });
      return;
    }
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
    } catch (error) {
      await alert({ title: t("auth.loginFailedTitle"), message: getAuthErrorMessage(error, "login", t), destructive: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      await alert({ title: t("common.missingDetails"), message: t("common.fillAllFields") });
      return;
    }
    if (password !== confirmPassword) {
      await alert({ title: t("changePassword.mismatchTitle"), message: t("auth.passwordsMismatch") });
      return;
    }
    const validationError = validatePassword(password, t);
    if (validationError) {
      await alert({ title: t("password.weakTitle"), message: validationError });
      return;
    }
    if (typeof onRegister !== "function") {
      await alert({ title: t("auth.unavailable"), message: t("auth.signupNotConfigured") });
      return;
    }
    setLoading(true);
    try {
      await onRegister(email.trim(), password);
    } catch (error) {
      await alert({ title: t("auth.signupFailedTitle"), message: getAuthErrorMessage(error, "signup", t), destructive: true });
    } finally {
      setLoading(false);
    }
  };

  const showSignup = allowSignup && typeof onRegister === "function";
  const resolvedTitle = title || t("auth.title");
  const displayTitle = isSignup ? signupTitle || resolvedTitle : resolvedTitle;
  const displaySubtitle = isSignup
    ? signupSubtitle || t("auth.signupSubtitle")
    : subtitle || t("auth.subtitle");

  const handleForgotPassword = async () => {
    if (typeof onForgotPassword === "function") {
      onForgotPassword(email.trim());
      return;
    }
    await alert({ title: t("auth.forgotTitle"), message: t("auth.forgotNotConfigured") });
  };

  const handleSocialLogin = async (provider) => {
    const handler =
      provider === "google"
        ? onGoogleLogin
        : provider === "apple"
          ? onAppleLogin
          : null;
    if (typeof handler !== "function") {
      await alert({ title: t("comingSoon.title"), message: t("auth.socialUnavailable") });
      return;
    }
    setLoading(true);
    try {
      await handler();
    } catch (error) {
      if (error?.code !== "SIGN_IN_CANCELLED" && error?.code !== "-5") {
        await alert({ title: t("auth.socialFailedTitle"), message: getAuthErrorMessage(error, "login", t), destructive: true });
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
              label={t("auth.emailLabel")}
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
              label={t("auth.passwordLabel")}
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
                label={t("changePassword.confirmLabel")}
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
              <Text style={styles.hint}>{t("password.rules")}</Text>
            ) : null}

            {!isSignup ? (
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotWrap}
              >
                <Text style={styles.forgotText}>{t("auth.forgotLink")}</Text>
              </TouchableOpacity>
            ) : null}

            <AppButton
              title={
                loading
                  ? isSignup
                    ? t("auth.creating")
                    : t("auth.signingIn")
                  : isSignup
                    ? signUpLabel || t("auth.signUp")
                    : signInLabel || t("auth.signIn")
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
                  <Text style={styles.dividerText}>{t("auth.orConnectWith")}</Text>
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
                  ? t("auth.haveAccount")
                  : t("auth.newTo", { brand: brandTitle })}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsSignup((prev) => !prev);
                  setConfirmPassword("");
                }}
              >
                <Text style={styles.footerLink}>
                  {isSignup
                    ? toggleToSigninLabel || t("auth.backToSignIn")
                    : toggleToSignupLabel || t("auth.createNewAccount")}
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
