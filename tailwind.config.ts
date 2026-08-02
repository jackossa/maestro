import type { Config } from "tailwindcss";

// Design tokens ported 1:1 from the original design-system bundle
// (_ds/.../colors_and_type.css) plus the app's own premium-layer <style>
// block. Source: "Ossa Fee Proposal App.dc.html" lines 1-104 and the bound
// "Ossa Studio Design System" colors_and_type.css.
//
// Fonts: original brand typeface is Helvetica Neue, a licensed webfont not
// bundled here. On-screen UI uses Arimo instead (self-hosted, see main.tsx)
// -- Google's open-source, metrically-close substitute for Arial/Helvetica --
// rather than either the brand's plain-Arial fallback or an unreliable
// system-font reference. Print documents still lead with Arial in
// --font-body-doc (src/index.css), matching the brand guide's own choice
// for written pieces.
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "os-orange": "#EB5B28",
        "os-charcoal": "#414142",
        "os-blue": "#1C80C4",
        "os-steel": "#4C7E9C",
        "os-aqua": "#74C4CA",
        "os-mist": "#A1AFC1",
        "os-stone": "#918F92",
        "os-amber": "#F8B74B",
        "os-tangerine": "#F49633",
        "os-ink": "#1d1d1e",
        "os-900": "#2a2a2b",
        "os-800": "#414142",
        "os-700": "#57575a",
        "os-600": "#6f6f73",
        "os-500": "#918f92",
        "os-400": "#b4b3b6",
        "os-300": "#d2d1d3",
        "os-200": "#e5e4e6",
        "os-150": "#efeeef",
        "os-100": "#f6f5f6",
        "os-50": "#fbfafb",
        "os-white": "#ffffff",
        "os-orange-700": "#c4471a",
        "os-orange-600": "#d94e21",
        "os-orange-100": "#fdeae2",
        "os-orange-050": "#fef5f1",
        // Lightened for use as TEXT on dark grounds (sidebar, splash) only --
        // bright os-orange is ~2.96:1 on os-charcoal, below the 3:1 floor even
        // for large text; this tint lands at ~5:1. Never use on light backgrounds,
        // where os-orange-700 (darker, not lighter) is the accessible choice --
        // see the Maestro design review, A11Y-01.
        "os-orange-300": "#f4a589",
        // semantic tokens
        accent: "#EB5B28",
        "accent-hover": "#d94e21",
        "accent-press": "#c4471a",
        "accent-wash": "#fdeae2",
      },
      fontFamily: {
        // Arimo, self-hosted via @fontsource (see main.tsx) -- Google's
        // open-source, metrically-compatible substitute for Arial/Helvetica.
        // Bundled with the app, so it renders identically for every visitor
        // regardless of what's installed on their device, with no
        // redistribution-licensing question the way embedding the actual
        // Helvetica Neue files would raise.
        display: ["Arimo", "Arial", "Helvetica", "sans-serif"],
        sans: ["Arimo", "Arial", "Helvetica", "sans-serif"],
      },
      borderRadius: {
        "brand-sm": "10px",
        "brand-md": "14px",
        "brand-lg": "18px",
        "brand-xl": "20px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(29,29,30,.04)",
        sm: "0 1px 3px rgba(29,29,30,.06), 0 1px 2px rgba(29,29,30,.04)",
        md: "0 4px 14px rgba(29,29,30,.07), 0 1px 3px rgba(29,29,30,.05)",
        lg: "0 12px 32px rgba(29,29,30,.10), 0 2px 8px rgba(29,29,30,.05)",
        glass: "0 20px 50px rgba(20,20,21,.35)",
      },
      backgroundImage: {
        "grad-accent": "linear-gradient(135deg, #EB5B28 0%, #d94e21 100%)",
      },
      transitionDuration: {
        fast: "150ms",
        DEFAULT: "220ms",
        slow: "300ms",
      },
      transitionTimingFunction: {
        os: "cubic-bezier(.4,0,.2,1)",
      },
      keyframes: {
        osFadeUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        osShimmer: {
          "0%": { backgroundPosition: "-120% 0" },
          "100%": { backgroundPosition: "220% 0" },
        },
        osSymbolPulse: {
          "0%, 100%": { transform: "scale(1)", opacity: ".88" },
          "50%": { transform: "scale(1.07)", opacity: "1" },
        },
        osSplashOut: {
          to: { opacity: "0", visibility: "hidden" },
        },
      },
      animation: {
        osFadeUp: "osFadeUp 300ms cubic-bezier(.4,0,.2,1)",
        osShimmer: "osShimmer 1.7s linear infinite",
        osSymbolPulse: "osSymbolPulse 1.7s ease-in-out infinite",
        osSplashOut: "osSplashOut .5s ease 1.1s forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
