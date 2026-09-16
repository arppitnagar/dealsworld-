export const lightColors = {
  primary: "#2563eb",
  primaryDeep: "#1D4ED8",
  onPrimary: "#ffffff",
  text: "#0F172A",
  textMuted: "#475569",
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F3F4F6",
  border: "#E5E7EB",
  surfaceLight: "#F1F5F9",
  surfaceLighter: "#F8FAFC",
  error: "#EF4444",
  success: "#10B981",
  warning: "#B45309",
  infoSoft: "#EFF6FF",
  infoBorder: "#BFDBFE",
  warningBright: "#F97316",
  successSoft: "#DCFCE7",
  successDark: "#15803D",
  danger: "#FF4D4D",
  dangerSoft: "#FFF5F5",
  dangerSoftAlt: "#FFF1F2",
  dangerSoftLight: "#FEE2E2",
  dangerBorder: "#FECACA",
  dangerDark: "#DC2626",
  purple: "#7C3AED",
  purpleSoft: "#F5F3FF",
  successSoftAlt: "#ECFDF5",
  dashboardBg: "#F8FAFF",
  amberSoft: "#FFF7ED",
  amberBorder: "#F59E0B",
  amberText: "#92400E",
  amberAccent: "#B45309",
  amberChipBg: "#FFEDD5",
  // Deal-content accent — constant across the buyer and seller apps (discount
  // badge, join-progress bar/percent). Independent of the per-app primary
  // color role below, and chosen for AA contrast with white text (5.2:1).
  dealAccent: "#C2410C",
  dealAccentSoft: "#FFF7ED",
  // AA-safe text-on-tint variants for semantic status colors (the brighter
  // success/danger tokens above fail 4.5:1 on their own light tint backgrounds).
  textOnSuccessTint: "#047857",
  textOnDangerTint: "#B91C1C",
  chatBg: "#ECE5DD",
  chatHeader: "#075E54",
  chatHeaderSubtle: "rgba(255,255,255,0.75)",
  chatEmptyIcon: "#CBD5E1",
  chatBubbleSent: "#DCF8C6",
  chatBubbleReceived: "#FFFFFF",
  chatInputBg: "#F0F2F5",
  chatPlaceholder: "#94A3B8",
  chatSend: "#25D366",
  chatStatusSeen: "#34B7F1",
  chatStatusDefault: "#6B7280",
  overlay: "rgba(0,0,0,0.5)",
  overlayStrong: "rgba(0,0,0,0.6)",
  overlaySoft: "rgba(0,0,0,0.35)",
  onPrimaryMuted: "rgba(255,255,255,0.4)",
  onPrimarySoft: "rgba(255,255,255,0.15)",
  onPrimaryFaint: "rgba(255,255,255,0.1)",
  surfaceGlass: "rgba(255,255,255,0.9)",
  surfaceGlassStrong: "rgba(255,255,255,0.95)",
  iconMuted: "#9CA3AF",
  statusActive: "#FF4D4D",
  statusScheduled: "#7C3AED",
  statusExpired: "#F59E0B",
  statusDraft: "#94A3B8",
};

