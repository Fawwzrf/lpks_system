import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";

export default function SiswaLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-44 bg-[#1F2937]" />
        <Skeleton className="h-3.5 w-64 bg-[#1F2937]/60" />
      </div>
      <CardSkeleton count={3} />
      <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-6 flex flex-col gap-4">
        <Skeleton className="h-5 w-36 bg-[#1F2937]" />
        <Skeleton className="h-20 w-full rounded-lg bg-[#1F2937]/50" />
        <Skeleton className="h-20 w-full rounded-lg bg-[#1F2937]/50" />
      </div>
    </div>
  );
}
