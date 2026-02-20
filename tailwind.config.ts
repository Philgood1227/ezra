import type { Config } from "tailwindcss";

const systemSansFallbacks = [
  "system-ui",
  "-apple-system",
  "Segoe UI",
  "Roboto",
  "Arial",
  "Noto Sans",
  "Helvetica Neue",
  "sans-serif",
];

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/__tests__/**/*.{js,ts,jsx,tsx}",
    "./.storybook/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "rgb(var(--color-bg-base) / <alpha-value>)",
          surface: "rgb(var(--color-bg-surface) / <alpha-value>)",
          "surface-hover": "rgb(var(--color-bg-surface-hover) / <alpha-value>)",
          elevated: "rgb(var(--color-bg-elevated) / <alpha-value>)",
        },
        text: {
          primary: "rgb(var(--color-text-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-text-secondary) / <alpha-value>)",
          muted: "rgb(var(--color-text-muted) / <alpha-value>)",
          inverse: "rgb(var(--color-text-inverse) / <alpha-value>)",
        },
        brand: {
          primary: "rgb(var(--color-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-secondary) / <alpha-value>)",
          50: "rgb(var(--color-brand-50) / <alpha-value>)",
          100: "rgb(var(--color-brand-100) / <alpha-value>)",
          200: "rgb(var(--color-brand-200) / <alpha-value>)",
          300: "rgb(var(--color-brand-300) / <alpha-value>)",
          400: "rgb(var(--color-brand-400) / <alpha-value>)",
          500: "rgb(var(--color-brand-500) / <alpha-value>)",
          600: "rgb(var(--color-brand-600) / <alpha-value>)",
          700: "rgb(var(--color-brand-700) / <alpha-value>)",
          800: "rgb(var(--color-brand-800) / <alpha-value>)",
          900: "rgb(var(--color-brand-900) / <alpha-value>)",
        },
        accent: {
          warm: "rgb(var(--color-accent-warm) / <alpha-value>)",
          soft: "rgb(var(--color-accent-soft) / <alpha-value>)",
          50: "rgb(var(--color-accent-50) / <alpha-value>)",
          100: "rgb(var(--color-accent-100) / <alpha-value>)",
          200: "rgb(var(--color-accent-200) / <alpha-value>)",
          300: "rgb(var(--color-accent-300) / <alpha-value>)",
          400: "rgb(var(--color-accent-400) / <alpha-value>)",
          500: "rgb(var(--color-accent-500) / <alpha-value>)",
          600: "rgb(var(--color-accent-600) / <alpha-value>)",
          700: "rgb(var(--color-accent-700) / <alpha-value>)",
          800: "rgb(var(--color-accent-800) / <alpha-value>)",
          900: "rgb(var(--color-accent-900) / <alpha-value>)",
        },
        surface: {
          base: "rgb(var(--color-bg-base) / <alpha-value>)",
          panel: "rgb(var(--color-bg-surface) / <alpha-value>)",
          elevated: "rgb(var(--color-bg-elevated) / <alpha-value>)",
          dark: "rgb(var(--color-bg-base) / <alpha-value>)",
        },
        ink: {
          strong: "rgb(var(--color-text-primary) / <alpha-value>)",
          muted: "rgb(var(--color-text-secondary) / <alpha-value>)",
          inverse: "rgb(var(--color-text-inverse) / <alpha-value>)",
        },
        status: {
          success: "rgb(var(--color-success) / <alpha-value>)",
          warning: "rgb(var(--color-warning) / <alpha-value>)",
          error: "rgb(var(--color-error) / <alpha-value>)",
          info: "rgb(var(--color-info) / <alpha-value>)",
        },
        border: {
          default: "rgb(var(--color-border-default) / <alpha-value>)",
          subtle: "rgb(var(--color-border-subtle) / <alpha-value>)",
        },
        category: {
          routine: "rgb(var(--color-cat-routine) / <alpha-value>)",
          ecole: "rgb(var(--color-cat-ecole) / <alpha-value>)",
          repas: "rgb(var(--color-cat-repas) / <alpha-value>)",
          sport: "rgb(var(--color-cat-sport) / <alpha-value>)",
          loisir: "rgb(var(--color-cat-loisir) / <alpha-value>)",
          calme: "rgb(var(--color-cat-calme) / <alpha-value>)",
          sommeil: "rgb(var(--color-cat-sommeil) / <alpha-value>)",
        },
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-error) / <alpha-value>)",
      },
      spacing: {
        "touch-sm": "44px",
        "touch-md": "48px",
        "touch-lg": "56px",
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem",
      },
      borderRadius: {
        "radius-card": "16px",
        "radius-pill": "9999px",
        "radius-button": "12px",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        glass: "var(--shadow-glass)",
        elevated: "var(--shadow-elevated)",
        floating: "var(--shadow-elevated)",
      },
      fontFamily: {
        sans: ["var(--font-lexend)", ...systemSansFallbacks],
        reading: ["var(--font-atkinson)", ...systemSansFallbacks],
        display: ["var(--font-lexend)", ...systemSansFallbacks],
      },
      backgroundImage: {
        "hero-soft":
          "radial-gradient(circle at 15% 15%, rgb(var(--color-primary) / 0.14), transparent 48%), radial-gradient(circle at 85% 20%, rgb(var(--color-secondary) / 0.12), transparent 45%), linear-gradient(145deg, rgb(var(--color-bg-base)) 0%, rgb(var(--color-bg-elevated)) 55%, rgb(var(--color-bg-base)) 100%)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
