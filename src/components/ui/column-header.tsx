"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Check,
  X,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

export interface ColumnFilterOption {
  label: string;
  value: string;
}

export interface ColumnHeaderProps {
  title: string;
  className?: string;
  // Sorting props
  sortKey?: string;
  currentSortKey?: string | null;
  currentSortDir?: SortDirection;
  onSort?: (key: string) => void;
  // Filter props
  filterKey?: string;
  filterOptions?: ColumnFilterOption[];
  selectedFilterValue?: string;
  onFilterChange?: (value: string) => void;
  filterPlaceholder?: string;
}

export function ColumnHeader({
  title,
  className,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
  filterOptions,
  selectedFilterValue = "",
  onFilterChange,
  filterPlaceholder = "Semua",
}: ColumnHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSortActive = !!sortKey && currentSortKey === sortKey;
  const isFiltered =
    !!selectedFilterValue &&
    selectedFilterValue !== "" &&
    selectedFilterValue !== "semua";

  // Tutup dropdown jika klik di luar elemen
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleSortClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sortKey && onSort) {
      onSort(sortKey);
    }
  };

  const filteredOptions = filterOptions
    ? filterOptions.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div
      ref={dropdownRef}
      className={cn(
        "inline-flex items-center gap-1.5 select-none relative",
        className
      )}
    >
      {/* Label Judul & Tombol Sort */}
      {sortKey && onSort ? (
        <button
          type="button"
          onClick={handleSortClick}
          className="inline-flex items-center gap-1 text-left font-semibold hover:text-[#F9FAFB] transition-colors focus:outline-none group"
          title={`Urutkan berdasarkan ${title}`}
          aria-label={`Urutkan berdasarkan ${title}`}
        >
          <span className="truncate">{title}</span>
          {isSortActive && currentSortDir === "asc" ? (
            <ArrowUp
              className="h-3 w-3 text-[#DC2626] shrink-0"
              aria-hidden="true"
            />
          ) : isSortActive && currentSortDir === "desc" ? (
            <ArrowDown
              className="h-3 w-3 text-[#DC2626] shrink-0"
              aria-hidden="true"
            />
          ) : (
            <ArrowUpDown
              className="h-2.5 w-2.5 text-[#6B7280] group-hover:text-[#9CA3AF] shrink-0"
              aria-hidden="true"
            />
          )}
        </button>
      ) : (
        <span className="font-semibold">{title}</span>
      )}

      {/* Tombol Filter Kategori (v) */}
      {filterOptions && onFilterChange && (
        <div className="relative inline-block text-left">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen((prev) => !prev);
            }}
            className={cn(
              "p-0.5 rounded transition-all focus:outline-none focus:ring-1 focus:ring-[#DC2626]",
              isFiltered
                ? "bg-[#DC2626] text-white hover:bg-[#B91C1C]"
                : "text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1F2937]"
            )}
            title={`Filter kategori ${title}`}
            aria-label={`Buka filter kategori ${title}`}
            aria-expanded={dropdownOpen}
          >
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>

          {/* Dropdown Menu Popover */}
          {dropdownOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 w-56 rounded-lg bg-[#111827] border border-[#1F2937] shadow-2xl p-1.5 z-50 text-xs normal-case animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Dropdown */}
              <div className="flex items-center justify-between px-2 py-1 border-b border-[#1F2937]/80 text-[#9CA3AF]">
                <span className="font-semibold text-[11px] text-[#D1D5DB] flex items-center gap-1">
                  <Filter className="h-3 w-3 text-[#DC2626]" /> Filter {title}
                </span>
                {isFiltered && (
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange("");
                      setDropdownOpen(false);
                    }}
                    className="text-[10px] text-[#DC2626] hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Input Pencarian jika pilihan banyak */}
              {filterOptions.length > 5 && (
                <div className="p-1 border-b border-[#1F2937]/60">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari..."
                    className="w-full bg-[#0B0F17] border border-[#374151] rounded px-2 py-1 text-[11px] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              )}

              {/* Daftar Opsi Filter */}
              <div className="max-h-52 overflow-y-auto py-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onFilterChange("");
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded flex items-center justify-between text-[11px] transition-colors",
                    !isFiltered
                      ? "bg-[#DC2626]/20 text-[#DC2626] font-semibold"
                      : "text-[#D1D5DB] hover:bg-[#1F2937]"
                  )}
                >
                  <span>{filterPlaceholder} (Semua)</span>
                  {!isFiltered && <Check className="h-3 w-3" />}
                </button>

                {filteredOptions.map((opt) => {
                  const selected = selectedFilterValue === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onFilterChange(opt.value);
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded flex items-center justify-between text-[11px] transition-colors",
                        selected
                          ? "bg-[#DC2626]/20 text-[#DC2626] font-semibold"
                          : "text-[#D1D5DB] hover:bg-[#1F2937]"
                      )}
                    >
                      <span className="truncate pr-1">{opt.label}</span>
                      {selected && <Check className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })}

                {filteredOptions.length === 0 && (
                  <p className="px-2 py-2 text-center text-[10px] text-[#6B7280]">
                    Tidak ada opsi yang cocok
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
