"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Award,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Loader2,
  RefreshCw,
  Download,
  Plus,
  FileText,
  Calendar,
  Layers,
  GraduationCap,
  Sparkles,
  BarChart2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatDateIndo } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const WARNA_PALETTE = [
  "#DC2626", // Merah Spark (Root)
  "#F59E0B", // Amber (Hotpass)
  "#10B981", // Emerald (Filler)
  "#38BDF8", // Sky (Capping)
  "#818CF8", // Indigo (Gerinda)
  "#EC4899", // Pink
  "#A855F7", // Purple
];

interface ProgramItem {
  id: string;
  kode_program: string;
  nama: string;
}

interface SiswaPenilaianItem {
  id: string;
  nomor_induk: string;
  nama_lengkap: string;
  tgl_masuk?: string;
  tgl_keluar?: string;
  program?: {
    id: string;
    kode_program: string;
    nama: string;
  };
  total_hari: number;
  total_penilaian: number;
  rata_rata: number;
  nilai_tertinggi: number;
  kriteria_kompeten: number;
  total_kriteria: number;
  siap_ujian: boolean;
  status: "Siap Ujian" | "Dalam Bimbingan" | "Belum Dinilai";
  terakhir_dinilai?: string | null;
}

interface KriteriaItem {
  id: string;
  nama_kriteria: string;
  batas_lulus: number;
  urutan?: number;
}

interface PenilaianRow {
  id: string;
  tanggal: string;
  nilai: number;
  created_by?: string;
  catatan?: string;
  kriteria?: { id: string; nama_kriteria: string; batas_lulus?: number };
}

interface KriteriaStatus {
  nama: string;
  nilai_tertinggi: number;
  lulus: boolean;
}

type TabFilter = "semua" | "siap_ujian" | "dalam_bimbingan" | "belum_dinilai";

