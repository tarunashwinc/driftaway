import { type HTMLAttributes } from "react";
import { clsx } from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean;
}

export function Card({ className, children, padding = true, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "bg-white rounded-2xl shadow-sm border border-[#E5E7EB]",
        padding && "p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
