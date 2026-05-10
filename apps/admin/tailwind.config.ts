import type { Config } from "tailwindcss";
import { cotanaBrand } from "../../packages/config/src/brand";

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
        brand: cotanaBrand.color.brand,
        trust: cotanaBrand.color.trust,
        neutral: cotanaBrand.color.neutral
      },
      fontFamily: {
        heading: ["var(--font-ubuntu)", cotanaBrand.font.fallback],
        body: ["var(--font-open-sans)", cotanaBrand.font.fallback],
        sans: ["var(--font-open-sans)", cotanaBrand.font.fallback]
      },
      borderRadius: {
        control: cotanaBrand.radius.control,
        card: cotanaBrand.radius.card
      }
    }
  },
  plugins: []
};

export default config;
