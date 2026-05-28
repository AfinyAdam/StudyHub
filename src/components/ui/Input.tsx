import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:    string;
  error?:    string;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  fullWidth = true,
  className,
  ...props
}, ref) => {
  return (
    <div className={clsx("flex flex-col gap-1", fullWidth && "w-full")}>
      {label && (
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      )}
      <input
        ref={ref}
        className={clsx(
          "px-3 py-2.5 rounded-xl border text-sm outline-none transition-all bg-white text-slate-800",
          "border-[#e8e4da] focus:border-[#0e3326] focus:ring-2 focus:ring-[rgba(14,51,38,0.08)]",
          error && "border-red-400 focus:border-red-400 focus:ring-red-100",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
});

Input.displayName = "Input";
export default Input;
