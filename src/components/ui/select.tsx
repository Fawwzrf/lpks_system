import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-medium text-[#9CA3AF] leading-none"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "h-9 w-full rounded-lg border bg-[#0B0F17] px-3 text-xs text-[#F9FAFB]",
            "transition-colors focus:outline-none appearance-none cursor-pointer",
            error
              ? "border-[#F43F5E] focus:border-[#F43F5E]"
              : "border-[#374151] focus:border-[#DC2626]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span className="text-[11px] text-[#F43F5E]" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
