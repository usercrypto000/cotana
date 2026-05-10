export const cotanaBrand = {
  color: {
    brand: {
      primary: "#2563EB",
      accent: "#84CC16",
      agent: "#8B5CF6",
      surface: "#FAFAF7",
      text: "#0B0F14"
    },
    trust: {
      ready: "#84CC16",
      agent: "#8B5CF6",
      warning: "#D97706",
      danger: "#DC2626"
    },
    neutral: {
      surface: "#FAFAF7",
      panel: "#FFFFFF",
      border: "#E5E7EB",
      muted: "#667085"
    }
  },
  font: {
    heading: "Ubuntu",
    body: "Open Sans",
    fallback: "Inter, system-ui, sans-serif"
  },
  radius: {
    control: "0.5rem",
    card: "0.5rem"
  },
  focus: {
    ring: "#2563EB",
    offset: "#FAFAF7"
  }
} as const;

export type CotanaBrand = typeof cotanaBrand;
