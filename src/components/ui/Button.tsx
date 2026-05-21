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
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
        fullWidth && "w-full",
        variant === "primary"   && "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50",
        variant === "secondary" && "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50",
        variant === "danger"    && "bg-red-500 text-white hover:bg-red-600 disabled:opacity-50",
        variant === "ghost"     && "bg-transparent text-blue-600 hover:bg-blue-50 disabled:opacity-50",
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  );
}