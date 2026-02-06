import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import AppButton from "./ui/AppButton";
import AppInput from "./ui/AppInput";
import { useTheme } from "../theme/ThemeProvider";
import { validatePassword } from "../utils/passwordPolicy";

const DEFAULT_HERO_IMAGE = require("./ui/DealBuddy Splash Screen Dark Mode 1080x1920.png");
const DEFAULT_BG_IMAGE = require("./ui/DealBuddy Splash Screen Dark Mode 1080x1920.png");

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
  heroImage = DEFAULT_HERO_IMAGE,
  backgroundImage = DEFAULT_BG_IMAGE,
  title = "Welcome To DealBuddy",
  signupTitle,
  subtitle = "Sign in to continue",
  signupSubtitle = "Create your account",
  onLogin,
  onRegister,
  allowSignup = true,
  signInLabel = "Sign In",
  signUpLabel = "Create Account",
  toggleToSignupLabel = "Create a new account",
  toggleToSigninLabel = "Back to Sign In",
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Please enter email and password.");
      return;
    }
    if (typeof onLogin !== "function") {
      Alert.alert("Unavailable", "Login is not configured.");
      return;
    }
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
    } catch (error) {
      Alert.alert("Login failed", getAuthErrorMessage(error, "login"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert("Missing details", "Please fill all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    const validationError = validatePassword(password);
    if (validationError) {
      Alert.alert("Weak password", validationError);
      return;
    }
    if (typeof onRegister !== "function") {
      Alert.alert("Unavailable", "Sign up is not configured.");
      return;
    }
    setLoading(true);
    try {
      await onRegister(email.trim(), password);
    } catch (error) {
      Alert.alert("Sign up failed", getAuthErrorMessage(error, "signup"));
    } finally {
      setLoading(false);
    }
  };

  const showSignup = allowSignup && typeof onRegister === "function";
  const displayTitle = isSignup ? signupTitle || title : title;
  const displaySubtitle = isSignup ? signupSubtitle : subtitle;

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.screen}
      imageStyle={styles.screenImage}
      resizeMode="cover"
    >
      <View style={styles.backdrop} />
      <View style={styles.content}>
        <View style={styles.card}>
        <Text style={styles.title}>{displayTitle}</Text>
        <Text style={styles.subtitle}>{displaySubtitle}</Text>
        <AppInput
          label="Email"
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          containerStyle={styles.inputSpacing}
        />
        <AppInput
          label="Password"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          rightElement={
            showPassword ? (
              <EyeOff size={18} color={theme.colors.primary} />
            ) : (
              <Eye size={18} color={theme.colors.textMuted} />
            )
          }
          onRightPress={() => setShowPassword((prev) => !prev)}
        />
        {showSignup && isSignup ? (
          <AppInput
            label="Confirm Password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            rightElement={
              showPassword ? (
                <EyeOff size={18} color={theme.colors.primary} />
              ) : (
                <Eye size={18} color={theme.colors.textMuted} />
              )
            }
            onRightPress={() => setShowPassword((prev) => !prev)}
          />
        ) : null}
        {showSignup && isSignup ? (
          <Text style={styles.hint}>
            Minimum 8 chars with upper case, lower case, number, and special
            character.
          </Text>
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
          style={styles.submit}
        />
        {showSignup ? (
          <AppButton
            title={isSignup ? toggleToSigninLabel : toggleToSignupLabel}
            onPress={() => {
              setIsSignup((prev) => !prev);
              setConfirmPassword("");
            }}
            variant="secondary"
            style={styles.secondary}
          />
        ) : null}
        </View>
      </View>
    </ImageBackground>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.dashboardBg,
    },
    screenImage: {
      width: "100%",
      height: "100%",
      opacity: 0.95,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.overlaySoft,
    },
    content: {
      flex: 1,
      padding: 24,
      justifyContent: "center",
    },
    card: {
      backgroundColor: "transparent",
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    },
    heroImage: {
      width: "100%",
      height: 140,
      marginBottom: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.colors.text,
    },
    subtitle: {
      marginTop: 6,
      color: theme.colors.textMuted,
      fontSize: 13,
      marginBottom: 12,
    },
    inputSpacing: {
      marginTop: 0,
    },
    submit: {
      marginTop: 16,
    },
    secondary: {
      marginTop: 12,
    },
    hint: {
      marginTop: 8,
      fontSize: 11,
      color: theme.colors.textMuted,
    },
  });
