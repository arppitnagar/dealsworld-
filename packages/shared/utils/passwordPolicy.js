import { englishT } from "../i18n/translator";

// `t` is useI18n()'s translator; English when omitted.
export function validatePassword(value, t = englishT) {
  if (value.length < 8) {
    return t("password.tooShort");
  }
  if (!/[A-Z]/.test(value)) {
    return t("password.needsUpper");
  }
  if (!/[a-z]/.test(value)) {
    return t("password.needsLower");
  }
  if (!/[0-9]/.test(value)) {
    return t("password.needsNumber");
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    return t("password.needsSpecial");
  }
  return "";
}
