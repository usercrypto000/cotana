import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-teal-800 text-white hover:bg-teal-700",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
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

