import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[#9CA3AF] leading-none"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-9 w-full rounded-lg border bg-[#0B0F17] px-3 text-xs text-[#F9FAFB] placeholder:text-[#4B5563]",
            "transition-colors focus:outline-none",
            error
              ? "border-[#F43F5E] focus:border-[#F43F5E]"
              : "border-[#374151] focus:border-[#DC2626]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <span className="text-[11px] text-[#6B7280]">{hint}</span>
        )}
        {error && (
          <span className="text-[11px] text-[#F43F5E]" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
