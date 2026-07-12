import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-control px-3 py-1.5 font-heading text-[0.78rem] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-brand-primary text-neutral-inverse shadow-sm hover:bg-brand-primary/92",
        secondary: "bg-brand-primary/8 text-brand-primary hover:bg-brand-primary/14",
        outline: "border border-neutral-border bg-neutral-panel text-brand-text hover:bg-neutral-surface",
        agent: "bg-trust-agent text-neutral-inverse hover:bg-trust-agent/90",
        trust: "bg-trust-ready text-brand-text hover:bg-trust-ready/85",
        danger: "bg-trust-danger text-neutral-inverse hover:bg-trust-danger/90"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    if (asChild) {
      const child = React.Children.only(props.children) as React.ReactElement<React.HTMLAttributes<HTMLElement>>;

      return React.cloneElement(child, {
        className: cn(buttonVariants({ variant }), className, child.props.className)
      });
    }

    return <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />;
  },
);

Button.displayName = "Button";
