import type { Config } from "tailwindcss";
import { cotanaBrand, tailwindBrandColors, tailwindFontFamily } from "@cotana/config/brand";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ...tailwindBrandColors
      },
      fontFamily: {
        ...tailwindFontFamily,
        sans: ["var(--font-plus-jakarta)", "sans-serif"]
      },
      borderRadius: {
        control: cotanaBrand.radius.control,
        card: cotanaBrand.radius.card
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        raised: "var(--shadow-raised)"
      }
    }
  },
  plugins: []
};

export default config;
