const alphaColor = (variableName: string) => `hsl(var(${variableName}) / <alpha-value>)`;

export const cotanaBrand = {
  color: {
    brand: {
      primary: {
        hex: "#2563EB",
        hsl: "221 83% 53%"
      },
      accent: {
        hex: "#84CC16",
        hsl: "80 80% 44%"
      },
      agent: {
        hex: "#8B5CF6",
        hsl: "258 90% 66%"
      },
      surface: {
        hex: "#FAFAF7",
        hsl: "60 23% 97%"
      },
      text: {
        hex: "#0B0F14",
        hsl: "213 30% 6%"
      }
    },
    trust: {
      ready: {
        hex: "#84CC16",
        hsl: "80 80% 44%",
        soft: "79 79% 92%",
        ink: "83 72% 24%"
      },
      warning: {
        hex: "#D97706",
        hsl: "32 95% 44%",
        soft: "42 100% 93%",
        ink: "27 87% 25%"
      },
      danger: {
        hex: "#DC2626",
        hsl: "0 72% 51%",
        soft: "0 86% 97%",
        ink: "0 67% 34%"
      },
      agent: {
        hex: "#8B5CF6",
        hsl: "258 90% 66%",
        soft: "262 100% 97%",
        ink: "258 48% 34%"
      }
    },
    neutral: {
      surface: {
        hex: "#FAFAF7",
        hsl: "60 23% 97%"
      },
      panel: {
        hex: "#FFFFFF",
        hsl: "0 0% 100%"
      },
      border: {
        hex: "#E5E7EB",
        hsl: "220 13% 91%"
      },
      muted: {
        hex: "#667085",
        hsl: "217 13% 46%"
      },
      subtle: {
        hex: "#98A2B3",
        hsl: "218 11% 63%"
      },
      inverse: {
        hex: "#FFFFFF",
        hsl: "0 0% 100%"
      }
    }
  },
  font: {
    heading: ["Ubuntu", "Inter", "system-ui", "sans-serif"],
    body: ["Open Sans", "Inter", "system-ui", "sans-serif"],
    fallback: ["Inter", "system-ui", "sans-serif"],
    variable: {
      heading: ["var(--font-ubuntu)", "var(--font-inter)", "system-ui", "sans-serif"],
      body: ["var(--font-open-sans)", "var(--font-inter)", "system-ui", "sans-serif"],
      fallback: ["var(--font-inter)", "system-ui", "sans-serif"]
    }
  },
  radius: {
    control: "0.5rem",
    card: "0.5rem"
  },
  focus: {
    ring: {
      hex: "#2563EB",
      hsl: "221 83% 53%"
    },
    offset: {
      hex: "#FAFAF7",
      hsl: "60 23% 97%"
    }
  },
  shadow: {
    panel: "0 18px 48px rgba(11, 15, 20, 0.06)",
    raised: "0 24px 64px rgba(11, 15, 20, 0.09)"
  }
} as const;

export const brandCssVariables = {
  "--brand-primary": cotanaBrand.color.brand.primary.hsl,
  "--brand-accent": cotanaBrand.color.brand.accent.hsl,
  "--brand-agent": cotanaBrand.color.brand.agent.hsl,
  "--brand-surface": cotanaBrand.color.brand.surface.hsl,
  "--brand-text": cotanaBrand.color.brand.text.hsl,
  "--trust-ready": cotanaBrand.color.trust.ready.hsl,
  "--trust-ready-soft": cotanaBrand.color.trust.ready.soft,
  "--trust-ready-ink": cotanaBrand.color.trust.ready.ink,
  "--trust-warning": cotanaBrand.color.trust.warning.hsl,
  "--trust-warning-soft": cotanaBrand.color.trust.warning.soft,
  "--trust-warning-ink": cotanaBrand.color.trust.warning.ink,
  "--trust-danger": cotanaBrand.color.trust.danger.hsl,
  "--trust-danger-soft": cotanaBrand.color.trust.danger.soft,
  "--trust-danger-ink": cotanaBrand.color.trust.danger.ink,
  "--trust-agent": cotanaBrand.color.trust.agent.hsl,
  "--trust-agent-soft": cotanaBrand.color.trust.agent.soft,
  "--trust-agent-ink": cotanaBrand.color.trust.agent.ink,
  "--neutral-surface": cotanaBrand.color.neutral.surface.hsl,
  "--neutral-panel": cotanaBrand.color.neutral.panel.hsl,
  "--neutral-border": cotanaBrand.color.neutral.border.hsl,
  "--neutral-muted": cotanaBrand.color.neutral.muted.hsl,
  "--neutral-subtle": cotanaBrand.color.neutral.subtle.hsl,
  "--neutral-inverse": cotanaBrand.color.neutral.inverse.hsl,
  "--radius-control": cotanaBrand.radius.control,
  "--radius-card": cotanaBrand.radius.card,
  "--focus-ring": cotanaBrand.focus.ring.hsl,
  "--focus-offset": cotanaBrand.focus.offset.hsl,
  "--shadow-panel": cotanaBrand.shadow.panel,
  "--shadow-raised": cotanaBrand.shadow.raised
} as const;

export const tailwindBrandColors = {
  brand: {
    primary: alphaColor("--brand-primary"),
    accent: alphaColor("--brand-accent"),
    agent: alphaColor("--brand-agent"),
    surface: alphaColor("--brand-surface"),
    text: alphaColor("--brand-text")
  },
  trust: {
    ready: alphaColor("--trust-ready"),
    "ready-soft": alphaColor("--trust-ready-soft"),
    "ready-ink": alphaColor("--trust-ready-ink"),
    warning: alphaColor("--trust-warning"),
    "warning-soft": alphaColor("--trust-warning-soft"),
    "warning-ink": alphaColor("--trust-warning-ink"),
    danger: alphaColor("--trust-danger"),
    "danger-soft": alphaColor("--trust-danger-soft"),
    "danger-ink": alphaColor("--trust-danger-ink"),
    agent: alphaColor("--trust-agent"),
    "agent-soft": alphaColor("--trust-agent-soft"),
    "agent-ink": alphaColor("--trust-agent-ink")
  },
  neutral: {
    surface: alphaColor("--neutral-surface"),
    panel: alphaColor("--neutral-panel"),
    border: alphaColor("--neutral-border"),
    muted: alphaColor("--neutral-muted"),
    subtle: alphaColor("--neutral-subtle"),
    inverse: alphaColor("--neutral-inverse")
  }
} as const;

export const tailwindFontFamily: Record<"heading" | "body" | "fallback" | "sans", string[]> = {
  heading: [...cotanaBrand.font.variable.heading],
  body: [...cotanaBrand.font.variable.body],
  fallback: [...cotanaBrand.font.variable.fallback],
  sans: [...cotanaBrand.font.variable.body]
};

export type CotanaBrand = typeof cotanaBrand;
