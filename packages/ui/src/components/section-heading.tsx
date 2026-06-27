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
    <div className="space-y-1">
      <p className={cn("font-heading text-[0.64rem] font-semibold uppercase tracking-[0.08em]", inverse ? "text-neutral-inverse/68" : "text-brand-primary/86")}>
        {eyebrow}
      </p>
      <h2 className={cn("font-heading text-[1.35rem] font-semibold leading-tight tracking-tight sm:text-[1.48rem]", inverse ? "text-neutral-inverse" : "text-brand-text")}>
        {title}
      </h2>
      <p className={cn("max-w-3xl font-body text-[0.84rem] leading-[1.6]", inverse ? "text-neutral-inverse/70" : "text-neutral-muted")}>
        {description}
      </p>
    </div>
  );
}
