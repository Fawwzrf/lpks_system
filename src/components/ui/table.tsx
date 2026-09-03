import React from "react";
import { cn } from "@/lib/utils";

// Simple reusable data table with industrial dark theme

interface Column<T> {
  key: keyof T | string;
  header: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
}

export function Table<T extends { id?: string | number }>({
  columns,
  data,
  emptyMessage = "Tidak ada data untuk ditampilkan.",
  className,
}: TableProps<T>) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-[#1F2937]", className)}>
      <table className="w-full text-left text-xs">
        <thead className="bg-[#0B0F17] text-[#9CA3AF] border-b border-[#1F2937]">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn("px-4 py-3 font-semibold tracking-wide uppercase text-[10px]", col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1F2937]">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-[#6B7280]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row.id ?? rowIndex}
                className="hover:bg-[#1F2937]/40 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={cn("px-4 py-3 text-[#D1D5DB]", col.className)}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[String(col.key)] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
