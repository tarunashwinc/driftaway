import { clsx } from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "orange";
  className?: string;
}

const variants = {
  default: "bg-gray-100 text-gray-600",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-600",
  info: "bg-blue-100 text-blue-700",
  orange: "bg-orange-100 text-orange-700",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={clsx(
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
