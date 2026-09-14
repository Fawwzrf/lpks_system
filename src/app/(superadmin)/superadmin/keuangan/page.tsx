"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  CreditCard,
  Receipt,
  Plus,
  ArrowRight,
  Clock,
  ChevronRight,
  Banknote,
  Percent,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatRupiah, formatDateIndo } from "@/lib/utils";

interface TransaksiItem {
  id: string;
  nominal: number;
  tgl_bayar: string;
  metode: string;
  keterangan?: string;
  penerima?: string;
  created_at?: string;
}

interface SiswaKeuanganItem {
  id: string;
  nomor_induk: string;
  nama_lengkap: string;
  tgl_masuk?: string;
  tgl_keluar?: string;
  program?: {
    id: string;
    kode_program: string;
    nama: string;
    biaya: number;
  };
  total_biaya: number;
  total_terbayar: number;
  sisa_tagihan: number;
  is_lunas: boolean;
  persentase: number;
  status: "Lunas" | "Cicilan" | "Belum Bayar";
  riwayat_transaksi: TransaksiItem[];
}

interface ProgramItem {
  id: string;
  kode_program: string;
  nama: string;
  biaya: number;
}

type TabFilter = "semua" | "belum_lunas" | "lunas";
type SkemaBayar = "lunas" | "cicilan";

