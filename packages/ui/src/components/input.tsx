import * as React from "react";
import { cn } from "../lib/utils";

const baseFieldClassName =
  "w-full rounded-control border border-neutral-border bg-neutral-panel px-4 text-sm text-brand-text shadow-sm transition placeholder:text-neutral-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface disabled:cursor-not-allowed disabled:opacity-60";

export const fieldClassName = baseFieldClassName;

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(baseFieldClassName, "h-11", className)} {...props} />
  ),
);

Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(baseFieldClassName, "h-11 pr-10", className)} {...props} />
  ),
);

Select.displayName = "Select";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(baseFieldClassName, "min-h-24 py-3 leading-6", className)} {...props} />
  ),
);

Textarea.displayName = "Textarea";
