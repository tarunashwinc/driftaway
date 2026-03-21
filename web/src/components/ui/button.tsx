"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, fullWidth, children, className, disabled, icon, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-150 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed select-none tap-highlight-none";

    const variants = {
      primary: "bg-[#FF6B35] text-white shadow-button hover:bg-[#E55E2C]",
      secondary: "bg-[#06D6A0] text-[#1A1A2E] shadow-sm hover:bg-[#05B88B]",
      ghost: "bg-transparent text-[#1A1A2E] hover:bg-black/5",
      danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
      outline: "bg-white border border-[#E5E7EB] text-[#1A1A2E] hover:bg-gray-50 shadow-sm",
    };

    const sizes = {
      xs: "px-3 py-1.5 text-xs gap-1",
      sm: "px-4 py-2 text-sm gap-1.5",
      md: "px-5 py-3 text-sm gap-2",
      lg: "px-6 py-3.5 text-base gap-2",
    };

    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
