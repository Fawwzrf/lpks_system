"use client";

import React, { useState } from "react";
import { Download, Search, MapPin, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";

const STATUS_OPTIONS = ["Hadir", "Izin", "Sakit", "Alpa"] as const;
type StatusPresensi = typeof STATUS_OPTIONS[number];

const DEMO_LOG = [
  { id: 1, nama: "Budi Santoso",  waktu: "07:52",  jarak: 45,   status: "Hadir" as StatusPresensi, override: false },
  { id: 2, nama: "Sari Dewi",     waktu: "08:03",  jarak: 12,   status: "Hadir" as StatusPresensi, override: false },
  { id: 3, nama: "Ahmad Fauzi",   waktu: "—",       jarak: null, status: "Alpa"  as StatusPresensi, override: true },
  { id: 4, nama: "Rina Marlina",  waktu: "10:15",  jarak: 88,   status: "Sakit" as StatusPresensi, override: true },
];

const STATUS_CONFIG: Record<StatusPresensi, { icon: React.ReactNode; color: string }> = {
  Hadir: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-[#10B981]" },
  Izin:  { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-[#F59E0B]" },
  Sakit: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-[#38BDF8]" },
  Alpa:  { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-[#F43F5E]" },
};

export default function PresensiAdminPage() {
  const [log, setLog] = useState(DEMO_LOG);
  const [search, setSearch] = useState("");
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  function handleOverride(id: number, newStatus: StatusPresensi) {
    setLog((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus, override: true } : r));
  }

  const filtered = log.filter((r) => !search || r.nama.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: "nama", header: "Nama Siswa" },
    {
      key: "waktu", header: "Waktu Absen",
      render: (r: typeof DEMO_LOG[number]) => <span className="font-mono text-xs">{r.waktu}</span>,
    },
    {
      key: "jarak", header: "Jarak (m)",
      render: (r: typeof DEMO_LOG[number]) => (
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-[#6B7280]" aria-hidden="true" />
          {r.jarak != null ? `${r.jarak} m` : "—"}
        </span>
      ),
    },
    {
      key: "status", header: "Status",
      render: (r: typeof DEMO_LOG[number]) => {
        const cfg = STATUS_CONFIG[r.status];
        return (
          <span className={`flex items-center gap-1.5 font-medium text-xs ${cfg.color}`}>
            {cfg.icon} {r.status}
            {r.override && <Badge variant="warning" className="ml-1">Override</Badge>}
          </span>
        );
      },
    },
    {
      key: "override_action", header: "Override Manual",
      render: (r: typeof DEMO_LOG[number]) => (
        <select
          value={r.status}
          onChange={(e) => handleOverride(r.id, e.target.value as StatusPresensi)}
          className="h-7 rounded-lg border border-[#374151] bg-[#0B0F17] px-2 text-[11px] text-[#D1D5DB] focus:outline-none focus:border-[#DC2626] transition-colors cursor-pointer"
          aria-label={`Override status ${r.nama}`}
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Presensi GPS</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">{today}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export Rekap Excel
        </Button>
      </div>

      {/* Summary badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["Hadir", "Izin", "Sakit", "Alpa"] as StatusPresensi[]).map((s) => {
          const count = log.filter((r) => r.status === s).length;
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-[#111827] border border-[#1F2937] ${cfg.color}`}>
              {cfg.icon} {s} ({count})
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" aria-hidden="true" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama siswa..."
          className="h-9 w-full rounded-lg border border-[#1F2937] bg-[#111827] pl-8 pr-3 text-xs text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none focus:border-[#DC2626] transition-colors"
        />
      </div>

      <Table columns={columns} data={filtered} emptyMessage="Tidak ada log presensi hari ini." />
    </div>
  );
}
