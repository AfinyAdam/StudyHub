import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  loading = false,
  fullWidth = false,
  className,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200",
        fullWidth && "w-full",
        isPrimary   && "text-white hover:brightness-110 active:scale-[0.97] disabled:opacity-50",
        variant === "secondary" && "bg-white text-slate-700 border border-[#e8e4da] hover:bg-[#f5f0e8] active:scale-[0.97] disabled:opacity-50",
        variant === "danger"    && "bg-red-500 text-white hover:bg-red-600 active:scale-[0.97] disabled:opacity-50",
        variant === "ghost"     && "bg-transparent hover:bg-[rgba(14,51,38,0.06)] active:scale-[0.97] disabled:opacity-50",
        className
      )}
      style={isPrimary ? { background: "linear-gradient(135deg, #0e3326, #0f4535)", ...style } : style}
      {...props}
    >
      {loading ? (
        <span className={clsx(
          "w-4 h-4 border-2 border-t-transparent rounded-full animate-spin",
          isPrimary ? "border-white/30 border-t-white" : "border-slate-300 border-t-slate-600"
        )} />
      ) : children}
    </button>
  );
}
