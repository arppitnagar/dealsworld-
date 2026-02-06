import React from "react";
import { useAuth } from "../context/AuthContext";
import { AuthScreen } from "@dealsworld/shared";

export default function LoginScreen() {
  const { login, register } = useAuth();
  return (
    <AuthScreen
      title="Seller Login"
      signupTitle="Create Seller Account"
      subtitle="Sign in to continue"
      signupSubtitle="Create your seller account"
      onLogin={login}
      onRegister={register}
    />
  );
}
