import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[#1F2937]/70", className)}
      {...props}
    />
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-[#1F2937] bg-[#111827]/40", className)}>
      <div className="bg-[#0B0F17] border-b border-[#1F2937] px-4 py-3.5 flex items-center gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              "h-3 bg-[#1F2937]",
              i === 0 ? "w-16" : i === 1 ? "w-36 flex-1" : i === 2 ? "w-24" : "w-20"
            )}
          />
        ))}
      </div>
      <div className="divide-y divide-[#1F2937]/60">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="px-4 py-4 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <Skeleton
                key={cIdx}
                className={cn(
                  "h-4 bg-[#1F2937]/80",
                  cIdx === 0
                    ? "w-14"
                    : cIdx === 1
                    ? "w-48 flex-1"
                    : cIdx === 2
                    ? "w-24"
                    : cIdx === columns - 1
                    ? "w-16 ml-auto"
                    : "w-20"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24 bg-[#1F2937]" />
            <Skeleton className="h-8 w-8 rounded-lg bg-[#1F2937]" />
          </div>
          <Skeleton className="h-7 w-20 bg-[#1F2937]" />
          <Skeleton className="h-3 w-32 bg-[#1F2937]/60" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({
  hasCards = false,
  cardCount = 4,
  tableRows = 7,
}: {
  hasCards?: boolean;
  cardCount?: number;
  tableRows?: number;
}) {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48 bg-[#1F2937]" />
          <Skeleton className="h-3.5 w-72 bg-[#1F2937]/60" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg bg-[#1F2937]" />
          <Skeleton className="h-9 w-32 rounded-lg bg-[#DC2626]/20" />
        </div>
      </div>

      {/* Optional Top Cards */}
      {hasCards && <CardSkeleton count={cardCount} />}

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-64 rounded-lg bg-[#1F2937]" />
        <Skeleton className="h-9 w-36 rounded-lg bg-[#1F2937]" />
        <Skeleton className="h-9 w-36 rounded-lg bg-[#1F2937]" />
        <Skeleton className="h-8 w-32 ml-auto rounded-lg bg-[#1F2937]" />
      </div>

      {/* Table Skeleton */}
      <TableSkeleton rows={tableRows} />
    </div>
  );
}