export const darkColors = {
  primary: "#60A5FA",
  primaryDeep: "#3B82F6",
  onPrimary: "#0B1220",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  background: "#0B1220",
  surface: "#0F172A",
  surfaceMuted: "#111827",
  border: "#23324A",
  surfaceLight: "#1E293B",
  surfaceLighter: "#273449",
  error: "#F87171",
  success: "#34D399",
  warning: "#FBBF24",
  infoSoft: "#0F2747",
  infoBorder: "#1E3A8A",
  warningBright: "#FB923C",
  successSoft: "#063A2A",
  successDark: "#6EE7B7",
  danger: "#F87171",
  dangerSoft: "#3A0F14",
  dangerSoftAlt: "#2A0C12",
  dangerSoftLight: "#4C141A",
  dangerBorder: "#7F1D1D",
  dangerDark: "#FCA5A5",
  purple: "#A78BFA",
  purpleSoft: "#2A1C4D",
  successSoftAlt: "#064E3B",
  dashboardBg: "#0A1222",
  amberSoft: "#3A2A0E",
  amberBorder: "#D97706",
  amberText: "#FCD34D",
  amberAccent: "#FDBA74",
  amberChipBg: "#3A2A0E",
  dealAccent: "#C2410C",
  dealAccentSoft: "#3A2A0E",
  textOnSuccessTint: "#6EE7B7",
  textOnDangerTint: "#FCA5A5",
  chatBg: "#0B1220",
  chatHeader: "#0F766E",
  chatHeaderSubtle: "rgba(255,255,255,0.75)",
  chatEmptyIcon: "#475569",
  chatBubbleSent: "#134E4A",
  chatBubbleReceived: "#1E293B",
  chatInputBg: "#0F172A",
  chatPlaceholder: "#64748B",
  chatSend: "#22C55E",
  chatStatusSeen: "#60A5FA",
  chatStatusDefault: "#94A3B8",
  overlay: "rgba(0,0,0,0.65)",
  overlayStrong: "rgba(0,0,0,0.75)",
  overlaySoft: "rgba(0,0,0,0.45)",
  onPrimaryMuted: "rgba(11,18,32,0.6)",
  onPrimarySoft: "rgba(11,18,32,0.18)",
  onPrimaryFaint: "rgba(11,18,32,0.1)",
  surfaceGlass: "rgba(15,23,42,0.92)",
  surfaceGlassStrong: "rgba(15,23,42,0.96)",
  iconMuted: "#94A3B8",
  statusActive: "#F87171",
  statusScheduled: "#A78BFA",
  statusExpired: "#FBBF24",
  statusDraft: "#64748B",
};

// Per-app color role overrides. Buyer (DealBuddy) leads with a deep, AA-safe
// orange; seller (SellerBuddy) leads with the existing brand blue. Both are
// distinct from `dealAccent` above, which never changes per app. Merged over
// the base palette by `createTheme(mode, app)` — omit `app` to get the
// unmodified base colors (what every existing no-arg caller, e.g. the admin
// app's static `theme` import, continues to see).
const buyerLightOverrides = {
  primary: "#C2410C",
  primaryDeep: "#9A3412",
  primaryTintBg: "#FFF7ED",
  primaryTintBorder: "#FDBA74",
  primaryTintText: "#9A3412",
};
const buyerDarkOverrides = {
  primary: "#FB923C",
  primaryDeep: "#EA580C",
  onPrimary: "#1B0D03",
  primaryTintBg: "#3A1D0B",
  primaryTintBorder: "#9A3412",
  primaryTintText: "#FDBA74",
};
const sellerLightOverrides = {
  primary: "#2563EB",
  primaryDeep: "#1D4ED8",
  primaryTintBg: "#EFF6FF",
  primaryTintBorder: "#BFDBFE",
  primaryTintText: "#1D4ED8",
};
const sellerDarkOverrides = {
  primary: "#60A5FA",
  primaryDeep: "#3B82F6",
  onPrimary: "#0B1220",
  primaryTintBg: "#0F2747",
  primaryTintBorder: "#1E3A8A",
  primaryTintText: "#93C5FD",
};

const APP_OVERRIDES = {
  buyer: { light: buyerLightOverrides, dark: buyerDarkOverrides },
  seller: { light: sellerLightOverrides, dark: sellerDarkOverrides },
};

const getTypography = (colors) => ({
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  label: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  body: { fontSize: 14, color: colors.text },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  bannerSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onPrimaryMuted,
  },
});

const getShadow = (colors, mode) => ({
  card: {
    shadowColor: mode === "dark" ? "#000000" : colors.text,
    shadowOpacity: mode === "dark" ? 0.25 : 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});

export const createTheme = (mode = "light", app = null) => {
  const base = mode === "dark" ? darkColors : lightColors;
  const override = APP_OVERRIDES[app]?.[mode === "dark" ? "dark" : "light"];
  const colors = override ? { ...base, ...override } : base;
  return {
    colors,
    skeleton: {
      shimmerDuration: 1200,
    },
    spacing: {
      xs: 6,
      sm: 10,
      md: 16,
      lg: 24,
      xl: 32,
    },
    radii: {
      sm: 10,
      md: 14,
      lg: 18,
      xl: 24,
    },
    typography: getTypography(colors),
    shadow: getShadow(colors, mode),
  };
};

export const theme = createTheme("light");

export default theme;
