import { useEffect, useRef } from "react";
import { useI18n } from "./I18nProvider";
import { normalizeLanguage } from "./languages";

// Keeps the app language and users/{uid}.preferredLanguage in step. The
// local copy (I18nProvider's AsyncStorage) is what the app opens with; the
// profile is what follows the user across devices, so a profile value that
// changes (e.g. picked on another phone) wins. Only reacts to the profile
// value changing, not to it merely differing - otherwise a local pick would
// be undone by the not-yet-updated snapshot in between.
//
// Each app passes its own useUserProfile() result (buyer and seller have
// separate profile hooks).
export default function useLanguageProfileSync(profile, updateProfile) {
  const { language, hydrated, setLanguage } = useI18n();
  const lastProfileLanguageRef = useRef(undefined);
  const profileLanguage = normalizeLanguage(profile?.preferredLanguage);

  useEffect(() => {
    if (!hydrated || !profile?.id) return;
    if (!profileLanguage) {
      // First run for this account - save whatever the app opened with
      // (stored pick, else the device language).
      Promise.resolve(updateProfile({ preferredLanguage: language })).catch(() => {});
      lastProfileLanguageRef.current = language;
      return;
    }
    if (profileLanguage === lastProfileLanguageRef.current) return;
    lastProfileLanguageRef.current = profileLanguage;
    if (profileLanguage !== language) setLanguage(profileLanguage);
  }, [hydrated, profile?.id, profileLanguage, language, setLanguage, updateProfile]);
}
