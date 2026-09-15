"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Award, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet, Plus, Loader2, RefreshCw, Search, X, Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { handleEnterToNextField } from "@/lib/form-utils";
import { CardSkeleton } from "@/components/ui/skeleton";

interface SiswaUjianItem {
  id: string;
  nomor_induk: string;
  nama_lengkap: string;
  program_nama: string;
  total_biaya: number;
  total_terbayar: number;
  is_lunas: boolean;
  nilai_harian_ok: boolean;
  ujian: {
    id: string;
    tgl_ujian: string;
    teori: number;
    root: number;
    hotpass: number;
    filler: number;
    capping: number;
    gerinda: number;
    is_lulus: boolean;
    catatan_penguji?: string | null;
  } | null;
}

const KRITERIA_LIST = [
  { key: "teori", label: "Teori Pengelasan" },
  { key: "root", label: "Root Pass (Penetrasi)" },
  { key: "hotpass", label: "Hot Pass" },
  { key: "filler", label: "Filler (Pengisian)" },
  { key: "capping", label: "Capping (Tutup Las)" },
  { key: "gerinda", label: "Teknik Gerinda" },
] as const;

function GateIndicator({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${ok ? "text-[#10B981]" : "text-[#F43F5E]"}`}>
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span>{label}</span>
    </div>
  );
}

export default function UjianPage() {
  const [data, setData] = useState<SiswaUjianItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"semua" | "siap_ujian" | "lulus" | "dalam_bimbingan">("semua");

  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [inputTarget, setInputTarget] = useState<SiswaUjianItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [scores, setScores] = useState({
    teori: "",
    root: "",
    hotpass: "",
    filler: "",
    capping: "",
    gerinda: "",
    catatan_penguji: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/v1/ujian");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? (typeof json.error === "string" ? json.error : "Gagal memuat data ujian."));
      }
      setData(json.data || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan memuat data ujian.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistik Ringkasan
  const stats = useMemo(() => {
    const total = data.length;
    const siapUjian = data.filter((s) => s.nilai_harian_ok && !s.ujian?.is_lulus).length;
    const lulus = data.filter((s) => !!s.ujian?.is_lulus).length;
    const dalamBimbingan = data.filter((s) => !s.nilai_harian_ok).length;
    return { total, siapUjian, lulus, dalamBimbingan };
  }, [data]);

  // Priority sorting: Siswa yang siap menjalani ujian internal berada paling atas
  const getUrutan = (noInduk?: string | null) => {
    if (!noInduk) return 999999;
    if (noInduk.includes("—") || noInduk.includes("-")) return 1110.5;
    const parts = noInduk.split(".");
    const lastPart = parts.length > 1 ? parts.slice(1).join(".") : parts[0];
    const num = parseInt(lastPart.replace(/\D/g, ""), 10);
    return isNaN(num) ? 999999 : num;
  };

  const getPriority = (item: SiswaUjianItem) => {
    // 0: Siap menjalani ujian internal (nilai harian ok, belum lulus ujian internal) -> Paling Atas
    if (item.nilai_harian_ok && !item.ujian?.is_lulus) return 0;
    // 1: Sudah lulus ujian internal
    if (item.nilai_harian_ok && item.ujian?.is_lulus) return 1;
    // 2: Belum siap ujian internal (masih dalam bimbingan harian)
    return 2;
  };

  const filteredAndSortedData = useMemo(() => {
    return data
      .filter((s) => {
        // 1. Filter Pencarian Nama / Nomor Induk / Program
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchName = s.nama_lengkap.toLowerCase().includes(q);
          const matchNo = s.nomor_induk.toLowerCase().includes(q);
          const matchProg = s.program_nama.toLowerCase().includes(q);
          if (!matchName && !matchNo && !matchProg) return false;
        }

        // 2. Filter Status Tab
        if (statusFilter === "siap_ujian") {
          return s.nilai_harian_ok && !s.ujian?.is_lulus;
        }
        if (statusFilter === "lulus") {
          return !!s.ujian?.is_lulus;
        }
        if (statusFilter === "dalam_bimbingan") {
          return !s.nilai_harian_ok;
        }

        return true;
      })
      .sort((a, b) => {
        const pA = getPriority(a);
        const pB = getPriority(b);
        if (pA !== pB) return pA - pB;
        return getUrutan(a.nomor_induk) - getUrutan(b.nomor_induk);
      });
  }, [data, search, statusFilter]);

  function handleOpenInput(siswa: SiswaUjianItem) {
    setInputTarget(siswa);
    if (siswa.ujian) {
      setScores({
        teori: String(siswa.ujian.teori),
        root: String(siswa.ujian.root),
        hotpass: String(siswa.ujian.hotpass),
        filler: String(siswa.ujian.filler),
        capping: String(siswa.ujian.capping),
        gerinda: String(siswa.ujian.gerinda),
        catatan_penguji: siswa.ujian.catatan_penguji || "",
      });
    } else {
      setScores({
        teori: "80",
        root: "80",
        hotpass: "80",
        filler: "80",
        capping: "80",
        gerinda: "80",
        catatan_penguji: "",
      });
    }
    setInputModalOpen(true);
  }

  async function handleSubmitNilai(e: React.FormEvent) {
    e.preventDefault();
    if (!inputTarget) return;

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = {
        siswa_id: inputTarget.id,
        tgl_ujian: new Date().toISOString().split("T")[0],
        teori: parseInt(scores.teori || "0", 10),
        root: parseInt(scores.root || "0", 10),
        hotpass: parseInt(scores.hotpass || "0", 10),
        filler: parseInt(scores.filler || "0", 10),
        capping: parseInt(scores.capping || "0", 10),
        gerinda: parseInt(scores.gerinda || "0", 10),
        catatan_penguji: scores.catatan_penguji.trim() || undefined,
      };

      const res = await fetch("/api/v1/ujian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? (typeof json.error === "string" ? json.error : "Gagal menyimpan nilai ujian."));
      }

      setSuccessMsg(json.data?.message || "Nilai ujian internal berhasil disimpan!");
      setInputModalOpen(false);
      await fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleExportSertifikatSingle(siswaId: string) {
    window.open(`/api/v1/excel/export?modul=sertifikat&siswa_id=${siswaId}`, "_blank");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Ujian &amp; Sertifikat</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Gate-check kelayakan ujian dan ekspor data siswa lulus untuk percetakan sertifikat fisik.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/v1/excel/export?modul=sertifikat"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#10B981]/40 bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981]/25 hover:text-white transition-colors"
            title="Unduh template Excel data seluruh siswa lulus untuk dikirim ke percetakan"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor Data Percetakan (Excel)</span>
          </a>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter("semua")}
          className={`cursor-pointer rounded-xl border p-3 flex items-center gap-3 transition-all ${
            statusFilter === "semua"
              ? "border-[#DC2626] bg-[#DC2626]/5 shadow-sm"
              : "border-[#1F2937] bg-[#111827] hover:border-[#374151]"
          }`}
        >
          <div className="h-9 w-9 rounded-lg bg-[#374151]/30 border border-[#374151] flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-[#9CA3AF]" />
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Total Siswa</p>
            <p className="text-sm font-bold text-[#F9FAFB]">
              {loading ? "..." : `${stats.total} Siswa`}
            </p>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("siap_ujian")}
          className={`cursor-pointer rounded-xl border p-3 flex items-center gap-3 transition-all ${
            statusFilter === "siap_ujian"
              ? "border-[#10B981] bg-[#10B981]/10 shadow-sm"
              : "border-[#1F2937] bg-[#111827] hover:border-[#10B981]/50"
          }`}
        >
          <div className="h-9 w-9 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Siap Ujian Internal</p>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            </div>
            <p className="text-sm font-bold text-[#10B981]">
              {loading ? "..." : `${stats.siapUjian} Siswa`}
            </p>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("lulus")}
          className={`cursor-pointer rounded-xl border p-3 flex items-center gap-3 transition-all ${
            statusFilter === "lulus"
              ? "border-[#38BDF8] bg-[#38BDF8]/10 shadow-sm"
              : "border-[#1F2937] bg-[#111827] hover:border-[#38BDF8]/50"
          }`}
        >
          <div className="h-9 w-9 rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center shrink-0">
            <Award className="h-4 w-4 text-[#38BDF8]" />
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Lulus Ujian</p>
            <p className="text-sm font-bold text-[#38BDF8]">
              {loading ? "..." : `${stats.lulus} Siswa`}
            </p>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("dalam_bimbingan")}
          className={`cursor-pointer rounded-xl border p-3 flex items-center gap-3 transition-all ${
            statusFilter === "dalam_bimbingan"
              ? "border-[#F59E0B] bg-[#F59E0B]/10 shadow-sm"
              : "border-[#1F2937] bg-[#111827] hover:border-[#F59E0B]/50"
          }`}
        >
          <div className="h-9 w-9 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Dalam Bimbingan</p>
            <p className="text-sm font-bold text-[#F59E0B]">
              {loading ? "..." : `${stats.dalamBimbingan} Siswa`}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari siswa berdasarkan nama atau no. induk..."
            className="h-9 w-full rounded-xl border border-[#1F2937] bg-[#111827] pl-8.5 pr-8 text-xs text-[#F9FAFB] placeholder-[#6B7280] focus:border-[#DC2626] focus:outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#F9FAFB]"
              title="Hapus pencarian"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111827] border border-[#1F2937] text-xs">
          <button
            onClick={() => setStatusFilter("semua")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === "semua"
                ? "bg-[#DC2626] text-white"
                : "text-[#9CA3AF] hover:text-white"
            }`}
          >
            Semua ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter("siap_ujian")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === "siap_ujian"
                ? "bg-[#10B981] text-white"
                : "text-[#9CA3AF] hover:text-white"
            }`}
          >
            Siap Ujian ({stats.siapUjian})
          </button>
          <button
            onClick={() => setStatusFilter("lulus")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === "lulus"
                ? "bg-[#38BDF8] text-white"
                : "text-[#9CA3AF] hover:text-white"
            }`}
          >
            Lulus ({stats.lulus})
          </button>
          <button
            onClick={() => setStatusFilter("dalam_bimbingan")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === "dalam_bimbingan"
                ? "bg-[#F59E0B] text-black font-semibold"
                : "text-[#9CA3AF] hover:text-white"
            }`}
          >
            Bimbingan ({stats.dalamBimbingan})
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-[#F43F5E]/10 border border-[#F43F5E]/20 text-[#F43F5E] text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && data.length === 0 ? (
        <CardSkeleton count={6} className="md:grid-cols-2 lg:grid-cols-3" />
      ) : filteredAndSortedData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#1F2937] p-8 text-center text-xs text-[#6B7280]">
          {search ? `Tidak ada siswa yang cocok dengan pencarian "${search}".` : "Belum ada data siswa terdaftar."}
        </div>
      ) : (
        /* Siswa Cards Grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedData.map((s) => {
            const hasUjian = !!s.ujian;
            const isReadyForInternal = s.nilai_harian_ok && !s.ujian?.is_lulus;
            const avg = hasUjian
              ? Math.round(
                  (s.ujian!.teori +
                    s.ujian!.root +
                    s.ujian!.hotpass +
                    s.ujian!.filler +
                    s.ujian!.capping +
                    s.ujian!.gerinda) /
                    6
                )
              : null;

            const isUjianLulus = !!s.ujian?.is_lulus;
            const gateSertifikat = s.is_lunas && isUjianLulus;

            return (
              <div
                key={s.id}
                className={`rounded-xl border bg-[#111827] p-5 flex flex-col gap-4 shadow-sm transition-all ${
                  isReadyForInternal
                    ? "border-[#10B981]/50 ring-1 ring-[#10B981]/20"
                    : "border-[#1F2937]"
                }`}
              >
                {/* Header Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-xs font-bold text-[#F9FAFB] truncate">{s.nama_lengkap}</p>
                      {isReadyForInternal && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#10B981] bg-[#10B981]/15 border border-[#10B981]/30 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                          Siap Ujian Internal
                        </span>
                      )}
                      {isUjianLulus && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#38BDF8] bg-[#38BDF8]/15 border border-[#38BDF8]/30 px-2 py-0.5 rounded-full">
                          Lulus Ujian
                        </span>
                      )}
                      {!s.nilai_harian_ok && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#F59E0B] bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-2 py-0.5 rounded-full">
                          Dalam Bimbingan
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6B7280]">
                      {s.nomor_induk} &bull; {s.program_nama}
                    </p>
                    {avg !== null ? (
                      <p
                        className={`text-xl font-bold mt-1 ${
                          isUjianLulus ? "text-[#10B981]" : "text-[#F59E0B]"
                        }`}
                      >
                        {avg}
                        <span className="text-xs font-normal text-[#6B7280]"> / 100 rata-rata</span>
                      </p>
                    ) : (
                      <p className="text-xs text-[#6B7280] mt-1 italic">Belum ada nilai ujian</p>
                    )}
                  </div>
                  <div
                    className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${
                      gateSertifikat
                        ? "bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]"
                        : "bg-[#1F2937] border-[#374151] text-[#6B7280]"
                    }`}
                  >
                    <Award className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>

                {/* Gate Check Box */}
                <div className="flex flex-col gap-1.5 bg-[#0B0F17] rounded-lg p-3 border border-[#1F2937]">
                  <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-widest mb-0.5">
                    Syarat Sertifikasi
                  </p>
                  <GateIndicator label="Semua nilai harian ≥ 80" ok={s.nilai_harian_ok} />
                  <GateIndicator
                    label={`Biaya Lunas (Rp ${s.total_terbayar.toLocaleString("id-ID")})`}
                    ok={s.is_lunas}
                  />
                  {hasUjian ? (
                    <GateIndicator
                      label={`Hasil Ujian: ${isUjianLulus ? "Lulus (Semua ≥ 80)" : "Belum Memenuhi Syarat"}`}
                      ok={isUjianLulus}
                    />
                  ) : (
                    <div className="text-[11px] text-[#6B7280] flex items-center gap-1.5 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6B7280]" />
                      <span>Ujian internal belum ditempuh</span>
                    </div>
                  )}
                </div>

                {/* Nilai Ujian Details Grid */}
                {s.ujian && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {KRITERIA_LIST.map(({ key, label }) => {
                      const v = s.ujian ? (s.ujian as unknown as Record<string, number>)[key] : 0;
                      const ok = v >= 80;
                      return (
                        <div key={key} className="rounded-lg bg-[#0B0F17] border border-[#1F2937] p-2 text-center">
                          <p className="text-[9px] text-[#6B7280] truncate" title={label}>
                            {label.split(" ")[0]}
                          </p>
                          <p className={`text-sm font-bold ${ok ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                            {v}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-auto pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 gap-1 text-xs whitespace-nowrap px-2 ${
                      isReadyForInternal
                        ? "border-[#10B981] bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981]/25 hover:text-white"
                        : ""
                    }`}
                    onClick={() => handleOpenInput(s)}
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{s.ujian ? "Edit Nilai Internal" : "Input Nilai Internal"}</span>
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1 text-xs bg-[#10B981] hover:bg-[#059669] text-white disabled:opacity-40 disabled:bg-[#1F2937] disabled:text-[#6B7280]"
                    disabled={!gateSertifikat}
                    onClick={() => handleExportSertifikatSingle(s.id)}
                    title={
                      !gateSertifikat
                        ? "Belum memenuhi syarat percetakan sertifikat (wajib Lunas dan Nilai Ujian Lulus)"
                        : "Ekspor data siswa ini ke format Excel percetakan"
                    }
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Ekspor Percetakan</span>
                  </Button>
                </div>

                {!gateSertifikat && (
                  <div className="flex items-center gap-1.5 text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg px-2.5 py-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      {!s.is_lunas
                        ? "Keuangan belum lunas"
                        : !isUjianLulus
                        ? "Nilai ujian belum lulus (min 80 tiap kriteria)"
                        : "Syarat belum lengkap"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Input Nilai Ujian */}
      <Modal
        open={inputModalOpen}
        onClose={() => !submitting && setInputModalOpen(false)}
        title={`Input Nilai Ujian Internal — ${inputTarget?.nama_lengkap ?? ""}`}
        description="Masukkan nilai untuk setiap kriteria pengujian internal (skala 0–100, standar kelulusan 80)."
      >
        <form
          data-form-container
          onKeyDown={handleEnterToNextField}
          className="grid grid-cols-2 gap-4"
          onSubmit={handleSubmitNilai}
        >
          {KRITERIA_LIST.map(({ key, label }, i) => (
            <div key={key}>
              <Input
                label={label}
                name={key}
                type="number"
                min={0}
                max={100}
                required
                value={scores[key as keyof typeof scores]}
                onChange={(e) => setScores({ ...scores, [key]: e.target.value })}
                placeholder="80"
                data-next={KRITERIA_LIST[i + 1]?.key ?? "catatan"}
              />
            </div>
          ))}

          <div className="col-span-2">
            <Input
              id="catatan"
              label="Catatan Penguji (Opsional)"
              name="catatan_penguji"
              value={scores.catatan_penguji}
              onChange={(e) => setScores({ ...scores, catatan_penguji: e.target.value })}
              placeholder="Misal: Penetrasi root sangat rapi, capping sedikit tebal"
              data-next="submit-btn"
            />
          </div>

          <div className="col-span-2 flex gap-2 justify-end mt-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setInputModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              id="submit-btn"
              type="submit"
              disabled={submitting}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                </>
              ) : (
                "Simpan Nilai Internal"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
