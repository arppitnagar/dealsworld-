import React from "react";
import { AuthScreen } from "@dealsworld/shared";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login, register, loginWithGoogle } = useAuth();

  return (
    <AuthScreen
      title="Welcome To DealBuddy"
      subtitle="Sign in to continue"
      signupSubtitle="Create your account"
      onLogin={login}
      onRegister={register}
      onGoogleLogin={loginWithGoogle}
      showAppleButton={false}
    />
  );
}
