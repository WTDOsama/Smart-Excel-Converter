import plugin from "tailwindcss/plugin";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#10243B",
          700: "#1B3A5C",
          600: "#27507A",
        },
        teal: {
          DEFAULT: "#0F766E",
          light: "#14B8A6",
        },
        accent: "#14B8A6",
        surface: "#F1F5F9",
        card: "#FFFFFF",
        ink: "#1E293B",
        muted: "#64748B",
        ok: "#16A34A",
        warn: "#D97706",
        bad: "#DC2626",
      },
      fontFamily: {
        sans: ["Tajawal", "Cairo", "Segoe UI", "Tahoma", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,36,59,0.08), 0 4px 14px rgba(16,36,59,0.06)",
        pop: "0 8px 30px rgba(16,36,59,0.16)",
      },
    },
  },
  plugins: [
    plugin(function ({ addVariant }) {
      addVariant("rtl", '&:where([dir="rtl"], [dir="rtl"] *)');
      addVariant("ltr", '&:where([dir="ltr"], [dir="ltr"] *)');
    }),
  ],
};
