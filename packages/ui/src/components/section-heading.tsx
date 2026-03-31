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
      <p className={cn("text-sm uppercase tracking-[0.2em]", inverse ? "text-emerald-200" : "text-teal-800")}>
        {eyebrow}
      </p>
      <h2 className={cn("text-3xl font-semibold tracking-tight", inverse ? "text-white" : "text-slate-950")}>
        {title}
      </h2>
      <p className={cn("max-w-3xl text-sm leading-6", inverse ? "text-white/70" : "text-slate-500")}>
        {description}
      </p>
    </div>
  );
}

