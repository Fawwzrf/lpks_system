import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "success" | "warning" | "danger" | "spark" | "secondary" | "outline" | "neutral";
}

export function Badge({
  className,
  variant = "secondary",
  ...props
}: BadgeProps) {
  const variantStyles = {
    success:
      "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30",
    warning:
      "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30",
    danger:
      "bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30",
    spark:
      "bg-[#DC2626]/15 text-[#F87171] border border-[#DC2626]/40",
    secondary:
      "bg-[#1F2937] text-[#D1D5DB] border border-[#374151]",
    outline:
      "bg-transparent text-[#9CA3AF] border border-[#374151]",
    neutral:
      "bg-[#1F2937] text-[#9CA3AF] border border-[#374151]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
