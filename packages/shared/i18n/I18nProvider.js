import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LANGUAGE,
  getDeviceLanguage,
  isRTLLanguage,
  normalizeLanguage,
} from "./languages";
import { applyLayoutDirection } from "./layoutDirection";
import { getStoredLanguage, setStoredLanguage } from "./languageStorage";
import { createTranslator } from "./translator";

// Default value doubles as the "no provider" case - shared components that
// call useI18n() still render English in an app that hasn't wrapped itself
// in <I18nProvider> yet (seller, admin).
const I18nContext = createContext({
  language: DEFAULT_LANGUAGE,
  hydrated: true,
  isRTL: false,
  needsRestart: false,
  setLanguage: () => {},
  t: createTranslator(DEFAULT_LANGUAGE),
});

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getDeviceLanguage);
  const [hydrated, setHydrated] = useState(false);
  const [needsRestart, setNeedsRestart] = useState(false);
  const isRTL = isRTLLanguage(language);

  useEffect(() => {
    if (!hydrated) return;
    setNeedsRestart(applyLayoutDirection(isRTL));
  }, [hydrated, isRTL]);

  useEffect(() => {
    let isActive = true;
    getStoredLanguage().then((stored) => {
      if (!isActive) return;
      if (stored) setLanguageState(stored);
      setHydrated(true);
    });
    return () => {
      isActive = false;
    };
  }, []);

  const setLanguage = useCallback((code) => {
    const next = normalizeLanguage(code);
    if (!next) return;
    setLanguageState(next);
    setStoredLanguage(next);
  }, []);

  const value = useMemo(
    () => ({
      language,
      hydrated,
      isRTL,
      needsRestart,
      setLanguage,
      t: createTranslator(language),
    }),
    [language, hydrated, isRTL, needsRestart, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
