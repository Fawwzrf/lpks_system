import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accentColor?: "spark" | "success" | "warning" | "info";
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  accentColor = "spark",
  className,
}: StatCardProps) {
  const accentMap = {
    spark: "text-[#DC2626] bg-[#DC2626]/15 border-[#DC2626]/30",
    success: "text-[#10B981] bg-[#10B981]/15 border-[#10B981]/30",
    warning: "text-[#F59E0B] bg-[#F59E0B]/15 border-[#F59E0B]/30",
    info: "text-[#38BDF8] bg-[#38BDF8]/15 border-[#38BDF8]/30",
  };

  const trendIcon = {
    up: <TrendingUp className="h-3.5 w-3.5 text-[#10B981]" />,
    down: <TrendingDown className="h-3.5 w-3.5 text-[#F43F5E]" />,
    neutral: <Minus className="h-3.5 w-3.5 text-[#9CA3AF]" />,
  };

  const trendTextColor = {
    up: "text-[#10B981]",
    down: "text-[#F43F5E]",
    neutral: "text-[#9CA3AF]",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col gap-3",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-[#9CA3AF] leading-tight">
          {title}
        </span>
        {icon && (
          <div
            className={cn(
              "h-9 w-9 rounded-xl border flex items-center justify-center shrink-0",
              accentMap[accentColor]
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div>
        <span className="text-2xl font-bold text-[#F9FAFB] block leading-none tracking-tight">
          {value}
        </span>
        {subtitle && (
          <span className="text-xs text-[#6B7280] mt-1 block">{subtitle}</span>
        )}
      </div>

      {trend && trendLabel && (
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs",
            trendTextColor[trend]
          )}
        >
          {trendIcon[trend]}
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
