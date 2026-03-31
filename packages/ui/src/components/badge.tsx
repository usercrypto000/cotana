import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-tight",
  {
    variants: {
      variant: {
        default: "bg-emerald-100 text-emerald-950",
        secondary: "bg-slate-100 text-slate-700",
        outline: "border border-white/15 bg-transparent text-slate-300"
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