export default function KeuanganSuperadminPage() {
  const [items, setItems] = useState<SiswaKeuanganItem[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("semua");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>("");

  // Modal Catat Pembayaran
  const [modalPaymentOpen, setModalPaymentOpen] = useState(false);
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaKeuanganItem | null>(null);
  const [skema, setSkema] = useState<SkemaBayar>("lunas");
  const [quickCicilanOption, setQuickCicilanOption] = useState<"dp" | "sisa" | "custom">("dp");
  const [nominal, setNominal] = useState<string>("");
  const [metode, setMetode] = useState<string>("Tunai");
  const [tglBayar, setTglBayar] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [keterangan, setKeterangan] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Riwayat Pembayaran
  const [modalHistoryOpen, setModalHistoryOpen] = useState(false);
  const [historySiswa, setHistorySiswa] = useState<SiswaKeuanganItem | null>(null);

  // Load programs for dropdown filter
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

  // Load data siswa aktif beserta rekap keuangan
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/v1/keuangan?view=students";
      if (selectedProgramFilter) {
        url += `&program_id=${selectedProgramFilter}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setItems(json.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat data keuangan:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedProgramFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler Buka Modal Pembayaran untuk Siswa Terpilih
  function handleOpenPaymentModal(siswa: SiswaKeuanganItem) {
    setSelectedSiswa(siswa);
    setErrorMsg(null);
    setSuccessMsg(null);
    setTglBayar(new Date().toISOString().split("T")[0]);
    setMetode("Tunai");

    // Jika siswa belum bayar sama sekali, default ke Langsung Lunas atau DP 50%
    if (siswa.total_terbayar === 0) {
      setSkema("lunas");
      setNominal(String(siswa.sisa_tagihan));
      setKeterangan("Pembayaran Lunas Pelatihan");
      setQuickCicilanOption("dp");
    } else {
      // Siswa sudah ada riwayat cicilan
      setSkema("cicilan");
      setQuickCicilanOption("sisa");
      setNominal(String(siswa.sisa_tagihan));
      setKeterangan(`Pembayaran Cicilan Lanjutan (Ke-${siswa.riwayat_transaksi.length + 1})`);
    }

    setModalPaymentOpen(true);
  }

  // Handle Switch Skema
  function handleSelectSkema(newSkema: SkemaBayar) {
    if (!selectedSiswa) return;
    setSkema(newSkema);
    setErrorMsg(null);

    if (newSkema === "lunas") {
      setNominal(String(selectedSiswa.sisa_tagihan));
      setKeterangan(
        selectedSiswa.total_terbayar > 0
          ? "Pelunasan Sisa Biaya Pelatihan"
          : "Pembayaran Lunas Pelatihan"
      );
    } else {
      // Skema Cicilan
      if (selectedSiswa.total_terbayar === 0) {
        const dp50 = Math.round(selectedSiswa.total_biaya * 0.5);
        setQuickCicilanOption("dp");
        setNominal(String(dp50));
        setKeterangan("Pembayaran DP 50% Pelatihan");
      } else {
        setQuickCicilanOption("sisa");
        setNominal(String(selectedSiswa.sisa_tagihan));
        setKeterangan(
          `Pembayaran Cicilan Lanjutan (Ke-${selectedSiswa.riwayat_transaksi.length + 1})`
        );
      }
    }
  }

  // Handle Quick Cicilan Option
  function handleSelectQuickCicilan(option: "dp" | "sisa" | "custom") {
    if (!selectedSiswa) return;
    setQuickCicilanOption(option);
    setErrorMsg(null);

    if (option === "dp") {
      const dp = Math.round(selectedSiswa.total_biaya * 0.5);
      setNominal(String(dp));
      setKeterangan("Pembayaran DP 50% Pelatihan");
    } else if (option === "sisa") {
      setNominal(String(selectedSiswa.sisa_tagihan));
      setKeterangan(
        selectedSiswa.total_terbayar > 0
          ? `Pelunasan Sisa Angsuran Pelatihan`
          : "Pembayaran Lunas Pelatihan"
      );
    } else {
      // custom
      setNominal("");
      setKeterangan("Pembayaran Angsuran Pelatihan");
    }
  }

  // Submit Simpan Transaksi Pembayaran
  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSiswa) return;

    const numNominal = parseFloat(nominal);
    if (isNaN(numNominal) || numNominal <= 0) {
      setErrorMsg("Nominal pembayaran harus lebih besar dari Rp 0.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      siswa_id: selectedSiswa.id,
      nominal: numNominal,
      metode,
      tgl_bayar: tglBayar,
      keterangan: keterangan || (skema === "lunas" ? "Pembayaran Lunas" : "Pembayaran Cicilan"),
    };

    try {
      const res = await fetch("/api/v1/keuangan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error?.message || "Gagal mencatat transaksi pembayaran.");
        return;
      }

      setSuccessMsg("Pembayaran berhasil dicatat!");
      await loadData();
      setTimeout(() => {
        setModalPaymentOpen(false);
      }, 1000);
    } catch {
      setErrorMsg("Terjadi gangguan koneksi ke server.");
    } finally {
      setSaving(false);
    }
  }

  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filter status
      if (activeTab === "lunas" && !item.is_lunas) return false;
      if (activeTab === "belum_lunas" && item.is_lunas) return false;

      // Filter search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNama = item.nama_lengkap.toLowerCase().includes(q);
        const matchNoInduk = item.nomor_induk.toLowerCase().includes(q);
        const matchProg = item.program?.nama.toLowerCase().includes(q);
        if (!matchNama && !matchNoInduk && !matchProg) return false;
      }

      return true;
    });
  }, [items, activeTab, search]);

  // Ringkasan Statistik
  const stats = useMemo(() => {
    const totalSiswa = items.length;
    const lunasCount = items.filter((i) => i.is_lunas).length;
    const belumLunasCount = totalSiswa - lunasCount;
    const totalTerkumpul = items.reduce((acc, i) => acc + i.total_terbayar, 0);
    const totalPiutang = items.reduce((acc, i) => acc + i.sisa_tagihan, 0);

    return {
      totalSiswa,
      lunasCount,
      belumLunasCount,
      totalTerkumpul,
      totalPiutang,
    };
  }, [items]);

  // Definisi Kolom Tabel
  const columns = [
    {
      key: "nomor_induk",
      header: "No. Induk",
      className: "w-28",
      render: (r: SiswaKeuanganItem) => (
        <span className="font-mono text-xs text-[#DC2626] font-bold">{r.nomor_induk}</span>
      ),
    },
    {
      key: "nama",
      header: "Nama Siswa & Program",
      render: (r: SiswaKeuanganItem) => (
        <div>
          <p className="text-xs font-semibold text-[#F9FAFB]">{r.nama_lengkap}</p>
          <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[#1F2937] text-[#9CA3AF] border border-[#374151]/50">
            {r.program?.nama || "Umum"}
          </span>
        </div>
      ),
    },
    {
      key: "biaya",
      header: "Biaya Pelatihan",
      className: "w-32",
      render: (r: SiswaKeuanganItem) => (
        <span className="text-xs font-medium text-[#D1D5DB]">
          {r.total_biaya > 0 ? formatRupiah(r.total_biaya) : "Gratis / —"}
        </span>
      ),
    },
    {
      key: "terbayar",
      header: "Terbayar",
      className: "w-40",
      render: (r: SiswaKeuanganItem) => {
        const isFull = r.persentase >= 100;
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={isFull ? "text-[#10B981]" : "text-[#F59E0B]"}>
                {formatRupiah(r.total_terbayar)}
              </span>
              <span className="text-[10px] text-[#9CA3AF]">{r.persentase}%</span>
            </div>
            <div className="w-full bg-[#1F2937] rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  isFull ? "bg-[#10B981]" : r.persentase > 0 ? "bg-[#F59E0B]" : "bg-transparent"
                }`}
                style={{ width: `${r.persentase}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "sisa",
      header: "Sisa Tagihan",
      className: "w-36",
      render: (r: SiswaKeuanganItem) => (
        <div>
          {r.is_lunas ? (
            <span className="text-xs font-semibold text-[#10B981]">Rp 0 (Lunas)</span>
          ) : (
            <span className="text-xs font-bold text-[#F43F5E]">
              {formatRupiah(r.sisa_tagihan)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-36 whitespace-nowrap",
      render: (r: SiswaKeuanganItem) => {
        if (r.is_lunas) {
          return (
            <Badge
              variant="outline"
              className="bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 gap-1.5 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Lunas</span>
            </Badge>
          );
        }
        if (r.total_terbayar > 0) {
          return (
            <Badge
              variant="outline"
              className="bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30 gap-1.5 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shrink-0"
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Cicilan ({r.persentase}%)</span>
            </Badge>
          );
        }
        return (
          <Badge
            variant="outline"
            className="bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/30 gap-1.5 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shrink-0"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Belum Bayar</span>
          </Badge>
        );
      },
    },
    {
      key: "aksi",
      header: "Aksi",
      className: "w-44 text-right",
      render: (r: SiswaKeuanganItem) => (
        <div className="flex items-center justify-end gap-1.5">
          {r.is_lunas ? (
            <button
              onClick={() => {
                setHistorySiswa(r);
                setModalHistoryOpen(true);
              }}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20 transition-all"
              title="Lihat Riwayat Transaksi"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Riwayat</span>
            </button>
          ) : (
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white"
              onClick={() => handleOpenPaymentModal(r)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Catat Bayar</span>
            </Button>
          )}

          {r.riwayat_transaksi.length > 0 && !r.is_lunas && (
            <button
              onClick={() => {
                setHistorySiswa(r);
                setModalHistoryOpen(true);
              }}
              className="p-1.5 rounded-lg border border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:text-white transition-colors"
              title={`Lihat Riwayat (${r.riwayat_transaksi.length} transaksi)`}
            >
              <Receipt className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Actions */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Keuangan Siswa</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Monitoring pembayaran pelatihan siswa aktif, verifikasi pelunasan, dan pencatatan cicilan.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/api/v1/excel/export?modul=keuangan&type=rekap"
            download
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#1F2937] bg-[#111827] hover:bg-[#1F2937] text-xs font-medium text-[#D1D5DB] transition-colors"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Ekspor Rekap Excel
          </a>
          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:text-white transition-colors"
            title="Segarkan data keuangan"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Wallet className="h-4 w-4 text-[#D1D5DB]" />
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Siswa Aktif</p>
            <p className="text-sm font-bold text-[#F9FAFB]">{loading ? "..." : `${stats.totalSiswa} Siswa`}</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Sudah Lunas</p>
            <p className="text-sm font-bold text-[#10B981]">{loading ? "..." : `${stats.lunasCount} Siswa`}</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Belum Lunas / Cicil</p>
            <p className="text-sm font-bold text-[#F59E0B]">{loading ? "..." : `${stats.belumLunasCount} Siswa`}</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center shrink-0">
            <Banknote className="h-4 w-4 text-[#10B981]" />
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Total Terkumpul</p>
            <p className="text-xs font-bold text-[#10B981]">{loading ? "..." : formatRupiah(stats.totalTerkumpul)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3.5 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="h-9 w-9 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/20 flex items-center justify-center shrink-0">
            <AlertCircle className="h-4 w-4 text-[#F43F5E]" />
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Sisa Piutang</p>
            <p className="text-xs font-bold text-[#F43F5E]">{loading ? "..." : formatRupiah(stats.totalPiutang)}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Status Tabs */}
        <div className="flex rounded-lg bg-[#111827] border border-[#1F2937] p-1 gap-1">
          <button
            onClick={() => setActiveTab("semua")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "semua"
                ? "bg-[#DC2626] text-white"
                : "text-[#9CA3AF] hover:text-[#D1D5DB]"
            }`}
          >
            Semua ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("belum_lunas")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "belum_lunas"
                ? "bg-[#DC2626] text-white"
                : "text-[#9CA3AF] hover:text-[#D1D5DB]"
            }`}
          >
            Belum Lunas ({stats.belumLunasCount})
          </button>
          <button
            onClick={() => setActiveTab("lunas")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "lunas"
                ? "bg-[#DC2626] text-white"
                : "text-[#9CA3AF] hover:text-[#D1D5DB]"
            }`}
          >
            Lunas ({stats.lunasCount})
          </button>
        </div>

        <div className="flex items-center gap-2.5 flex-1 max-w-lg">
          {/* Program Filter */}
          <div className="w-[180px]">
            <Select
              value={selectedProgramFilter}
              onChange={(e) => setSelectedProgramFilter(e.target.value)}
            >
              <option value="">Semua Program</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </Select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Cari nama atau no. induk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#1F2937] bg-[#111827] text-xs text-[#F9FAFB] placeholder-[#6B7280] focus:outline-none focus:border-[#DC2626]"
            />
          </div>
        </div>
      </div>

      {/* Tabel Siswa Keuangan */}
      {loading ? (
        <TableSkeleton rows={8} columns={7} />
      ) : (
        <Table
          columns={columns}
          data={filteredItems}
          emptyMessage="Tidak ada data siswa yang cocok dengan filter."
        />
      )}

      {/* MODAL CATAT PEMBAYARAN */}
      <Modal
        open={modalPaymentOpen}
        onClose={() => setModalPaymentOpen(false)}
        title="Catat Pembayaran Siswa"
        description="Pilih skema pembayaran langsung lunas atau cicilan (DP 50% di awal)."
      >
        {selectedSiswa && (
          <form onSubmit={handleSubmitPayment} className="flex flex-col gap-4">
            {/* Box Info Ringkasan Siswa */}
            <div className="rounded-xl border border-[#1F2937] bg-[#0B0F17] p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-[#DC2626]">
                    {selectedSiswa.nomor_induk}
                  </span>
                  <h3 className="text-sm font-bold text-[#F9FAFB] mt-0.5">
                    {selectedSiswa.nama_lengkap}
                  </h3>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    {selectedSiswa.program?.nama || "Pelatihan Kejuruan"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider block">
                    Sisa Tagihan
                  </span>
                  <span className="text-sm font-bold text-[#F43F5E]">
                    {formatRupiah(selectedSiswa.sisa_tagihan)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#1F2937]/70 text-center">
                <div>
                  <p className="text-[10px] text-[#9CA3AF]">Total Biaya</p>
                  <p className="text-xs font-semibold text-[#F9FAFB]">
                    {formatRupiah(selectedSiswa.total_biaya)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#9CA3AF]">Sudah Dibayar</p>
                  <p className="text-xs font-semibold text-[#10B981]">
                    {formatRupiah(selectedSiswa.total_terbayar)} ({selectedSiswa.persentase}%)
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#9CA3AF]">Status</p>
                  <p className="text-xs font-semibold text-[#F59E0B]">
                    {selectedSiswa.is_lunas ? "Lunas" : "Belum Lunas"}
                  </p>
                </div>
              </div>
            </div>

            {/* Pemilihan Skema Pembayaran */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#D1D5DB]">
                Pilih Skema Pembayaran *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Skema 1: Langsung Lunas */}
                <button
                  type="button"
                  onClick={() => handleSelectSkema("lunas")}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                    skema === "lunas"
                      ? "border-[#10B981] bg-[#10B981]/10 text-white shadow-sm ring-1 ring-[#10B981]"
                      : "border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:border-[#374151]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-[#F9FAFB]">Langsung Lunas</span>
                    {skema === "lunas" && <CheckCircle2 className="h-4 w-4 text-[#10B981]" />}
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] mt-1">
                    Bayar penuh seluruh sisa tagihan ({formatRupiah(selectedSiswa.sisa_tagihan)})
                  </p>
                </button>

                {/* Skema 2: Cicilan / Angsuran */}
                <button
                  type="button"
                  onClick={() => handleSelectSkema("cicilan")}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                    skema === "cicilan"
                      ? "border-[#F59E0B] bg-[#F59E0B]/10 text-white shadow-sm ring-1 ring-[#F59E0B]"
                      : "border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:border-[#374151]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-[#F9FAFB]">Cicilan (DP 50%)</span>
                    {skema === "cicilan" && <Clock className="h-4 w-4 text-[#F59E0B]" />}
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] mt-1">
                    DP 50% di awal, sisa dicicil bertahap
                  </p>
                </button>
              </div>
            </div>

            {/* Pilihan Cepat Cicilan jika Skema Cicilan Aktif */}
            {skema === "cicilan" && (
              <div className="rounded-lg bg-[#111827] border border-[#1F2937] p-3 flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-[#D1D5DB]">
                  Pilihan Cepat Angsuran:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedSiswa.total_terbayar === 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSelectQuickCicilan("dp")}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
                          quickCicilanOption === "dp"
                            ? "bg-[#F59E0B] text-black border-[#F59E0B] font-bold"
                            : "bg-[#0B0F17] text-[#D1D5DB] border-[#1F2937] hover:border-[#F59E0B]/50"
                        }`}
                      >
                        DP 50% Awal ({formatRupiah(Math.round(selectedSiswa.total_biaya * 0.5))})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectQuickCicilan("custom")}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
                          quickCicilanOption === "custom"
                            ? "bg-[#F59E0B] text-black border-[#F59E0B] font-bold"
                            : "bg-[#0B0F17] text-[#D1D5DB] border-[#1F2937] hover:border-[#F59E0B]/50"
                        }`}
                      >
                        Nominal Kustom
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSelectQuickCicilan("sisa")}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
                          quickCicilanOption === "sisa"
                            ? "bg-[#F59E0B] text-black border-[#F59E0B] font-bold"
                            : "bg-[#0B0F17] text-[#D1D5DB] border-[#1F2937] hover:border-[#F59E0B]/50"
                        }`}
                      >
                        Pelunasan Sisa ({formatRupiah(selectedSiswa.sisa_tagihan)})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectQuickCicilan("custom")}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
                          quickCicilanOption === "custom"
                            ? "bg-[#F59E0B] text-black border-[#F59E0B] font-bold"
                            : "bg-[#0B0F17] text-[#D1D5DB] border-[#1F2937] hover:border-[#F59E0B]/50"
                        }`}
                      >
                        Nominal Kustom
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Input Nominal */}
            <div>
              <Input
                label="Nominal Pembayaran (Rp) *"
                type="number"
                min={1000}
                required
                value={nominal}
                onChange={(e) => {
                  setNominal(e.target.value);
                  if (skema === "cicilan") setQuickCicilanOption("custom");
                }}
                placeholder="Masukkan nominal angka..."
              />
              {nominal && !isNaN(Number(nominal)) && Number(nominal) > 0 && (
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span className="text-[#10B981] font-semibold">
                    Terbilang: {formatRupiah(Number(nominal))}
                  </span>
                  {Number(nominal) > selectedSiswa.sisa_tagihan && (
                    <span className="text-[#F43F5E] font-medium">
                      ⚠️ Melebihi sisa tagihan ({formatRupiah(selectedSiswa.sisa_tagihan)})
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tanggal Bayar */}
              <Input
                label="Tanggal Bayar *"
                type="date"
                required
                value={tglBayar}
                onChange={(e) => setTglBayar(e.target.value)}
              />

              {/* Metode Bayar */}
              <Select
                label="Metode Pembayaran *"
                value={metode}
                onChange={(e) => setMetode(e.target.value)}
              >
                <option value="Tunai">Tunai / Cash</option>
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="QRIS">QRIS</option>
              </Select>
            </div>

            {/* Keterangan */}
            <Input
              label="Keterangan Transaksi"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Pembayaran DP 50% / Pelunasan Pelatihan"
            />

            {/* Riwayat Transaksi Siswa Terdahulu di Dalam Modal */}
            {selectedSiswa.riwayat_transaksi.length > 0 && (
              <div className="rounded-lg border border-[#1F2937] bg-[#0B0F17] p-3">
                <p className="text-[11px] font-bold text-[#9CA3AF] mb-2 flex items-center justify-between">
                  <span>Riwayat Transaksi Siswa ({selectedSiswa.riwayat_transaksi.length})</span>
                  <span className="text-[#10B981]">
                    Total Masuk: {formatRupiah(selectedSiswa.total_terbayar)}
                  </span>
                </p>
                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {selectedSiswa.riwayat_transaksi.map((tx, idx) => (
                    <div
                      key={tx.id || idx}
                      className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-[#111827] border border-[#1F2937]/50"
                    >
                      <div>
                        <span className="text-[#F9FAFB] font-semibold">{formatRupiah(tx.nominal)}</span>
                        <span className="text-[#6B7280] ml-2">({tx.metode})</span>
                      </div>
                      <span className="text-[#9CA3AF] font-mono">{formatDateIndo(tx.tgl_bayar)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/20 p-2.5 text-xs text-[#F43F5E] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 p-2.5 text-xs text-[#10B981] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-[#1F2937]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalPaymentOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="gap-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-3.5 w-3.5" /> Simpan Pembayaran
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL RIWAYAT TRANSAKSI SISWA */}
      <Modal
        open={modalHistoryOpen}
        onClose={() => setModalHistoryOpen(false)}
        title="Riwayat Transaksi Keuangan"
        description={
          historySiswa
            ? `Daftar seluruh transaksi pembayaran untuk ${historySiswa.nama_lengkap} (${historySiswa.nomor_induk})`
            : "Riwayat transaksi pembayaran siswa."
        }
      >
        {historySiswa && (
          <div className="flex flex-col gap-4">
            {/* Box Status Ringkasan */}
            <div className="rounded-xl border border-[#1F2937] bg-[#0B0F17] p-3.5 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-[#9CA3AF]">Biaya Pelatihan</p>
                <p className="text-xs font-bold text-[#F9FAFB]">
                  {formatRupiah(historySiswa.total_biaya)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#9CA3AF]">Total Terbayar</p>
                <p className="text-xs font-bold text-[#10B981]">
                  {formatRupiah(historySiswa.total_terbayar)} ({historySiswa.persentase}%)
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#9CA3AF]">Sisa Tagihan</p>
                <p
                  className={`text-xs font-bold ${
                    historySiswa.is_lunas ? "text-[#10B981]" : "text-[#F43F5E]"
                  }`}
                >
                  {historySiswa.is_lunas ? "LUNAS" : formatRupiah(historySiswa.sisa_tagihan)}
                </p>
              </div>
            </div>

            {/* List Riwayat */}
            {historySiswa.riwayat_transaksi.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#9CA3AF]">
                Belum ada transaksi pembayaran yang tercatat untuk siswa ini.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                {historySiswa.riwayat_transaksi.map((tx, idx) => (
                  <div
                    key={tx.id || idx}
                    className="p-3 rounded-xl border border-[#1F2937] bg-[#111827] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center shrink-0">
                        <Banknote className="h-4 w-4 text-[#10B981]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#F9FAFB]">
                          {formatRupiah(tx.nominal)}
                        </p>
                        <p className="text-[11px] text-[#9CA3AF]">
                          {tx.keterangan || "Pembayaran Pelatihan"} •{" "}
                          <span className="text-[#D1D5DB]">{tx.metode}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs text-[#D1D5DB]">
                        {formatDateIndo(tx.tgl_bayar)}
                      </p>
                      <p className="text-[10px] text-[#6B7280]">
                        Petugas: {tx.penerima || "Superadmin"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#1F2937]">
              <Button variant="outline" onClick={() => setModalHistoryOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
