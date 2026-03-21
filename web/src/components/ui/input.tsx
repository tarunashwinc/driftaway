import { type InputHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            "w-full px-4 py-3.5 rounded-2xl border bg-white text-[#1A1A2E] placeholder-[#C4C4C4]",
            "focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]",
            "transition-all duration-150 text-base font-medium",
            "shadow-sm",
            error ? "border-red-400 ring-2 ring-red-100" : "border-black/8",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-[#9CA3AF]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
