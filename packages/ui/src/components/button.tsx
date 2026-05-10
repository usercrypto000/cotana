import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-control px-4 py-2.5 font-heading text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-brand-primary text-white hover:bg-blue-700",
        secondary: "bg-blue-50 text-brand-primary hover:bg-blue-100",
        outline: "border border-neutral-border bg-white text-brand-text hover:bg-neutral-surface",
        agent: "bg-trust-agent text-white hover:bg-violet-700",
        trust: "bg-trust-ready text-brand-text hover:bg-lime-500",
        danger: "bg-trust-danger text-white hover:bg-red-700"
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
