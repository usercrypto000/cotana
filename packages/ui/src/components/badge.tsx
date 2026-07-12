import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 font-heading text-[0.68rem] font-medium tracking-tight",
  {
    variants: {
      variant: {
        default: "bg-brand-primary/10 text-brand-primary",
        secondary: "bg-neutral-surface text-neutral-muted",
        outline: "border border-neutral-border bg-transparent text-brand-text",
        verified: "bg-trust-ready-soft text-trust-ready-ink",
        ready: "bg-trust-ready-soft text-trust-ready-ink",
        agent: "bg-trust-agent-soft text-trust-agent-ink",
        warning: "bg-trust-warning-soft text-trust-warning-ink",
        danger: "bg-trust-danger-soft text-trust-danger-ink"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
