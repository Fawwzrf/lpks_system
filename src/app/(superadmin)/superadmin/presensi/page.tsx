"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  Upload,
  FileSpreadsheet,
  Plus,
  UserX,
  Calendar,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";

const STATUS_OPTIONS = ["Hadir", "Izin", "Sakit", "Alpa"] as const;
type StatusPresensi = typeof STATUS_OPTIONS[number];
type TabFilter = "Semua" | StatusPresensi | "Belum Absen";

interface SiswaData {
  id: string;
  nomor_induk: string;
  nama_lengkap: string;
  program_id?: string;
  program?: {
    id: string;
    kode_program: string;
    nama: string;
  };
}

interface PresensiRecord {
  id: string;
  siswa_id: string;
  tanggal: string;
  jam: string;
  jarak_meter?: number;
  status: StatusPresensi;
  created_by?: string;
  keterangan?: string;
}

interface PresensiAllItem {
  id: string;
  siswa: SiswaData;
  presensi: PresensiRecord | null;
  status: StatusPresensi | "Belum Absen";
}

interface ProgramItem {
  id: string;
  kode_program: string;
  nama: string;
}

const STATUS_CONFIG: Record<StatusPresensi | "Belum Absen", { icon: React.ReactNode; color: string }> = {
  Hadir: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-[#10B981]" },
  Izin: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-[#F59E0B]" },
  Sakit: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-[#38BDF8]" },
  Alpa: { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-[#F43F5E]" },
  "Belum Absen": { icon: <UserX className="h-3.5 w-3.5" />, color: "text-[#9CA3AF]" },
};

export default function PresensiAdminPage() {
  const [items, setItems] = useState<PresensiAllItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState<TabFilter>("Semua");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);

  // Modal Catat Presensi Manual
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualSiswaId, setManualSiswaId] = useState("");
  const [manualStatus, setManualStatus] = useState<StatusPresensi>("Hadir");
  const [manualKeterangan, setManualKeterangan] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Modal Ekspor Excel
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<"bulan" | "minggu" | "custom">("bulan");
  const [exportBulan, setExportBulan] = useState(() => new Date().getMonth() + 1);
  const [exportTahun, setExportTahun] = useState(() => new Date().getFullYear());
  const [exportStartDate, setExportStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [exportProgramId, setExportProgramId] = useState("");

  // Modal Import Excel
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    errors?: { row: number; reason: string; type: "warning" | "error" }[];
  } | null>(null);

  // Modal Batch Alpa
  const [batchAlpaModalOpen, setBatchAlpaModalOpen] = useState(false);
  const [batchAlpaSaving, setBatchAlpaSaving] = useState(false);

  // Load master program untuk dropdown
  useEffect(() => {
    async function loadPrograms() {
      try {
        const res = await fetch("/api/v1/master/program");
        if (res.ok) {
          const json = await res.json();
          setPrograms(json.data || []);
        }
      } catch (e) {
        console.error("Gagal memuat master program:", e);
      }
    }
    loadPrograms();
  }, []);

  // Load data presensi seluruh siswa pada tanggal terpilih
  const loadPresensi = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/presensi?tanggal=${selectedDate}&view_type=all_students`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.data || []);
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

  // Handler Quick Action / Override Presensi
  async function handleSetStatus(siswaId: string, newStatus: StatusPresensi, keterangan?: string) {
    setUpdatingId(siswaId);
    try {
      const res = await fetch("/api/v1/presensi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siswa_id: siswaId,
          tanggal: selectedDate,
          status: newStatus,
          keterangan: keterangan || null,
        }),
      });
      if (res.ok) {
        await loadPresensi();
      } else {
        alert("Gagal memperbarui status presensi.");
      }
    } catch (err) {
      console.error("Gagal mengubah status:", err);
    } finally {
      setUpdatingId(null);
    }
  }

  // Handler Simpan Catat Manual
  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualSiswaId) {
      setManualError("Silakan pilih siswa terlebih dahulu.");
      return;
    }
    setManualSaving(true);
    setManualError(null);

    try {
      const res = await fetch("/api/v1/presensi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siswa_id: manualSiswaId,
          tanggal: selectedDate,
          status: manualStatus,
          keterangan: manualKeterangan.trim() || null,
        }),
      });

      if (res.ok) {
        setManualModalOpen(false);
        setManualSiswaId("");
        setManualKeterangan("");
        await loadPresensi();
      } else {
        const json = await res.json();
        setManualError(json.error?.message || "Gagal menyimpan presensi manual.");
      }
    } catch {
      setManualError("Terjadi kesalahan jaringan.");
    } finally {
      setManualSaving(false);
    }
  }

  // Handler Batch Alpa
  async function handleBatchAlpaConfirm() {
    setBatchAlpaSaving(true);
    try {
      const res = await fetch("/api/v1/presensi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_alpa",
          tanggal: selectedDate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBatchAlpaModalOpen(false);
        await loadPresensi();
      } else {
        alert(data.error?.message || "Gagal menandai alpa massal.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setBatchAlpaSaving(false);
    }
  }

  // Handler Download Ekspor Excel
  function handleDownloadExport() {
    let url = `/api/v1/excel/export?modul=presensi`;
    if (exportMode === "bulan") {
      url += `&bulan=${exportBulan}&tahun=${exportTahun}`;
    } else {
      url += `&start_date=${exportStartDate}&end_date=${exportEndDate}`;
    }
    if (exportProgramId) {
      url += `&program_id=${exportProgramId}`;
    }
    window.open(url, "_blank");
    setExportModalOpen(false);
  }

  // Handler Import Excel
  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportProgress(0);
    setImportStatus("Mempersiapkan riwayat presensi...");
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const res = await fetch("/api/v1/excel/import?modul=presensi", {
        method: "POST",
        body: formData,
      });

      if (!res.body) {
        setImportResult({ success: false, message: "Gagal memulai proses import." });
        setImporting(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let finalResult = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === "progress") {
              setImportProgress(data.progress);
              setImportStatus(data.status);
            } else if (data.type === "done") {
              finalResult = data.result;
            } else if (data.type === "error") {
              setImportResult({ success: false, message: data.message });
              setImporting(false);
              return;
            }
          } catch {}
        }
      }

      setImporting(false);

      if (finalResult) {
        setImportResult({
          success: true,
          message: finalResult.message,
          errors: finalResult.errors,
        });
        await loadPresensi();
      }
    } catch {
      setImportResult({ success: false, message: "Terjadi kesalahan saat mengunggah file." });
      setImporting(false);
    }
  }

  // Filter List Siswa
  const filtered = items.filter((item) => {
    // 1. Tab Status
    if (activeTab !== "Semua") {
      if (item.status !== activeTab) return false;
    }
    // 2. Filter Program
    if (selectedProgramFilter && item.siswa.program_id !== selectedProgramFilter) {
      return false;
    }
    // 3. Search query
    const nama = item.siswa.nama_lengkap || "";
    const noInduk = item.siswa.nomor_induk || "";
    const q = search.toLowerCase();
    return !q || nama.toLowerCase().includes(q) || noInduk.toLowerCase().includes(q);
  });

  // Hitung jumlah per status
  const countSemua = items.length;
  const countHadir = items.filter((i) => i.status === "Hadir").length;
  const countIzin = items.filter((i) => i.status === "Izin").length;
  const countSakit = items.filter((i) => i.status === "Sakit").length;
  const countAlpa = items.filter((i) => i.status === "Alpa").length;
  const countBelum = items.filter((i) => i.status === "Belum Absen").length;

  const columns = [
    {
      key: "no",
      header: "No",
      render: (r: PresensiAllItem) => (
        <span className="text-[11px] text-[#9CA3AF] font-mono">{filtered.indexOf(r) + 1}</span>
      ),
    },
    {
      key: "nomor_induk",
      header: "No. Induk",
      render: (r: PresensiAllItem) => (
        <span className="font-mono text-xs text-[#DC2626] font-bold">
          {r.siswa.nomor_induk || "—"}
        </span>
      ),
    },
    {
      key: "nama",
      header: "Nama Siswa",
      render: (r: PresensiAllItem) => (
        <div>
          <p className="text-xs font-semibold text-[#F9FAFB]">{r.siswa.nama_lengkap}</p>
          <p className="text-[10px] text-[#6B7280]">{r.siswa.program?.nama || "Pelatihan"}</p>
        </div>
      ),
    },
    {
      key: "waktu",
      header: "Waktu",
      render: (r: PresensiAllItem) => (
        <span className="font-mono text-xs text-[#D1D5DB]">
          {r.presensi?.jam || "—"}
        </span>
      ),
    },
    {
      key: "jarak",
      header: "Jarak (GPS)",
      render: (r: PresensiAllItem) => (
        <span className="flex items-center gap-1.5 text-xs text-[#D1D5DB]">
          <MapPin className="h-3 w-3 text-[#6B7280]" aria-hidden="true" />
          {r.presensi?.jarak_meter != null ? `${Math.round(r.presensi.jarak_meter)} m` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r: PresensiAllItem) => {
        const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG["Belum Absen"];
        const isOverride = r.presensi?.created_by === "superadmin";
        return (
          <div className="flex flex-col gap-0.5">
            <span className={`flex items-center gap-1.5 font-semibold text-xs ${cfg.color}`}>
              {cfg.icon} {r.status}
              {isOverride && (
                <Badge variant="warning" className="ml-1 text-[9px] px-1 py-0">
                  Manual/Override
                </Badge>
              )}
            </span>
            {r.presensi?.keterangan && (
              <span className="text-[10px] text-[#9CA3AF] italic max-w-xs truncate">
                &quot;{r.presensi.keterangan}&quot;
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "aksi",
      header: "Aksi / Atur Status",
      className: "text-right",
      render: (r: PresensiAllItem) => {
        const isBusy = updatingId === r.siswa.id;

        if (r.status === "Belum Absen") {
          return (
            <div className="flex items-center gap-1.5 justify-end flex-wrap">
              {isBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#DC2626]" />
              ) : (
                <>
                  <button
                    onClick={() => handleSetStatus(r.siswa.id, "Hadir")}
                    className="px-2 py-1 rounded bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] border border-[#10B981]/30 text-[10px] font-bold transition-all"
                    title="Tandai Hadir manual"
                  >
                    + Hadir
                  </button>
                  <button
                    onClick={() => handleSetStatus(r.siswa.id, "Izin")}
                    className="px-2 py-1 rounded bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#F59E0B] border border-[#F59E0B]/30 text-[10px] font-bold transition-all"
                    title="Tandai Izin"
                  >
                    + Izin
                  </button>
                  <button
                    onClick={() => handleSetStatus(r.siswa.id, "Sakit")}
                    className="px-2 py-1 rounded bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 text-[#38BDF8] border border-[#38BDF8]/30 text-[10px] font-bold transition-all"
                    title="Tandai Sakit"
                  >
                    + Sakit
                  </button>
                  <button
                    onClick={() => handleSetStatus(r.siswa.id, "Alpa")}
                    className="px-2 py-1 rounded bg-[#F43F5E]/15 hover:bg-[#F43F5E]/25 text-[#F43F5E] border border-[#F43F5E]/30 text-[10px] font-bold transition-all"
                    title="Tandai Alpa"
                  >
                    + Alpa
                  </button>
                </>
              )}
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1.5 justify-end">
            <select
              value={r.status}
              disabled={isBusy}
              onChange={(e) => handleSetStatus(r.siswa.id, e.target.value as StatusPresensi)}
              className="h-7 rounded-lg border border-[#374151] bg-[#0B0F17] px-2 text-[11px] text-[#D1D5DB] focus:outline-none focus:border-[#DC2626] transition-colors cursor-pointer disabled:opacity-50"
              aria-label={`Ubah status ${r.siswa.nama_lengkap}`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {isBusy && <Loader2 className="h-3 w-3 animate-spin text-[#DC2626]" />}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header Halaman & Action Tools */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Presensi GPS & Rekapitulasi Absensi</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Pemantauan absensi geofencing harian siswa aktif (belum lulus), entri izin/sakit/alpa manual, dan ekspor matriks kehadiran resmi.
          </p>
        </div>

        {/* Toolbar Tombol Aksi */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/api/v1/excel/template?modul=presensi"
            className="h-8 px-2.5 rounded-lg border border-[#374151] hover:border-[#6B7280] bg-[#111827] text-xs font-semibold text-[#D1D5DB] hover:text-white flex items-center gap-1.5 transition-colors"
            title="Download template spreadsheet untuk presensi"
          >
            <Download className="h-3.5 w-3.5" />
            Template
          </a>

          <button
            type="button"
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setImportOpen(true);
            }}
            className="h-8 px-2.5 rounded-lg border border-[#374151] hover:border-[#6B7280] bg-[#111827] text-xs font-semibold text-[#D1D5DB] hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Import Excel
          </button>

          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="h-8 px-3 rounded-lg border border-[#059669]/40 bg-[#064E3B]/30 hover:bg-[#064E3B]/50 text-[#34D399] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Ekspor Excel Matriks
          </button>

          <button
            type="button"
            onClick={() => {
              setManualSiswaId("");
              setManualStatus("Hadir");
              setManualKeterangan("");
              setManualError(null);
              setManualModalOpen(true);
            }}
            className="h-8 px-3 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Catat Manual
          </button>
        </div>
      </div>

      {/* Filter Tanggal & Batch Action Alpa */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111827] border border-[#1F2937] flex-wrap">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-4 w-4 text-[#DC2626]" />
          <span className="text-xs font-semibold text-[#D1D5DB]">Tanggal Sesi:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-8 rounded-lg border border-[#374151] bg-[#0B0F17] px-2.5 text-xs text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
          />
          <button
            onClick={loadPresensi}
            className="p-1.5 rounded-lg border border-[#374151] hover:bg-[#1F2937] text-[#9CA3AF] hover:text-white transition-colors"
            title="Segarkan data tanggal ini"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {countBelum > 0 && (
          <button
            type="button"
            onClick={() => setBatchAlpaModalOpen(true)}
            className="h-7 px-3 rounded-lg border border-[#F43F5E]/40 bg-[#F43F5E]/10 hover:bg-[#F43F5E]/20 text-[#F43F5E] text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <UserX className="h-3.5 w-3.5" />
            Tandai {countBelum} Siswa Belum Absen sebagai Alpa
          </button>
        )}
      </div>

      {/* Tab Filter Status Kehadiran */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { label: "Semua Siswa Aktif", count: countSemua, tab: "Semua" },
            { label: "Hadir", count: countHadir, tab: "Hadir" },
            { label: "Izin", count: countIzin, tab: "Izin" },
            { label: "Sakit", count: countSakit, tab: "Sakit" },
            { label: "Alpa", count: countAlpa, tab: "Alpa" },
            { label: "Belum Absen", count: countBelum, tab: "Belum Absen" },
          ] as { label: string; count: number; tab: TabFilter }[]
        ).map((t) => {
          const isActive = activeTab === t.tab;
          return (
            <button
              key={t.tab}
              type="button"
              onClick={() => setActiveTab(t.tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                isActive
                  ? "bg-[#DC2626] text-white border-[#DC2626] shadow-sm"
                  : "bg-[#111827] text-[#9CA3AF] hover:text-white border-[#1F2937]"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? "bg-white/20 text-white" : "bg-[#1F2937] text-[#6B7280]"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Baris Pencarian & Filter Program */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau no. induk..."
            className="h-8.5 w-full rounded-lg border border-[#1F2937] bg-[#111827] pl-8 pr-3 text-xs text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none focus:border-[#DC2626] transition-colors"
          />
        </div>

        <select
          value={selectedProgramFilter}
          onChange={(e) => setSelectedProgramFilter(e.target.value)}
          className="h-8.5 rounded-lg border border-[#1F2937] bg-[#111827] px-3 text-xs text-[#D1D5DB] focus:outline-none focus:border-[#DC2626] cursor-pointer"
        >
          <option value="">Semua Program Pelatihan</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama} ({p.kode_program})
            </option>
          ))}
        </select>
      </div>

      {/* Tabel Data Presensi */}
      {loading ? (
        <TableSkeleton rows={8} columns={7} />
      ) : (
        <Table
          columns={columns}
          data={filtered}
          emptyMessage={`Tidak ada siswa yang sesuai filter pada tanggal ${selectedDate}.`}
        />
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: CATAT PRESENSI MANUAL / OVERRIDE                            */}
      {/* ===================================================================== */}
      <Modal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="Catat Presensi / Izin / Sakit / Alpa Manual"
        description={`Mencatat entri kehadiran instruktur untuk tanggal ${selectedDate}.`}
        size="md"
      >
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
          {manualError && (
            <div className="p-2.5 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/20 text-[#F43F5E] text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{manualError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-[#D1D5DB] mb-1.5 block">
              Pilih Siswa <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={manualSiswaId}
              onChange={(e) => setManualSiswaId(e.target.value)}
              className="w-full h-9 rounded-lg border border-[#374151] bg-[#0B0F17] px-3 text-xs text-[#F9FAFB] focus:outline-none focus:border-[#DC2626] cursor-pointer"
              required
            >
              <option value="">-- Pilih Siswa --</option>
              {items.map((item) => (
                <option key={item.siswa.id} value={item.siswa.id}>
                  {item.siswa.nomor_induk} — {item.siswa.nama_lengkap} (Status: {item.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[#D1D5DB] mb-1.5 block">
              Status Kehadiran <span className="text-[#DC2626]">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setManualStatus(st)}
                  className={`h-8 rounded-lg border text-xs font-bold transition-all ${
                    manualStatus === st
                      ? "border-[#DC2626] bg-[#DC2626]/20 text-white"
                      : "border-[#374151] bg-[#111827] text-[#9CA3AF] hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#D1D5DB] mb-1.5 block">
              Alasan / Keterangan (Opsional)
            </label>
            <input
              value={manualKeterangan}
              onChange={(e) => setManualKeterangan(e.target.value)}
              placeholder="Contoh: Izin urusan dinas / Sakit flu"
              className="w-full h-8.5 rounded-lg border border-[#374151] bg-[#0B0F17] px-3 text-xs text-[#F9FAFB] focus:outline-none focus:border-[#DC2626]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F2937]">
            <button
              type="button"
              onClick={() => setManualModalOpen(false)}
              className="h-8 px-3 rounded-lg border border-[#374151] text-xs text-[#9CA3AF] hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={manualSaving}
              className="h-8 px-4 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
            >
              {manualSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              Simpan Presensi
            </button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 2: EKSPOR EXCEL MATRIKS                                        */}
      {/* ===================================================================== */}
      <Modal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Ekspor Rekap Kehadiran Siswa (.xlsx)"
        description="Format laporan sesuai format matriks resmi LKP Pengelasan Sumbu Hidup Cilacap."
        size="md"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-[#D1D5DB] mb-1.5 block">
              Pilihan Periode Laporan
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportMode("bulan")}
                className={`h-8 rounded-lg border text-xs font-bold transition-all ${
                  exportMode === "bulan"
                    ? "border-[#10B981] bg-[#10B981]/15 text-[#10B981]"
                    : "border-[#374151] bg-[#111827] text-[#9CA3AF] hover:text-white"
                }`}
              >
                Bulanan (1 Bulan Penuh)
              </button>
              <button
                type="button"
                onClick={() => setExportMode("custom")}
                className={`h-8 rounded-lg border text-xs font-bold transition-all ${
                  exportMode !== "bulan"
                    ? "border-[#10B981] bg-[#10B981]/15 text-[#10B981]"
                    : "border-[#374151] bg-[#111827] text-[#9CA3AF] hover:text-white"
                }`}
              >
                Mingguan / Rentang Bebas
              </button>
            </div>
          </div>

          {exportMode === "bulan" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#9CA3AF] mb-1 block">Bulan</label>
                <select
                  value={exportBulan}
                  onChange={(e) => setExportBulan(parseInt(e.target.value, 10))}
                  className="w-full h-8.5 rounded-lg border border-[#374151] bg-[#0B0F17] px-2.5 text-xs text-[#F9FAFB] focus:border-[#DC2626]"
                >
                  {[
                    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
                  ].map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-[#9CA3AF] mb-1 block">Tahun</label>
                <input
                  type="number"
                  value={exportTahun}
                  onChange={(e) => setExportTahun(parseInt(e.target.value, 10))}
                  className="w-full h-8.5 rounded-lg border border-[#374151] bg-[#0B0F17] px-2.5 text-xs text-[#F9FAFB] focus:border-[#DC2626]"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#9CA3AF] mb-1 block">Tanggal Mulai</label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full h-8.5 rounded-lg border border-[#374151] bg-[#0B0F17] px-2.5 text-xs text-[#F9FAFB] focus:border-[#DC2626]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#9CA3AF] mb-1 block">Tanggal Selesai</label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="w-full h-8.5 rounded-lg border border-[#374151] bg-[#0B0F17] px-2.5 text-xs text-[#F9FAFB] focus:border-[#DC2626]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-[#D1D5DB] mb-1.5 block">
              Filter Program (Opsional)
            </label>
            <select
              value={exportProgramId}
              onChange={(e) => setExportProgramId(e.target.value)}
              className="w-full h-8.5 rounded-lg border border-[#374151] bg-[#0B0F17] px-2.5 text-xs text-[#F9FAFB] focus:border-[#DC2626]"
            >
              <option value="">Semua Program Pelatihan</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} ({p.kode_program})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F2937]">
            <button
              type="button"
              onClick={() => setExportModalOpen(false)}
              className="h-8 px-3 rounded-lg border border-[#374151] text-xs text-[#9CA3AF] hover:text-white"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDownloadExport}
              className="h-8 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-xs font-bold text-white flex items-center gap-1.5 shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Unduh Spreadsheet (.xlsx)
            </button>
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 3: IMPORT EXCEL RIWAYAT PRESENSI                               */}
      {/* ===================================================================== */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Riwayat Presensi dari Excel"
        description="Unggah file spreadsheet .xlsx dengan kolom nomor_induk, tanggal, status, keterangan."
        size="sm"
      >
        <form onSubmit={handleImportSubmit} className="flex flex-col gap-4">
          {!importing && !importResult && (
            <>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Gunakan template resmi untuk mencegah kegagalan format. Status yang didukung: Hadir, Izin, Sakit, Alpa.
              </p>
              <input
                type="file"
                accept=".xlsx, .csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="text-xs text-[#D1D5DB] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#DC2626] file:text-white hover:file:bg-[#B91C1C] cursor-pointer"
              />
            </>
          )}

          {importing && (
            <div className="flex flex-col justify-center items-center py-6 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#DC2626]" />
              <div className="text-xs font-medium text-[#F9FAFB]">{importStatus}</div>
              <div className="w-full bg-[#1F2937] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#DC2626] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}

          {!importing && importResult && (
            <div className="flex flex-col gap-3 py-2">
              <div
                className={`rounded-lg p-3 text-xs flex items-start gap-2.5 ${
                  importResult.success && (!importResult.errors || importResult.errors.length === 0)
                    ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"
                    : "bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/20"
                }`}
              >
                {importResult.success && (!importResult.errors || importResult.errors.length === 0) ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed font-medium">{importResult.message}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F2937]">
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="h-8 px-3 rounded-lg border border-[#374151] text-xs text-[#9CA3AF] hover:text-white"
            >
              Tutup
            </button>
            {!importResult && (
              <button
                type="submit"
                disabled={!importFile || importing}
                className="h-8 px-4 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                {importing && <Loader2 className="h-3 w-3 animate-spin" />}
                Mulai Import
              </button>
            )}
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 4: KONFIRMASI BATCH ALPA                                       */}
      {/* ===================================================================== */}
      <Modal
        open={batchAlpaModalOpen}
        onClose={() => setBatchAlpaModalOpen(false)}
        title="Tandai Siswa Belum Absen sebagai Alpa"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-[#D1D5DB] leading-relaxed">
            Anda akan menandai <strong className="text-[#F43F5E]">{countBelum} siswa</strong> yang belum memiliki
            catatan kehadiran pada tanggal <strong className="text-white">{selectedDate}</strong> sebagai{" "}
            <strong className="text-[#F43F5E]">Alpa</strong>.
          </p>
          <p className="text-[11px] text-[#6B7280]">
            Tindakan ini cocok dijalankan pada sore hari setelah jam operasional bengkel selesai.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F2937]">
            <button
              type="button"
              onClick={() => setBatchAlpaModalOpen(false)}
              className="h-8 px-3 rounded-lg border border-[#374151] text-xs text-[#9CA3AF] hover:text-white"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={batchAlpaSaving}
              onClick={handleBatchAlpaConfirm}
              className="h-8 px-4 rounded-lg bg-[#F43F5E] hover:bg-[#E11D48] text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
            >
              {batchAlpaSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              Ya, Tandai Alpa
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
