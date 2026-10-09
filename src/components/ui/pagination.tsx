"use client";
import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  itemLabel?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 20, 50, 100],
  className,
  itemLabel = "data",
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const [inputVal, setInputVal] = useState<string>(String(currentPage));

  useEffect(() => {
    setInputVal(String(currentPage));
  }, [currentPage]);

  const handleApply = () => {
    const num = parseInt(inputVal, 10);
    if (isNaN(num)) {
      setInputVal(String(currentPage));
      return;
    }
    const clamped = Math.max(1, Math.min(safeTotalPages, num));
    setInputVal(String(clamped));
    if (clamped !== currentPage) {
      onPageChange(clamped);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 text-xs text-[#9CA3AF] py-2",
        className
      )}
    >
      {/* Bagian Kiri: Limit / Page Size & Info Data */}
      <div className="flex items-center gap-2 flex-wrap">
        {onPageSizeChange && pageSize !== undefined && (
          <div className="flex items-center gap-1.5">
            <label htmlFor="pagination-limit-select" className="text-[#9CA3AF]">
              Menampilkan
            </label>
            <select
              id="pagination-limit-select"
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              aria-label="Jumlah data per halaman"
              className="bg-[#111827] border border-[#1F2937] text-[#D1D5DB] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#DC2626] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span>{itemLabel} per halaman</span>
          </div>
        )}

        {totalItems !== undefined && (
          <span className="text-[#6B7280] hidden sm:inline">
            (Total {totalItems.toLocaleString("id-ID")} {itemLabel})
          </span>
        )}
      </div>

      {/* Bagian Kanan: Navigasi Tombol First, Prev, Input Edit Page, Next, Last */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Tombol Pertama / First */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="Halaman Pertama"
          aria-label="Halaman Pertama"
          className="p-1.5 rounded bg-[#111827] border border-[#1F2937] text-[#D1D5DB] hover:bg-[#1F2937] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
        >
          <ChevronsLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {/* Tombol Sebelumnya / Prev */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          title="Halaman Sebelumnya"
          aria-label="Halaman Sebelumnya"
          className="px-2.5 py-1.5 rounded bg-[#111827] border border-[#1F2937] text-[#D1D5DB] hover:bg-[#1F2937] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Sebelumnya</span>
        </button>

        {/* Edit Page Input (Jump to page) */}
        <div className="flex items-center gap-1 px-1.5 font-medium text-xs text-[#D1D5DB]">
          <span>Hal</span>
          <input
            type="number"
            min={1}
            max={safeTotalPages}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={handleApply}
            onKeyDown={handleKeyDown}
            aria-label={`Nomor halaman saat ini, ketik angka 1 sampai ${safeTotalPages} lalu tekan Enter`}
            title="Ketik nomor halaman lalu tekan Enter"
            className="w-12 h-7 text-center font-mono font-bold bg-[#0B0F17] border border-[#374151] rounded text-[#F9FAFB] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] text-xs"
          />
          <span className="text-[#9CA3AF]">dari {safeTotalPages}</span>
        </div>

        {/* Tombol Selanjutnya / Next */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
          disabled={currentPage >= safeTotalPages}
          title="Halaman Selanjutnya"
          aria-label="Halaman Selanjutnya"
          className="px-2.5 py-1.5 rounded bg-[#111827] border border-[#1F2937] text-[#D1D5DB] hover:bg-[#1F2937] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
        >
          <span className="hidden sm:inline">Selanjutnya</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {/* Tombol Terakhir / Last */}
        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={currentPage >= safeTotalPages}
          title="Halaman Terakhir"
          aria-label="Halaman Terakhir"
          className="p-1.5 rounded bg-[#111827] border border-[#1F2937] text-[#D1D5DB] hover:bg-[#1F2937] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
        >
          <ChevronsRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
