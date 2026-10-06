import React from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImportResult } from "@/lib/use-streaming-import";

// -- Progress ring shown while importing ------------------------------------
export function ImportProgressRing({
  progress,
  status,
  label = "Sistem sedang memproses data. Mohon tunggu...",
  color = "#DC2626",
}: {
  progress: number;
  status: string;
  label?: string;
  color?: string;
}) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col justify-center items-center py-8 gap-4">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="40" cy="40" r={r} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-[#1F2937]" />
          <circle
            cx="40" cy="40" r={r} stroke={color} strokeWidth="6" fill="transparent"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - progress / 100)}
            className="transition-all duration-300 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-lg font-bold text-[#F9FAFB]">{progress}%</span>
        </div>
      </div>
      <div className="text-xs font-medium text-[#F9FAFB]">{status}</div>
      <p className="text-[10px] text-[#9CA3AF] text-center px-4">{label}</p>
    </div>
  );
}

// -- Groups errors/warnings by reason, listing row numbers -----------------
function groupBy(items: NonNullable<ImportResult["errors"]>) {
  return Object.entries(
    items.reduce((acc, e) => {
      const key = e.reason || "Alasan tidak diketahui";
      if (!acc[key]) acc[key] = [];
      if (e.row) acc[key].push(e.row);
      return acc;
    }, {} as Record<string, number[]>)
  );
}

// -- Full result panel (after streaming ends) -------------------------------
export function ImportResultPanel({
  result,
  newLabel = "Data Baru",
  onImportAnother,
  onClose,
  closeButtonText = "Selesai & Tutup",
  closeButtonClass = "bg-[#DC2626] hover:bg-[#B91C1C] text-white",
  children,
}: {
  result: ImportResult;
  newLabel?: string;
  onImportAnother: () => void;
  onClose: () => void;
  closeButtonText?: string;
  closeButtonClass?: string;
  children?: React.ReactNode;
}) {
  const errs = (result.errors || []).filter((e) => e.type !== "warning");
  const warnings = (result.errors || []).filter((e) => e.type === "warning");
  const totalDone = (result.imported_count || 0) + (result.updated_count || 0);
  const totalFail = result.failed_count ?? errs.length;
  const totalWarn = result.warning_count ?? warnings.length;
  const isFullSuccess = result.success && totalFail === 0 && totalWarn === 0;
  const isPartial = result.success && totalDone > 0 && (totalFail > 0 || totalWarn > 0);

  return (
    <div className="flex flex-col gap-4 py-1">
      {/* Status Banner */}
      <div
        className={`rounded-xl p-4 flex items-start gap-3 border ${
          isFullSuccess
            ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30"
            : isPartial
            ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
            : "bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/30"
        }`}
      >
        {isFullSuccess ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-[#10B981]" />
        ) : isPartial ? (
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
        ) : (
          <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-[#F43F5E]" />
        )}
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-xs sm:text-sm">
            {isFullSuccess ? "Import Selesai Sepenuhnya" : isPartial ? "Import Selesai dengan Catatan" : "Import Mengalami Kegagalan"}
          </span>
          <span className="text-xs text-[#D1D5DB] leading-relaxed">{result.message}</span>
        </div>
      </div>

      {/* 4 metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-[#1F2937]/50 border border-[#1F2937] flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Total Data</span>
          <span className="text-xl font-bold text-[#F9FAFB]">{result.total_rows || 0}</span>
          <span className="text-[10px] text-[#6B7280]">Baris spreadsheet</span>
        </div>
        <div className="p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#10B981] uppercase tracking-wider">{newLabel}</span>
          <span className="text-xl font-bold text-[#10B981]">{result.imported_count || 0}</span>
          <span className="text-[10px] text-[#10B981]/80">Berhasil disimpan</span>
        </div>
        <div className="p-3 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#38BDF8] uppercase tracking-wider">Diperbarui</span>
          <span className="text-xl font-bold text-[#38BDF8]">{result.updated_count || 0}</span>
          <span className="text-[10px] text-[#38BDF8]/80">Data disinkronkan</span>
        </div>
        <div
          className={`p-3 rounded-xl border flex flex-col gap-1 ${
            totalFail > 0 ? "bg-[#F43F5E]/10 border-[#F43F5E]/30 text-[#F43F5E]" : "bg-[#1F2937]/30 border-[#1F2937] text-[#9CA3AF]"
          }`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider">Gagal</span>
          <span className={`text-xl font-bold ${totalFail > 0 ? "text-[#F43F5E]" : "text-[#9CA3AF]"}`}>{totalFail}</span>
          <span className="text-[10px] text-[#6B7280]">
            {totalWarn > 0 ? `+${totalWarn} catatan` : totalFail > 0 ? "Perlu koreksi" : "Tanpa kendala"}
          </span>
        </div>
      </div>

      {children}

      {/* Error list */}
      {errs.length > 0 && (
        <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3.5 flex flex-col gap-2 max-h-44 overflow-y-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F43F5E]">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>Rincian Data Gagal ({errs.length} baris):</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-[#F43F5E]/90">
            {groupBy(errs).map(([reason, rows], idx) => (
              <li key={idx}>
                {rows.length > 0 ? <b>Baris {rows.join(", ")}: </b> : null}
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warning list */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3.5 flex flex-col gap-2 max-h-44 overflow-y-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Catatan &amp; Data Dilewati ({warnings.length} baris):</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-300/90">
            {groupBy(warnings).map(([reason, rows], idx) => (
              <li key={idx}>
                {rows.length > 0 ? <b>Baris {rows.join(", ")}: </b> : null}
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1F2937]">
        <Button type="button" variant="outline" size="sm" onClick={onImportAnother} className="text-xs">
          Import File Lain
        </Button>
        <Button
          type="button" size="sm"
          className={`${closeButtonClass} font-semibold text-xs px-4`}
          onClick={onClose}
        >
          {closeButtonText}
        </Button>
      </div>
    </div>
  );
}