export default function PenilaianSuperadminPage() {
  const [items, setItems] = useState<SiswaPenilaianItem[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [kriteriaList, setKriteriaList] = useState<KriteriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("semua");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>("");

  // Modal Transkrip Siswa
  const [modalTranskripOpen, setModalTranskripOpen] = useState(false);
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaPenilaianItem | null>(null);
  const [loadingTranskrip, setLoadingTranskrip] = useState(false);
  const [trendData, setTrendData] = useState<Array<Record<string, string | number>>>([]);
  const [statusKelayakan, setStatusKelayakan] = useState<Record<string, KriteriaStatus>>({});
  const [riwayatMentah, setRiwayatMentah] = useState<PenilaianRow[]>([]);
  const [focusKriteria, setFocusKriteria] = useState<string | null>(null);

  // Modal Input / Koreksi Nilai
  const [modalInputOpen, setModalInputOpen] = useState(false);
  const [targetSiswaId, setTargetSiswaId] = useState<string>("");
  const [inputTanggal, setInputTanggal] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [inputScores, setInputScores] = useState<Record<string, string>>({});
  const [inputCatatan, setInputCatatan] = useState<string>("Verifikasi Instruktur");
  const [saving, setSaving] = useState(false);
  const [inputErrorMsg, setInputErrorMsg] = useState<string | null>(null);
  const [inputSuccessMsg, setInputSuccessMsg] = useState<string | null>(null);

  // 1. Muat master program & kriteria
  useEffect(() => {
    async function loadMeta() {
      try {
        const [resProg, resKrit] = await Promise.allSettled([
          fetch("/api/v1/master/program"),
          fetch("/api/v1/master/kriteria"),
        ]);

        if (resProg.status === "fulfilled" && resProg.value.ok) {
          const json = await resProg.value.json();
          setPrograms(json.data || []);
        }

        if (resKrit.status === "fulfilled" && resKrit.value.ok) {
          const json = await resKrit.value.json();
          setKriteriaList(json.data || []);
        }
      } catch (err) {
        console.error("Gagal memuat metadata:", err);
      }
    }
    loadMeta();
  }, []);

  // 2. Muat data seluruh siswa aktif dengan agregat nilai
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/v1/penilaian";
      if (selectedProgramFilter) {
        url += `?program_id=${selectedProgramFilter}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setItems(json.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat data penilaian siswa:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedProgramFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 3. Handler Buka Transkrip Siswa
  const handleOpenTranskrip = useCallback(async (siswa: SiswaPenilaianItem) => {
    setSelectedSiswa(siswa);
    setModalTranskripOpen(true);
    setLoadingTranskrip(true);
    setFocusKriteria(null);

    try {
      const res = await fetch(`/api/v1/penilaian?siswa_id=${siswa.id}`);
      if (res.ok) {
        const json = await res.json();
        setTrendData(json.data?.grafik_tren || []);
        setStatusKelayakan(json.data?.status_kelayakan || {});
        setRiwayatMentah(json.data?.riwayat_mentah || []);
      }
    } catch (err) {
      console.error("Gagal memuat rincian transkrip siswa:", err);
    } finally {
      setLoadingTranskrip(false);
    }
  }, []);

  // 4. Handler Buka Modal Input Nilai
  function handleOpenInputModal(siswaId?: string) {
    setTargetSiswaId(siswaId || (items[0]?.id ?? ""));
    setInputTanggal(new Date().toISOString().split("T")[0]);
    setInputCatatan("Verifikasi Instruktur");
    setInputScores({});
    setInputErrorMsg(null);
    setInputSuccessMsg(null);
    setModalInputOpen(true);
  }

  // 5. Submit Input Nilai
  async function handleSubmitNilai(e: React.FormEvent) {
    e.preventDefault();
    if (!targetSiswaId) {
      setInputErrorMsg("Silakan pilih siswa terlebih dahulu.");
      return;
    }

    setSaving(true);
    setInputErrorMsg(null);
    setInputSuccessMsg(null);

    const payloadPenilaian = kriteriaList.map((k) => ({
      kriteria_id: k.id,
      nilai: parseInt(inputScores[k.id] || "0", 10),
      catatan: inputCatatan || "Verifikasi Instruktur",
    }));

    try {
      const res = await fetch("/api/v1/penilaian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siswa_id: targetSiswaId,
          tanggal: inputTanggal,
          penilaian: payloadPenilaian,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInputErrorMsg(data.error?.message || "Gagal menyimpan nilai.");
        return;
      }

      setInputSuccessMsg("Nilai harian berhasil disimpan!");
      setTimeout(() => {
        setModalInputOpen(false);
        loadData();
        if (selectedSiswa && selectedSiswa.id === targetSiswaId) {
          handleOpenTranskrip(selectedSiswa);
        }
      }, 750);
    } catch {
      setInputErrorMsg("Gagal terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

interface SiswaTableItem extends SiswaPenilaianItem {
  display_no: number;
}

  // Filter & Search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search Query
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.nama_lengkap.toLowerCase().includes(q) ||
        item.nomor_induk.toLowerCase().includes(q) ||
        (item.program?.nama && item.program.nama.toLowerCase().includes(q));

      // 2. Program Filter
      const matchProg =
        !selectedProgramFilter || item.program?.id === selectedProgramFilter;

      // 3. Tab Filter
      let matchTab = true;
      if (activeTab === "siap_ujian") matchTab = item.status === "Siap Ujian";
      else if (activeTab === "dalam_bimbingan") matchTab = item.status === "Dalam Bimbingan";
      else if (activeTab === "belum_dinilai") matchTab = item.status === "Belum Dinilai";

      return matchSearch && matchProg && matchTab;
    });
  }, [items, search, selectedProgramFilter, activeTab]);

  const tableData: SiswaTableItem[] = useMemo(() => {
    return filteredItems.map((item, idx) => ({
      ...item,
      display_no: idx + 1,
    }));
  }, [filteredItems]);

  // Statistik Ringkasan
  const stats = useMemo(() => {
    const totalSiswa = items.length;
    const siapUjianCount = items.filter((i) => i.status === "Siap Ujian").length;
    const dalamBimbinganCount = items.filter((i) => i.status === "Dalam Bimbingan").length;
    const belumDinilaiCount = items.filter((i) => i.status === "Belum Dinilai").length;

    const itemsWithScores = items.filter((i) => i.total_penilaian > 0);
    const avgNilaiAll =
      itemsWithScores.length > 0
        ? Math.round(
            (itemsWithScores.reduce((acc, curr) => acc + curr.rata_rata, 0) /
              itemsWithScores.length) *
              10
          ) / 10
        : 0;

    return {
      totalSiswa,
      siapUjianCount,
      dalamBimbinganCount,
      belumDinilaiCount,
      avgNilaiAll,
    };
  }, [items]);

  // Definisi Kolom Tabel
  const columns = [
    {
      key: "display_no",
      header: "No",
      className: "w-12 text-center",
      render: (r: SiswaTableItem) => (
        <span className="font-mono text-xs text-[#9CA3AF]">{r.display_no}</span>
      ),
    },
    {
      key: "nomor_induk",
      header: "No. Induk",
      className: "w-28",
      render: (r: SiswaTableItem) => (
        <span className="font-mono text-xs font-semibold text-[#DC2626]">
          {r.nomor_induk}
        </span>
      ),
    },
    {
      key: "nama",
      header: "Nama Siswa",
      render: (r: SiswaTableItem) => (
        <div className="flex flex-col">
          <span className="font-medium text-xs text-[#F9FAFB]">{r.nama_lengkap}</span>
          <span className="text-[10px] text-[#6B7280]">
            {r.program?.nama || "Umum"}
          </span>
        </div>
      ),
    },
    {
      key: "hari_latihan",
      header: "Hari Dinilai",
      render: (r: SiswaTableItem) => (
        <span className="font-mono text-xs text-[#D1D5DB]">
          {r.total_hari > 0 ? `${r.total_hari} Hari` : "—"}
        </span>
      ),
    },
    {
      key: "rata_rata",
      header: "Rata-rata Nilai",
      render: (r: SiswaTableItem) => {
        if (r.total_penilaian === 0) {
          return <span className="text-xs text-[#6B7280]">—</span>;
        }
        const isGood = r.rata_rata >= 80;
        return (
          <span
            className={`font-mono text-xs font-bold ${
              isGood ? "text-[#10B981]" : "text-[#F59E0B]"
            }`}
          >
            {r.rata_rata}
          </span>
        );
      },
    },
    {
      key: "kompeten",
      header: "Kriteria Kompeten",
      render: (r: SiswaTableItem) => {
        const ratio = `${r.kriteria_kompeten}/${r.total_kriteria}`;
        if (r.total_penilaian === 0) {
          return <span className="text-xs text-[#6B7280]">0/{r.total_kriteria}</span>;
        }
        return (
          <Badge
            variant={r.siap_ujian ? "spark" : "neutral"}
            className="font-mono whitespace-nowrap shrink-0 text-[10px]"
          >
            {ratio} Kriteria
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: "Status Ujian",
      render: (r: SiswaTableItem) => {
        if (r.status === "Siap Ujian") {
          return (
            <Badge
              variant="spark"
              className="bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Siap Ujian
            </Badge>
          );
        }
        if (r.status === "Dalam Bimbingan") {
          return (
            <Badge
              variant="spark"
              className="bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30 whitespace-nowrap shrink-0"
            >
              <AlertTriangle className="h-3 w-3 mr-1 inline" /> Dalam Bimbingan
            </Badge>
          );
        }
        return (
          <Badge variant="neutral" className="whitespace-nowrap shrink-0">
            <HelpCircle className="h-3 w-3 mr-1 inline" /> Belum Dinilai
          </Badge>
        );
      },
    },
    {
      key: "terakhir",
      header: "Terakhir Dinilai",
      render: (r: SiswaTableItem) => (
        <span className="font-mono text-[11px] text-[#9CA3AF]">
          {r.terakhir_dinilai ? formatDateIndo(r.terakhir_dinilai) : "—"}
        </span>
      ),
    },
    {
      key: "aksi",
      header: "Aksi",
      render: (r: SiswaTableItem) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenTranskrip(r)}
            className="h-7 px-2.5 text-xs gap-1.5 border-[#374151] hover:border-[#DC2626] hover:bg-[#DC2626]/10 hover:text-white transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-[#DC2626]" /> Transkrip Nilai
          </Button>
          <button
            onClick={() => handleOpenInputModal(r.id)}
            className="p-1.5 rounded-lg border border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:text-white hover:border-[#374151] transition-colors"
            title="Input nilai harian siswa ini"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Actions */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Penilaian Harian</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Monitoring kurva perkembangan praktek pengelasan, evaluasi kelayakan kriteria, dan transkrip nilai siswa aktif.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => handleOpenInputModal()}
            className="gap-1.5 h-8 px-3"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Input / Koreksi Nilai
          </Button>
          <a
            href={`/api/v1/excel/export?modul=penilaian${
              selectedProgramFilter ? `&program_id=${selectedProgramFilter}` : ""
            }`}
            download
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#1F2937] bg-[#111827] hover:bg-[#1F2937] text-xs font-medium text-[#D1D5DB] transition-colors"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Ekspor Rekap Excel
          </a>
          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:text-white transition-colors"
            title="Segarkan data penilaian"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <GraduationCap className="h-4 w-4 text-[#D1D5DB]" />
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Siswa Aktif</p>
            <p className="text-sm font-bold text-[#F9FAFB]">
              {loading ? "..." : `${stats.totalSiswa} Siswa`}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Siap Ujian</p>
            <p className="text-sm font-bold text-[#10B981]">
              {loading ? "..." : `${stats.siapUjianCount} Siswa`}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Dalam Bimbingan</p>
            <p className="text-sm font-bold text-[#F59E0B]">
              {loading ? "..." : `${stats.dalamBimbinganCount} Siswa`}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#6B7280]/10 border border-[#6B7280]/20 flex items-center justify-center shrink-0">
            <HelpCircle className="h-4 w-4 text-[#9CA3AF]" />
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Belum Dinilai</p>
            <p className="text-sm font-bold text-[#9CA3AF]">
              {loading ? "..." : `${stats.belumDinilaiCount} Siswa`}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-[#38BDF8]" />
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Rata-rata Nilai</p>
            <p className="text-sm font-bold text-[#38BDF8]">
              {loading ? "..." : stats.avgNilaiAll}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Tabs Status */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111827] border border-[#1F2937]">
            <button
              onClick={() => setActiveTab("semua")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "semua"
                  ? "bg-[#DC2626] text-white"
                  : "text-[#9CA3AF] hover:text-white"
              }`}
            >
              Semua ({stats.totalSiswa})
            </button>
            <button
              onClick={() => setActiveTab("siap_ujian")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "siap_ujian"
                  ? "bg-[#10B981] text-white"
                  : "text-[#9CA3AF] hover:text-white"
              }`}
            >
              Siap Ujian ({stats.siapUjianCount})
            </button>
            <button
              onClick={() => setActiveTab("dalam_bimbingan")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "dalam_bimbingan"
                  ? "bg-[#F59E0B] text-black font-semibold"
                  : "text-[#9CA3AF] hover:text-white"
              }`}
            >
              Dalam Bimbingan ({stats.dalamBimbinganCount})
            </button>
            <button
              onClick={() => setActiveTab("belum_dinilai")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "belum_dinilai"
                  ? "bg-[#374151] text-white"
                  : "text-[#9CA3AF] hover:text-white"
              }`}
            >
              Belum Dinilai ({stats.belumDinilaiCount})
            </button>
          </div>

          {/* Program Filter & Search */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[280px]">
            <select
              value={selectedProgramFilter}
              onChange={(e) => setSelectedProgramFilter(e.target.value)}
              className="h-9 rounded-lg border border-[#374151] bg-[#111827] px-2.5 text-xs text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
            >
              <option value="">Semua Program</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </select>

            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari siswa / nomor induk..."
                className="h-9 w-full rounded-lg border border-[#374151] bg-[#111827] pl-8 pr-3 text-xs text-[#F9FAFB] placeholder-[#6B7280] focus:border-[#DC2626] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Siswa Penilaian */}
      {loading ? (
        <TableSkeleton rows={8} columns={9} />
      ) : (
        <Table
          columns={columns}
          data={tableData}
          emptyMessage="Tidak ada data siswa yang cocok dengan filter penilaian."
        />
      )}

      {/* MODAL TRANSKRIP NILAI SISWA */}
      <Modal
        open={modalTranskripOpen}
        onClose={() => setModalTranskripOpen(false)}
        title="Transkrip & Kurva Penilaian Praktek"
        description={
          selectedSiswa
            ? `Rincian lengkap hasil evaluasi harian, kelayakan kompetensi kriteria, dan kurva tren untuk ${selectedSiswa.nama_lengkap} (${selectedSiswa.nomor_induk})`
            : "Transkrip nilai siswa."
        }
      >
        {selectedSiswa && (
          <div className="flex flex-col gap-5 max-h-[80vh] overflow-y-auto pr-1">
            {/* Box Identitas & Aksi Unduh */}
            <div className="rounded-xl border border-[#1F2937] bg-[#0B0F17] p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center justify-center shrink-0">
                  <Award className="h-5 w-5 text-[#DC2626]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#F9FAFB]">
                      {selectedSiswa.nama_lengkap}
                    </h3>
                    <Badge
                      variant={selectedSiswa.siap_ujian ? "spark" : "neutral"}
                      className="text-[10px]"
                    >
                      {selectedSiswa.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    No. Induk: <span className="font-mono text-white">{selectedSiswa.nomor_induk}</span> • Program:{" "}
                    <span className="text-[#D1D5DB]">{selectedSiswa.program?.nama || "Umum"}</span>
                  </p>
                </div>
              </div>

              <a
                href={`/api/v1/excel/export?modul=penilaian&siswa_id=${selectedSiswa.id}`}
                download
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-xs font-semibold text-white transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Unduh Transkrip (.xlsx)
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-2.5">
                <p className="text-[10px] text-[#9CA3AF]">Rata-rata Nilai</p>
                <p
                  className={`text-sm font-mono font-bold ${
                    selectedSiswa.rata_rata >= 80 ? "text-[#10B981]" : "text-[#F59E0B]"
                  }`}
                >
                  {selectedSiswa.rata_rata || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-2.5">
                <p className="text-[10px] text-[#9CA3AF]">Nilai Tertinggi</p>
                <p className="text-sm font-mono font-bold text-[#10B981]">
                  {selectedSiswa.nilai_tertinggi || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-2.5">
                <p className="text-[10px] text-[#9CA3AF]">Hari Latihan</p>
                <p className="text-sm font-mono font-bold text-[#F9FAFB]">
                  {selectedSiswa.total_hari} Hari
                </p>
              </div>
              <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-2.5">
                <p className="text-[10px] text-[#9CA3AF]">Kriteria Kompeten</p>
                <p className="text-sm font-mono font-bold text-[#DC2626]">
                  {selectedSiswa.kriteria_kompeten} / {selectedSiswa.total_kriteria}
                </p>
              </div>
            </div>

            {/* Status Kompetensi per Kriteria */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F9FAFB] flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-[#DC2626]" /> Status Kompetensi per Kriteria (KKM: 80)
                </span>
                <span className="text-[11px] text-[#9CA3AF]">
                  Nilai tertinggi wajib mencapai minimal 80 untuk tiap kriteria
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {kriteriaList.map((k) => {
                  const key = k.nama_kriteria.toLowerCase();
                  const item = statusKelayakan[key] || {
                    nama: k.nama_kriteria,
                    nilai_tertinggi: 0,
                    lulus: false,
                  };
                  const val = item.nilai_tertinggi;
                  const isPass = item.lulus || val >= k.batas_lulus;

                  return (
                    <div
                      key={k.id}
                      className="p-3 rounded-xl border border-[#1F2937] bg-[#111827] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {isPass ? (
                          <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-[#F59E0B] shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-[#D1D5DB] truncate">
                              {k.nama_kriteria}
                            </span>
                            <span
                              className={`font-mono text-xs font-bold ${
                                isPass ? "text-[#10B981]" : "text-[#F59E0B]"
                              }`}
                            >
                              {val > 0 ? val : "—"}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#0B0F17] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, val)}%`,
                                background: isPass ? "#10B981" : "#F59E0B",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grafik Tren Perkembangan */}
            <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#DC2626]" />
                  <span className="text-xs font-semibold text-[#F9FAFB]">
                    Kurva Tren Penilaian Harian
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {kriteriaList.map((k, idx) => {
                    const warna = WARNA_PALETTE[idx % WARNA_PALETTE.length];
                    const key = k.nama_kriteria.toLowerCase();
                    const isActive = focusKriteria === key;
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setFocusKriteria(isActive ? null : key)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all"
                        style={{
                          borderColor: warna,
                          color: focusKriteria === null || isActive ? warna : "#6B7280",
                          background: isActive ? `${warna}25` : "transparent",
                          opacity: focusKriteria && !isActive ? 0.35 : 1,
                        }}
                      >
                        {k.nama_kriteria}
                      </button>
                    );
                  })}
                </div>
              </div>

              {loadingTranskrip ? (
                <div className="py-16 flex items-center justify-center text-xs text-[#9CA3AF]">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat grafik tren...
                </div>
              ) : trendData.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#6B7280]">
                  Belum ada rekaman sesi penilaian untuk siswa ini.
                </div>
              ) : (
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                      <XAxis
                        dataKey="tanggal"
                        tick={{ fill: "#9CA3AF", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[50, 100]}
                        tick={{ fill: "#9CA3AF", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0B0F17",
                          borderColor: "#1F2937",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <ReferenceLine y={80} stroke="#10B981" strokeDasharray="3 3" label={{ value: "KKM 80", fill: "#10B981", fontSize: 10 }} />
                      {kriteriaList.map((k, idx) => {
                        const key = k.nama_kriteria.toLowerCase();
                        const warna = WARNA_PALETTE[idx % WARNA_PALETTE.length];
                        const isFocus = focusKriteria === null || focusKriteria === key;
                        return (
                          <Line
                            key={k.id}
                            type="monotone"
                            dataKey={key}
                            name={k.nama_kriteria}
                            stroke={warna}
                            strokeWidth={isFocus ? 2.5 : 1}
                            strokeOpacity={isFocus ? 1 : 0.2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Rincian Lengkap Nilai per Hari */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F9FAFB] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#DC2626]" /> Rincian Nilai per Hari
                </span>
                <span className="text-[11px] text-[#9CA3AF]">
                  Total {riwayatMentah.length} data penilaian
                </span>
              </div>

              {riwayatMentah.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#6B7280] rounded-xl border border-[#1F2937] bg-[#111827]">
                  Belum ada riwayat penilaian harian yang tercatat.
                </div>
              ) : (
                <div className="rounded-xl border border-[#1F2937] overflow-hidden bg-[#111827]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1F2937] bg-[#0B0F17] text-[#9CA3AF]">
                        <th className="py-2.5 px-3 font-medium">Tanggal</th>
                        <th className="py-2.5 px-3 font-medium">Kriteria</th>
                        <th className="py-2.5 px-3 font-medium text-center">Nilai</th>
                        <th className="py-2.5 px-3 font-medium">Penginput</th>
                        <th className="py-2.5 px-3 font-medium">Catatan Instruktur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2937]">
                      {riwayatMentah.map((row) => {
                        const kName = row.kriteria?.nama_kriteria || "—";
                        const pass = row.nilai >= (row.kriteria?.batas_lulus || 80);
                        return (
                          <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#D1D5DB]">
                              {formatDateIndo(row.tanggal)}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-[#F9FAFB]">
                              {kName}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`font-mono font-bold ${
                                  pass ? "text-[#10B981]" : "text-[#F59E0B]"
                                }`}
                              >
                                {row.nilai}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant={row.created_by === "superadmin" ? "spark" : "neutral"}
                                className="text-[10px]"
                              >
                                {row.created_by === "superadmin" ? "Instruktur" : "Mandiri Siswa"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-[#9CA3AF] text-[11px]">
                              {row.catatan || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1F2937]">
              <Button
                variant="outline"
                onClick={() => setModalTranskripOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL INPUT / KOREKSI NILAI */}
      <Modal
        open={modalInputOpen}
        onClose={() => setModalInputOpen(false)}
        title="Input / Koreksi Nilai Praktek"
        description="Masukkan hasil evaluasi harian praktek pengelasan siswa."
      >
        <form onSubmit={handleSubmitNilai} className="flex flex-col gap-4">
          {inputErrorMsg && (
            <div className="rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/20 p-2.5 text-xs text-[#F43F5E] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{inputErrorMsg}</span>
            </div>
          )}

          {inputSuccessMsg && (
            <div className="rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 p-2.5 text-xs text-[#10B981] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{inputSuccessMsg}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#9CA3AF]">Pilih Siswa</label>
            <select
              value={targetSiswaId}
              onChange={(e) => setTargetSiswaId(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#374151] bg-[#0B0F17] px-3 text-xs text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
              required
            >
              <option value="">Pilih siswa...</option>
              {items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nomor_induk} — {s.nama_lengkap} ({s.program?.nama || "Umum"})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#9CA3AF]">Tanggal Penilaian</label>
              <input
                type="date"
                value={inputTanggal}
                onChange={(e) => setInputTanggal(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#374151] bg-[#0B0F17] px-3 text-xs text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#9CA3AF]">Catatan Evaluasi</label>
              <input
                type="text"
                value={inputCatatan}
                onChange={(e) => setInputCatatan(e.target.value)}
                placeholder="Catatan / masukan..."
                className="h-9 w-full rounded-lg border border-[#374151] bg-[#0B0F17] px-3 text-xs text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2937]">
            <span className="text-xs font-semibold text-[#F9FAFB]">
              Nilai per Kriteria Kompetensi (0–100)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {kriteriaList.map((k) => (
                <div key={k.id} className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-[#9CA3AF]">
                    {k.nama_kriteria} (KKM {k.batas_lulus})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="0–100"
                    value={inputScores[k.id] ?? ""}
                    onChange={(e) =>
                      setInputScores({ ...inputScores, [k.id]: e.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-[#374151] bg-[#0B0F17] px-3 font-mono text-xs text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1F2937]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalInputOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Menyimpan...
                </>
              ) : (
                "Simpan Nilai Praktek"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
