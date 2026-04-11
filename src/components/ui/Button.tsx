import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary: "bg-kp-accent text-white hover:bg-kp-accent-md shadow-sm",
  secondary: "bg-surface-1 text-ink-1 border border-kp-border hover:bg-surface-0 shadow-sm",
  ghost: "text-ink-2 hover:bg-surface-0 hover:text-ink-1",
  danger: "bg-kp-danger text-white hover:bg-red-700 shadow-sm",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
} & (
  | (ButtonHTMLAttributes<HTMLButtonElement> & { href?: never })
  | (AnchorHTMLAttributes<HTMLAnchorElement> & { href: string })
);

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-kp-accent disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
    variantStyles[variant],
    sizeStyles[size],
    className
  );

  if ("href" in props && props.href) {
    return <a className={classes} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)} />;
  }

  return <button className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)} />;
}
