"use client";

import React, { useState } from "react";
import { Search, Download, Upload, FileText, MoreVertical, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";

// Placeholder data — akan diganti fetch API di Tahap 5
const DEMO_SISWA = [
  { id: 1, nomorInduk: "LPKS-2025-1042", nama: "Budi Santoso",  program: "Pengelasan SMAW",    status: "aktif",  kehadiran: "87%" },
  { id: 2, nomorInduk: "LPKS-2025-1043", nama: "Sari Dewi",     program: "Pengelasan MIG/MAG", status: "aktif",  kehadiran: "92%" },
  { id: 3, nomorInduk: "LPKS-2024-0901", nama: "Ahmad Fauzi",   program: "Pengelasan TIG",     status: "alumni", kehadiran: "95%" },
  { id: 4, nomorInduk: "LPKS-2025-1044", nama: "Rina Marlina",  program: "Pengelasan SMAW",    status: "aktif",  kehadiran: "78%" },
];

type FilterStatus = "semua" | "aktif" | "alumni";

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "neutral" }> = {
  aktif:  { label: "Aktif",  variant: "success" },
  alumni: { label: "Alumni", variant: "neutral" },
};

export default function SiswaPage() {
  const [filter, setFilter] = useState<FilterStatus>("semua");
  const [search, setSearch] = useState("");

  const filtered = DEMO_SISWA.filter((s) => {
    if (filter !== "semua" && s.status !== filter) return false;
    const q = search.toLowerCase();
    return !q || s.nama.toLowerCase().includes(q) || s.nomorInduk.toLowerCase().includes(q);
  });

  const columns = [
    {
      key: "nomorInduk",
      header: "No. Induk",
      render: (row: typeof DEMO_SISWA[number]) => (
        <span className="font-mono text-[#DC2626] text-[11px]">{row.nomorInduk}</span>
      ),
    },
    { key: "nama",     header: "Nama" },
    { key: "program",  header: "Program Pelatihan" },
    {
      key: "status",
      header: "Status",
      render: (row: typeof DEMO_SISWA[number]) => {
        const { label, variant } = STATUS_BADGE[row.status];
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    { key: "kehadiran", header: "Kehadiran" },
    {
      key: "aksi",
      header: "Aksi",
      className: "w-16 text-right",
      render: () => (
        <button
          className="text-[#6B7280] hover:text-[#F9FAFB] transition-colors"
          aria-label="Menu aksi"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Data Siswa</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Direktori seluruh siswa terdaftar.</p>
        </div>
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Template
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Upload className="h-3.5 w-3.5" aria-hidden="true" /> Import Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Filter + Search Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg bg-[#111827] border border-[#1F2937] p-1 gap-1">
          {(["semua", "aktif", "alumni"] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === f ? "bg-[#DC2626] text-white" : "text-[#9CA3AF] hover:text-[#D1D5DB]"}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau nomor induk..."
            className="h-9 w-full rounded-lg border border-[#1F2937] bg-[#111827] pl-8 pr-3 text-xs text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none focus:border-[#DC2626] transition-colors"
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5 text-xs text-[#6B7280]">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{filtered.length} siswa</span>
        </div>
      </div>

      <Table columns={columns} data={filtered} emptyMessage="Tidak ada siswa yang cocok dengan pencarian." />
    </div>
  );
}
