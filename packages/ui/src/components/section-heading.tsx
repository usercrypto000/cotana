import { cn } from "../lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  inverse = false
}: {
  eyebrow: string;
  title: string;
  description: string;
  inverse?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className={cn("font-heading text-sm uppercase tracking-[0.16em]", inverse ? "text-lime-200" : "text-brand-primary")}>
        {eyebrow}
      </p>
      <h2 className={cn("font-heading text-3xl font-semibold tracking-tight", inverse ? "text-white" : "text-brand-text")}>
        {title}
      </h2>
      <p className={cn("max-w-3xl font-body text-sm leading-6", inverse ? "text-white/70" : "text-neutral-muted")}>
        {description}
      </p>
    </div>
  );
}
