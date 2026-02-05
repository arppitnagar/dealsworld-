import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { AppInput, AppButton, theme, formStyles } from "@dealsworld/shared";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Error", "Fill all fields");
    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seller Login</Text>
      <AppInput
        label="Email"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        containerStyle={{ marginTop: 0 }}
      />
      <AppInput
        label="Password"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <AppButton
        title="Sign In"
        onPress={handleLogin}
        loading={loading}
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...formStyles.screen,
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  title: {
    ...formStyles.heading,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: theme.spacing.xl,
  },
  submit: {
    marginTop: theme.spacing.lg,
  },
});
