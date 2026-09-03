import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "spark" | "secondary" | "outline" | "ghost" | "danger" | "emerald";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "spark", size = "md", disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none select-none cursor-pointer disabled:cursor-not-allowed";

    const variantStyles = {
      spark:
        "bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] focus-visible:ring-[#DC2626] disabled:bg-[#374151] disabled:text-[#9CA3AF]",
      emerald:
        "bg-[#10B981] text-white hover:bg-[#059669] active:bg-[#047857] focus-visible:ring-[#10B981] disabled:bg-[#374151] disabled:text-[#9CA3AF]",
      secondary:
        "bg-[#1F2937] text-[#F9FAFB] hover:bg-[#374151] active:bg-[#4B5563] focus-visible:ring-[#4B5563] disabled:bg-[#111827] disabled:text-[#6B7280]",
      outline:
        "border border-[#374151] bg-transparent text-[#F9FAFB] hover:bg-[#1F2937] active:bg-[#374151] focus-visible:ring-[#4B5563] disabled:border-[#1F2937] disabled:text-[#6B7280]",
      ghost:
        "bg-transparent text-[#F9FAFB] hover:bg-[#1F2937] active:bg-[#374151] focus-visible:ring-[#4B5563] disabled:text-[#6B7280]",
      danger:
        "bg-[#F43F5E] text-white hover:bg-[#E11D48] active:bg-[#BE123C] focus-visible:ring-[#F43F5E] disabled:bg-[#374151] disabled:text-[#9CA3AF]",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 py-2 text-sm",
      lg: "h-12 px-6 text-base font-semibold",
      icon: "h-10 w-10 p-2",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
