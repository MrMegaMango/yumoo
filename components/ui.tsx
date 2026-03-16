import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function buttonClasses(
  variant: "primary" | "secondary" | "ghost" | "danger" = "primary",
  className?: string
) {
  const variants = {
    primary:
      "bg-ink text-white shadow-card hover:bg-[#3A2F2A]",
    secondary:
      "bg-white/90 text-ink ring-1 ring-[#EAD6C7] hover:bg-white",
    ghost:
      "bg-transparent text-ink ring-1 ring-transparent hover:bg-white/60",
    danger:
      "bg-[#F7DFDC] text-[#8F403E] ring-1 ring-[#E8BCB7] hover:bg-[#F4D0CC]"
  };

  return cx(
    "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    className
  );
}

export function Button(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
  }
) {
  const { className, variant = "primary", type, ...rest } = props;

  return (
    <button
      type={type ?? "button"}
      className={buttonClasses(variant, className)}
      {...rest}
    />
  );
}

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return (
    <div
      className={cx(
        "rounded-[30px] border border-white/80 bg-white/80 p-5 shadow-card backdrop-blur",
        className
      )}
      {...rest}
    />
  );
}

export function Tag({
  children,
  active = false
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        active ? "bg-ink text-white" : "bg-white/80 text-cocoa ring-1 ring-[#EAD6C7]"
      )}
    >
      {children}
    </span>
  );
}
