import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 font-heading text-xs font-medium tracking-tight",
  {
    variants: {
      variant: {
        default: "bg-blue-50 text-brand-primary",
        secondary: "bg-neutral-surface text-neutral-muted",
        outline: "border border-neutral-border bg-transparent text-brand-text",
        verified: "bg-lime-100 text-lime-950",
        ready: "bg-lime-100 text-lime-950",
        agent: "bg-violet-100 text-violet-950",
        warning: "bg-amber-100 text-amber-950",
        danger: "bg-red-100 text-red-950"
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
