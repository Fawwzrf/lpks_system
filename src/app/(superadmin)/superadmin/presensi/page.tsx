"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, MapPin, CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table } from "@/components/ui/table";

const STATUS_OPTIONS = ["Hadir", "Izin", "Sakit", "Alpa"] as const;
type StatusPresensi = typeof STATUS_OPTIONS[number];

interface PresensiRow {
  id: string;
  tanggal: string;
  jam: string;
  jarak_meter?: number;
  status: StatusPresensi;
  created_by?: string;
  keterangan?: string;
  siswa?: {
    id: string;
    nama_lengkap: string;
    nomor_induk: string;
    program?: { nama: string };
  };
}

const STATUS_CONFIG: Record<StatusPresensi, { icon: React.ReactNode; color: string }> = {
  Hadir: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-[#10B981]" },
  Izin:  { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-[#F59E0B]" },
  Sakit: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-[#38BDF8]" },
  Alpa:  { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-[#F43F5E]" },
};

export default function PresensiAdminPage() {
  const [log, setLog] = useState<PresensiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadPresensi = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/presensi?tanggal=${selectedDate}`);
      if (res.ok) {
        const json = await res.json();
        setLog(json.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat log presensi:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadPresensi();
  }, [loadPresensi]);

  async function handleOverride(id: string, newStatus: StatusPresensi) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/v1/presensi/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLog((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus, created_by: "superadmin" } : r))
        );
      }
    } catch (err) {
      console.error("Gagal mengubah status presensi:", err);
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = log.filter((r) => {
    const nama = r.siswa?.nama_lengkap || "";
    const noInduk = r.siswa?.nomor_induk || "";
    const q = search.toLowerCase();
    return !q || nama.toLowerCase().includes(q) || noInduk.toLowerCase().includes(q);
  });

  const columns = [
    {
      key: "nomor_induk",
      header: "No. Induk",
      render: (r: PresensiRow) => (
        <span className="font-mono text-xs text-[#DC2626] font-bold">
          {r.siswa?.nomor_induk || "—"}
        </span>
      ),
    },
    {
      key: "nama",
      header: "Nama Siswa",
      render: (r: PresensiRow) => (
        <div>
          <p className="text-xs font-semibold text-[#F9FAFB]">{r.siswa?.nama_lengkap || "Siswa"}</p>
          <p className="text-[10px] text-[#6B7280]">{r.siswa?.program?.nama || "Pelatihan"}</p>
        </div>
      ),
    },
    {
      key: "waktu",
      header: "Waktu",
      render: (r: PresensiRow) => <span className="font-mono text-xs">{r.jam || "—"}</span>,
    },
    {
      key: "jarak",
      header: "Jarak (m)",
      render: (r: PresensiRow) => (
        <span className="flex items-center gap-1.5 text-xs text-[#D1D5DB]">
          <MapPin className="h-3 w-3 text-[#6B7280]" aria-hidden="true" />
          {r.jarak_meter != null ? `${Math.round(r.jarak_meter)} m` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r: PresensiRow) => {
        const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG["Hadir"];
        const isOverride = r.created_by === "superadmin";
        return (
          <span className={`flex items-center gap-1.5 font-medium text-xs ${cfg.color}`}>
            {cfg.icon} {r.status}
            {isOverride && <Badge variant="warning" className="ml-1 text-[9px] px-1 py-0">Override</Badge>}
          </span>
        );
      },
    },
    {
      key: "override_action",
      header: "Override Manual",
      className: "w-32 text-right",
      render: (r: PresensiRow) => (
        <div className="flex items-center gap-1 justify-end">
          <select
            value={r.status}
            disabled={updatingId === r.id}
            onChange={(e) => handleOverride(r.id, e.target.value as StatusPresensi)}
            className="h-7 rounded-lg border border-[#374151] bg-[#0B0F17] px-2 text-[11px] text-[#D1D5DB] focus:outline-none focus:border-[#DC2626] transition-colors cursor-pointer disabled:opacity-50"
            aria-label={`Override status ${r.siswa?.nama_lengkap}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {updatingId === r.id && <Loader2 className="h-3 w-3 animate-spin text-[#DC2626]" />}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Presensi GPS</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Pemantauan kehadiran dan override kehadiran manual instruktur.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-8 rounded-lg border border-[#1F2937] bg-[#111827] px-2.5 text-xs text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
          />
          <button
            onClick={loadPresensi}
            className="p-2 rounded-lg border border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:text-white transition-colors"
            title="Segarkan data presensi"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
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
          placeholder="Cari nama atau nomor induk..."
          className="h-9 w-full rounded-lg border border-[#1F2937] bg-[#111827] pl-8 pr-3 text-xs text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none focus:border-[#DC2626] transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-xs text-[#6B7280]">
          <Loader2 className="h-6 w-6 animate-spin text-[#DC2626]" />
          <span>Memuat log presensi tanggal {selectedDate}...</span>
        </div>
      ) : (
        <Table columns={columns} data={filtered} emptyMessage={`Tidak ada log presensi pada tanggal ${selectedDate}.`} />
      )}
    </div>
  );
}
