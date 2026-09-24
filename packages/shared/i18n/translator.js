import { DEFAULT_LANGUAGE } from "./languages";
import en from "./locales/en";
import hi from "./locales/hi";
import mr from "./locales/mr";
import ta from "./locales/ta";
import te from "./locales/te";
import kn from "./locales/kn";
import bn from "./locales/bn";
import gu from "./locales/gu";
import ml from "./locales/ml";
import pa from "./locales/pa";
import ori from "./locales/or";
import asm from "./locales/as";
import ur from "./locales/ur";

// App-text dictionaries. A language missing here (or a key missing from its
// dictionary) falls back to English, so a half-translated locale never
// shows raw keys.
const DICTIONARIES = { en, hi, mr, ta, te, kn, bn, gu, ml, pa, or: ori, as: asm, ur };

function lookup(dictionary, key) {
  return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dictionary);
}

function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    vars[name] === undefined || vars[name] === null ? match : String(vars[name]),
  );
}

export function createTranslator(language) {
  const dictionary = DICTIONARIES[language] || DICTIONARIES[DEFAULT_LANGUAGE];
  return (key, vars) => {
    let value = lookup(dictionary, key);
    if (typeof value !== "string") value = lookup(DICTIONARIES[DEFAULT_LANGUAGE], key);
    // vars.defaultValue: text to show when no dictionary has this key (e.g.
    // a label that only some option lists translate).
    if (typeof value !== "string") return vars?.defaultValue ?? key;
    return interpolate(value, vars);
  };
}

// For plain helpers (formatters, validators) that take an optional `t` -
// callers without one get English, as before localization.
export const englishT = createTranslator(DEFAULT_LANGUAGE);
