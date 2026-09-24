import React from "react";
import { useAuth } from "../context/AuthContext";
import { AuthScreen, useI18n } from "@dealsworld/shared";

export default function LoginScreen() {
  const { login, register, loginWithGoogle } = useAuth();
  const { t } = useI18n();
  return (
    <AuthScreen
      title={t("sellerAuth.title")}
      signupTitle={t("sellerAuth.signupTitle")}
      subtitle={t("auth.subtitle")}
      signupSubtitle={t("sellerAuth.signupSubtitle")}
      brandTitle="Seller Buddy"
      onLogin={login}
      onRegister={register}
      onGoogleLogin={loginWithGoogle}
      showAppleButton={false}
    />
  );
}
