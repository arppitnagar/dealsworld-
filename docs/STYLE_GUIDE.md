# DealsWorld Style Guide

This document defines how we keep styling consistent across SellerBuddy and DealBuddy.

**Goals**
1. No hardcoded colors in `apps/` or `packages/`.
2. All spacing, typography, and colors come from the shared `theme`.
3. Shared components are preferred over per‑screen custom styling.

**Where To Find Tokens**
- Theme: `packages/shared/theme/theme.js`
- Shared styles: `packages/shared/styles/*`
- Shared components: `packages/shared/components/*`

**Color Rules**
- Use `theme.colors.*` only.
- If a color is missing, add it to the theme as a named token.
- Avoid raw hex or `rgba()` values in screens/components.
- Use semantic names for intent:
  - `danger*` for destructive actions
  - `warning*` for warnings
  - `success*` for success states
  - `chat*` for chat UI

**Typography Rules**
- Use `theme.typography.*` for titles, subtitles, labels, and banners.
- If you need a new size or weight, add a new token in `theme.typography`.

**Spacing Rules**
- Prefer `theme.spacing` for paddings/margins.
- If a screen needs a new spacing scale, add a token first.

**Component Rules**
- Prefer shared components (e.g. `PrimaryBanner`, `StatusPill`, `MetricRow`).
- If multiple screens need the same layout, promote it to `packages/shared/components/`.

**Lint Rule**
- Run `npm run lint:colors` to catch hardcoded colors before committing.
- Run `npm run lint:spacing` to catch spacing values outside `0–120`.
- Run `npm run lint:typography` to catch font sizes outside `8–36` and non-standard weights.
- Run `npm run lint:ui` to run all UI lint rules together.

**Git Hooks**
- Run `npm run hooks:install` once to enable the pre‑commit hook that blocks hardcoded colors.

**CI**
- A GitHub Action runs `npm run lint:ui` on every PR that touches `apps/`, `packages/`, or `scripts/`.

**Quick Setup**
- Run from repo root `D:\DealsWorld`:
  - `npm run setup:ui`

**Troubleshooting**
- `lint:colors` fails:
  - Replace any hex/rgba colors with `theme.colors.*`.
- `lint:spacing` fails:
  - Use `theme.spacing.*` or a value between `0–120`.
- `lint:typography` fails:
  - Use `theme.typography.*` or font sizes `8–36` and weights `300–900`.

**Common Hotspots**
- Seller: `apps/seller/src/screens/CreateDealScreen.js`
- Seller: `apps/seller/src/screens/DealChat.js`
- Seller: `apps/seller/src/screens/SellerDashboard.js`
- Buyer: `apps/buyer/src/screens/HomeScreen.js`
- Buyer: `apps/buyer/src/screens/DealChatScreen.js`
