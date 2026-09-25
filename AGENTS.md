# AGENTS.md

Vite + React 19 + TypeScript + Tailwind CSS v4 admin dashboard (TailAdmin fork for PT Aneka Mitra Gemilang). Single-page app, no monorepo, no tests, no CI.

## Commands

- `npm run dev` — dev server (Vite).
- `npm run build` — typecheck + build (`tsc -b && vite build`). Always run before finishing; `tsc -b` is strict (`noUnusedLocals`, `noUnusedParameters` in `tsconfig.app.json`).
- `npm run lint` — `eslint .` (ignores `dist/` only).
- `npm run preview` — serve production build.
- No test runner, formatter, or pre-commit config exists. Do not add one unasked.

## Env / Backend

- Requires `VITE_API_BASE_URL` in `.env` (currently `http://localhost:5000`). Backend is a separate service; auth calls fail with `Failed to fetch` if it is down.
- `VITE_NODE_RED_WS_URL` (e.g. `ws://172.17.173.164:1880/ws/totalgridpwr`) feeds live data via `useNodeRedWs` (`src/hooks/useNodeRedWs.ts`, generic `useNodeRedWs<T>`, auto-reconnects every 3s). The hook skips connecting when the URL is empty. Restart `npm run dev` after changing `.env` — Vite only reads it at startup.
- Auth is token-in-`localStorage`: `SignInForm` POSTs to `${VITE_API_BASE_URL}/api/auth/signin`, stores `token` + `user`; `ProtectedRoute` (`src/components/helper/ProtectedRoute.tsx`) gates all `/` routes on `localStorage.getItem("token")` and redirects to `/signin`. Sign-out (`UserDropdown.tsx`) POSTs to `/api/auth/signout` then clears storage.
- Access raw env only via `import.meta.env.VITE_API_BASE_URL`; never hardcode URLs.

## Architecture

- Entry: `src/main.tsx` (`StrictMode` → `ThemeProvider` → `AppWrapper` → `App`) → `src/App.tsx` (all routes).
- Routing uses `react-router` v7 (`import ... from "react-router"`), not `react-router-dom`. Public routes: `/signin`, `/signup`, `*`. Everything else is nested under `<ProtectedRoute />` → `<AppLayout />` in `src/layout/`.
- Feature folders: `src/pages/` (route pages, thin wrappers), `src/components/` (`auth/`, `ecommerce/`, `charts/`, `form/`, `ui/`, `tables/`, `header/`), `src/layout/` (sidebar/header shell), `src/context/` (`ThemeContext`, `SidebarContext`), `src/hooks/`, `src/icons/`, `src/types/` (only `solar.ts`).
- Theme: class-based dark mode (`document.documentElement.classList`, persisted as `theme` in localStorage). Tailwind v4 custom variant declared in `src/index.css`: `@custom-variant dark (&:is(.dark *))`.

## Conventions / Quirks

- Tailwind v4 (CSS-first, `@import "tailwindcss"` + `@theme` in `src/index.css`); PostCSS uses `@tailwindcss/postcss`. Custom design tokens/utilities (`text-title-sm`, `text-theme-sm`, `menu-item-*`, brand/gray/success/error scales) live in `index.css` — reuse them instead of inventing new values.
- SVG icons: import via `vite-plugin-svgr` as `import { ReactComponent as XIcon } from "./x.svg?react"` (see `src/icons/index.ts`, `src/svg.d.ts`). Do not use default SVG imports as components.
- Keep the `?react` + named-`ReactComponent` pattern for any new icon; register it in `src/icons/index.ts`.
- In `@apply`, never put a space between a variant prefix and the utility (`dark:!text-gray-400`, not `dark: !text-gray-400`) — PostCSS fails with `Cannot apply unknown utility class: dark:`. Same for stray `!` tokens.
- `README.md` API-reference section is template boilerplate and untrustworthy; trust `package.json` scripts and `src/components/auth/*` fetch calls instead.
