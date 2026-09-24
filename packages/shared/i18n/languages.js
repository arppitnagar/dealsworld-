// Languages a user can pick in Profile -> Language. `code` is what gets
// saved as users/{uid}.preferredLanguage and sent to the backend as ?lang=
// (apps/backend/src/translation.js keeps its own copy of these codes).
//
// Deal titles/descriptions are machine-translated server-side for every
// language here. `uiTranslated` marks the ones that also have app-text
// strings in ./locales (and registered in ./translator.js) - a language
// without them falls back to English menus/buttons.
export const DEFAULT_LANGUAGE = "en";

export const LANGUAGES = [
  { code: "en", nativeName: "English", englishName: "English", uiTranslated: true },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", uiTranslated: true },
  { code: "mr", nativeName: "मराठी", englishName: "Marathi", uiTranslated: true },
  { code: "ta", nativeName: "தமிழ்", englishName: "Tamil", uiTranslated: true },
  { code: "te", nativeName: "తెలుగు", englishName: "Telugu", uiTranslated: true },
  { code: "kn", nativeName: "ಕನ್ನಡ", englishName: "Kannada", uiTranslated: true },
  { code: "bn", nativeName: "বাংলা", englishName: "Bengali", uiTranslated: true },
  { code: "gu", nativeName: "ગુજરાતી", englishName: "Gujarati", uiTranslated: true },
  { code: "ml", nativeName: "മലയാളം", englishName: "Malayalam", uiTranslated: true },
  { code: "pa", nativeName: "ਪੰਜਾਬੀ", englishName: "Punjabi", uiTranslated: true },
  { code: "or", nativeName: "ଓଡ଼ିଆ", englishName: "Odia", uiTranslated: true },
  { code: "as", nativeName: "অসমীয়া", englishName: "Assamese", uiTranslated: true },
  { code: "ur", nativeName: "اردو", englishName: "Urdu", uiTranslated: true, rtl: true },
];

const SUPPORTED_CODES = new Set(LANGUAGES.map((language) => language.code));

// Accepts "hi", "hi-IN", "HI_in" etc. Returns a supported code or null.
export function normalizeLanguage(value) {
  const base = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_CODES.has(base) ? base : null;
}

// Right-to-left script - flips the app layout (see ./layoutDirection.js).
export function isRTLLanguage(code) {
  return Boolean(LANGUAGES.find((language) => language.code === code)?.rtl);
}

export function getLanguageInfo(code) {
  return LANGUAGES.find((language) => language.code === code) || LANGUAGES[0];
}

// Device language without expo-localization (a native module - adding it
// would need a new EAS dev-client build). Hermes ships Intl, and this is
// only a first-launch default before the user picks one.
export function getDeviceLanguage() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return normalizeLanguage(locale) || DEFAULT_LANGUAGE;
  } catch (error) {
    return DEFAULT_LANGUAGE;
  }
}
