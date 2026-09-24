import React from "react";
import { AuthScreen } from "@dealsworld/shared";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login, register, loginWithGoogle } = useAuth();

  return (
    <AuthScreen
      brandTitle="DealBuddy"
      onLogin={login}
      onRegister={register}
      onGoogleLogin={loginWithGoogle}
      showAppleButton={false}
    />
  );
}
