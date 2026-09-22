"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  Plus,
  Loader2,
  RefreshCw,
  Search,
  Users,
  Download,
  Upload,
  ClipboardCheck,
  History,
  Eye,
  Trash2,
  RotateCcw,
  Printer,
  Calendar,
  UserCheck,
  ArrowRight,
  Pencil,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
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
  tgl_masuk?: string;
  tgl_keluar?: string | null;
  total_biaya: number;
  total_terbayar: number;
  is_lunas: boolean;
  nilai_harian_ok: boolean;
  status_sertifikat?: "antrean" | "dicetak" | null;
  tgl_cetak_sertifikat?: string | null;
  tgl_antrean_sertifikat?: string | null;
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

interface QueueItem {
  id: string;
  siswa_id: string;
  status: "antrean" | "dicetak";
  no_sertifikat: string;
  tgl_antrean: string;
  tgl_cetak?: string | null;
  urutan_cetak?: number | null;
  siswa: {
    id: string;
    nomor_induk: string;
    nama_lengkap: string;
    nik: string;
    tempat_lahir?: string;
    tgl_lahir?: string;
    alamat_lengkap?: string;
    no_hp?: string;
    tgl_masuk: string;
    tgl_keluar?: string;
    program?: {
      id: string;
      kode_program: string;
      nama: string;
      biaya: number;
      estimasi_durasi_hari: number;
    };
  };
  ujian?: {
    teori: number;
    root: number;
    hotpass: number;
    filler: number;
    capping: number;
    gerinda: number;
    is_lulus: boolean;
    tgl_ujian: string;
  } | null;
  formatted: {
    place_and_dob: string;
    program_name: string;
    starting_from: string;
    to: string;
    date_of_issue: string;
  };
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
  // Top-level Navigation Tab
  const [activeMainTab, setActiveMainTab] = useState<"ujian" | "antrean" | "riwayat">("ujian");

  // Data State
  const [data, setData] = useState<SiswaUjianItem[]>([]);
  const [queueData, setQueueData] = useState<QueueItem[]>([]);
  const [historyData, setHistoryData] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [riwayatSearch, setRiwayatSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"semua" | "siap_ujian" | "lulus" | "dalam_bimbingan">("semua");

  // Input Nilai Modal State
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [inputTarget, setInputTarget] = useState<SiswaUjianItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<QueueItem | null>(null);

  // Import Arsip Alumni State
  const [importArsipOpen, setImportArsipOpen] = useState(false);
  const [importArsipFile, setImportArsipFile] = useState<File | null>(null);
  const [importingArsip, setImportingArsip] = useState(false);
  const [importArsipProgress, setImportArsipProgress] = useState(0);
  const [importArsipStatus, setImportArsipStatus] = useState("");
  const [importArsipResult, setImportArsipResult] = useState<{
    success: boolean;
    message: string;
    errors?: { row: number; reason: string; type?: "warning" | "error" }[];
  } | null>(null);

  // Modal Catat / Edit Nomor Sertifikat Alumni (Arsip Fisik)
  const [modalAlumniCertOpen, setModalAlumniCertOpen] = useState(false);
  const [alumniCertTarget, setAlumniCertTarget] = useState<QueueItem | null>(null);
  const [alumniCertSiswaId, setAlumniCertSiswaId] = useState("");
  const [alumniCertNo, setAlumniCertNo] = useState("");
  const [alumniCertTgl, setAlumniCertTgl] = useState("");
  const [alumniCertSaving, setAlumniCertSaving] = useState(false);
  const [alumniCertError, setAlumniCertError] = useState<string | null>(null);
  const [alumniCertSuccess, setAlumniCertSuccess] = useState<string | null>(null);
  const [alumniSearchQuery, setAlumniSearchQuery] = useState("");
  const [allStudentsList, setAllStudentsList] = useState<{ id: string; nama_lengkap: string; nomor_induk: string; program?: { nama: string } }[]>([]);
  const [alumniDropdownOpen, setAlumniDropdownOpen] = useState(false);
  const alumniDropdownRef = React.useRef<HTMLDivElement>(null);

  // Tutup dropdown combobox saat klik di luar elemen
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (alumniDropdownRef.current && !alumniDropdownRef.current.contains(event.target as Node)) {
        setAlumniDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedStudent = useMemo(() => {
    return allStudentsList.find((s) => s.id === alumniCertSiswaId) || null;
  }, [allStudentsList, alumniCertSiswaId]);

  const filteredStudents = useMemo(() => {
    if (!alumniSearchQuery.trim()) return allStudentsList;
    if (selectedStudent && alumniSearchQuery === `${selectedStudent.nama_lengkap} (${selectedStudent.nomor_induk || "Tanpa No. Induk"})`) {
      return allStudentsList;
    }
    const q = alumniSearchQuery.toLowerCase();
    return allStudentsList.filter(
      (s) =>
        s.nama_lengkap.toLowerCase().includes(q) ||
        (s.nomor_induk && s.nomor_induk.toLowerCase().includes(q)) ||
        (s.program?.nama && s.program.nama.toLowerCase().includes(q))
    );
  }, [allStudentsList, alumniSearchQuery, selectedStudent]);

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

  // Fetch data ujian & siswa
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/v1/ujian");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Gagal memuat data ujian.");
      }
      setData(json.data || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan memuat data ujian.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch antrean & riwayat percetakan
  const fetchQueueAndHistory = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const [resQueue, resHistory] = await Promise.all([
        fetch("/api/v1/sertifikat/queue?status=antrean"),
        fetch("/api/v1/sertifikat/queue?status=dicetak"),
      ]);

      if (resQueue.ok) {
        const jsonQ = await resQueue.json();
        setQueueData(jsonQ.data || []);
      }
      if (resHistory.ok) {
        const jsonH = await resHistory.json();
        setHistoryData(jsonH.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat antrean sertifikat:", err);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchQueueAndHistory();
  }, [fetchData, fetchQueueAndHistory]);

  async function handleImportArsip(e: React.FormEvent) {
    e.preventDefault();
    if (!importArsipFile) return;
    setImportingArsip(true);
    setImportArsipProgress(0);
    setImportArsipStatus("Mempersiapkan data arsip alumni...");
    setImportArsipResult(null);

    const formData = new FormData();
    formData.append("file", importArsipFile);

    try {
      const res = await fetch("/api/v1/excel/import?modul=arsip_alumni", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setImportArsipResult({ success: false, message: json.error?.message || "Gagal mengimpor file arsip alumni." });
        setImportingArsip(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setImportingArsip(false);
        return;
      }
      const decoder = new TextDecoder();
      let finalResult = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === "progress") {
              setImportArsipProgress(parsed.progress);
              setImportArsipStatus(parsed.status);
            } else if (parsed.type === "done") {
              finalResult = parsed.result;
            } else if (parsed.type === "error") {
              setImportArsipResult({ success: false, message: parsed.message });
              setImportingArsip(false);
              return;
            }
          } catch {}
        }
      }

      setImportingArsip(false);
      await fetchQueueAndHistory();
      await fetchData();

      if (finalResult) {
        setImportArsipResult({
          success: true,
          message: finalResult.message,
          errors: finalResult.errors,
        });
      }
    } catch {
      setImportArsipResult({ success: false, message: "Terjadi kesalahan saat mengunggah file arsip." });
      setImportingArsip(false);
    }
  }

  // Statistik Ringkasan
  const stats = useMemo(() => {
    const total = data.length;
    const siapUjian = data.filter((s) => s.nilai_harian_ok && !s.ujian?.is_lulus).length;
    const lulus = data.filter((s) => !!s.ujian?.is_lulus).length;
    const dalamBimbingan = data.filter((s) => !s.nilai_harian_ok).length;
    return { total, siapUjian, lulus, dalamBimbingan };
  }, [data]);

  // Sorting nomor urut
  const getUrutan = (noInduk?: string | null) => {
    if (!noInduk) return 999999;
    if (noInduk.includes("—") || noInduk.includes("-")) return 1110.5;
    const parts = noInduk.split(".");
    const lastPart = parts.length > 1 ? parts.slice(1).join(".") : parts[0];
    const num = parseInt(lastPart.replace(/\D/g, ""), 10);
    return isNaN(num) ? 999999 : num;
  };

  const getPriority = (item: SiswaUjianItem) => {
    if (item.nilai_harian_ok && !item.ujian?.is_lulus) return 0;
    if (item.nilai_harian_ok && item.ujian?.is_lulus && item.status_sertifikat !== "dicetak") return 1;
    if (!item.nilai_harian_ok && !item.ujian?.is_lulus) return 2;
    return 3;
  };

  const filteredAndSortedData = useMemo(() => {
    return data
      .filter((s) => {
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchName = s.nama_lengkap.toLowerCase().includes(q);
          const matchNo = s.nomor_induk.toLowerCase().includes(q);
          const matchProg = s.program_nama.toLowerCase().includes(q);
          if (!matchName && !matchNo && !matchProg) return false;
        }

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

  // Filter Riwayat Sertifikat untuk Pencarian & Verifikasi Keabsahan
  const filteredHistoryData = useMemo(() => {
    if (!riwayatSearch.trim()) return historyData;
    const q = riwayatSearch.trim().toLowerCase();
    return historyData.filter((item) => {
      const matchNoSertif = item.no_sertifikat?.toLowerCase().includes(q);
      const matchNama = item.siswa?.nama_lengkap?.toLowerCase().includes(q);
      const matchNoInduk = item.siswa?.nomor_induk?.toLowerCase().includes(q);
      const matchNik = item.siswa?.nik?.toLowerCase().includes(q);
      return matchNoSertif || matchNama || matchNoInduk || matchNik;
    });
  }, [historyData, riwayatSearch]);

  const verifiedMatch = useMemo(() => {
    if (!riwayatSearch.trim()) return null;
    const cleanQ = riwayatSearch.trim().toLowerCase().replace(/[\s\-_/.]/g, "");
    if (cleanQ.length < 3) return null;
    return historyData.find((item) => {
      const cleanNo = (item.no_sertifikat || "").toLowerCase().replace(/[\s\-_/.]/g, "");
      return cleanNo === cleanQ;
    });
  }, [historyData, riwayatSearch]);

  // Handler: Tambahkan ke Antrean Percetakan
  async function handleAddToQueue(siswaId: string) {
    setActionLoadingId(siswaId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/v1/sertifikat/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siswa_id: siswaId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Gagal menambahkan ke antrean percetakan.");
      }
      setSuccessMsg(json.meta?.message || "Siswa berhasil ditambahkan ke antrean percetakan.");
      await Promise.all([fetchData(), fetchQueueAndHistory()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat menambahkan antrean.");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Handler: Keluarkan dari Antrean Percetakan
  async function handleRemoveFromQueue(siswaId: string) {
    setActionLoadingId(siswaId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/v1/sertifikat/queue?siswa_id=${siswaId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Gagal menghapus dari antrean.");
      }
      setSuccessMsg("Siswa berhasil dikeluarkan dari antrean percetakan.");
      await Promise.all([fetchData(), fetchQueueAndHistory()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menghapus siswa dari antrean.");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Handler: Buka Modal Catat / Edit Sertifikat Alumni
  async function handleOpenCatatSertifikatModal(item?: QueueItem) {
    setAlumniCertError(null);
    setAlumniCertSuccess(null);
    setAlumniSearchQuery("");
    setAlumniDropdownOpen(false);

    if (item) {
      // Mode Edit
      setAlumniCertTarget(item);
      setAlumniCertSiswaId(item.siswa_id);
      setAlumniCertNo(item.no_sertifikat || "");
      setAlumniCertTgl(item.tgl_cetak ? item.tgl_cetak.split("T")[0] : new Date().toISOString().split("T")[0]);
    } else {
      // Mode Tambah Baru
      setAlumniCertTarget(null);
      setAlumniCertSiswaId("");
      setAlumniCertNo("");
      setAlumniCertTgl(new Date().toISOString().split("T")[0]);

      // Ambil daftar seluruh siswa jika belum ada
      if (allStudentsList.length === 0) {
        try {
          const res = await fetch("/api/v1/siswa?limit=100");
          if (res.ok) {
            const json = await res.json();
            setAllStudentsList(json.data || []);
          }
        } catch (e) {
          console.error("Gagal memuat daftar siswa:", e);
        }
      }
    }
    setModalAlumniCertOpen(true);
  }

  // Handler: Simpan Pencatatan Nomor Sertifikat Alumni (tanpa nilai ujian)
  async function handleSaveAlumniCert(e: React.FormEvent) {
    e.preventDefault();
    if (!alumniCertSiswaId) {
      setAlumniCertError("Pilih siswa alumni terlebih dahulu.");
      return;
    }
    if (!alumniCertNo.trim()) {
      setAlumniCertError("Nomor sertifikat wajib diisi.");
      return;
    }

    setAlumniCertSaving(true);
    setAlumniCertError(null);
    setAlumniCertSuccess(null);

    try {
      const res = await fetch("/api/v1/sertifikat/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siswa_id: alumniCertSiswaId,
          no_sertifikat: alumniCertNo.trim(),
          tgl_cetak: alumniCertTgl || new Date().toISOString().split("T")[0],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAlumniCertError(json.error?.message || "Gagal mencatat nomor sertifikat.");
        return;
      }

      setAlumniCertSuccess("Nomor sertifikat alumni berhasil dicatat.");
      await fetchQueueAndHistory();
      setTimeout(() => {
        setModalAlumniCertOpen(false);
      }, 700);
    } catch {
      setAlumniCertError("Terjadi gangguan koneksi saat menyimpan sertifikat alumni.");
    } finally {
      setAlumniCertSaving(false);
    }
  }

  // Handler: Ekspor Batch Percetakan
  async function handleExportBatch() {
    if (queueData.length === 0) {
      setErrorMsg("Antrean percetakan masih kosong. Tambahkan siswa yang lulus terlebih dahulu.");
      return;
    }

    try {
      setErrorMsg("");
      setSuccessMsg("Sedang menyiapkan dan mengunduh berkas Excel percetakan...");

      // Download file via window location / anchor
      const downloadUrl = "/api/v1/excel/export?modul=sertifikat&source=queue&mark_as_printed=true";
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Berikan delay singkat lalu segarkan status data (menjadi dicetak & alumni)
      setTimeout(async () => {
        await Promise.all([fetchData(), fetchQueueAndHistory()]);
        setSuccessMsg(
          `Sukses! ${queueData.length} data siswa telah diekspor dan dialihkan ke Riwayat Cetak (Alumni).`
        );
      }, 1500);
    } catch (err) {
      setErrorMsg("Gagal melakukan ekspor berkas percetakan.");
    }
  }

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
        catatan_penguji: scores.catatan_penguji || null,
      };

      const res = await fetch("/api/v1/ujian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Gagal menyimpan nilai ujian.");
      }

      setSuccessMsg(`Nilai ujian untuk ${inputTarget.nama_lengkap} berhasil disimpan.`);
      setInputModalOpen(false);
      await Promise.all([fetchData(), fetchQueueAndHistory()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan nilai.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight">Ujian & Sertifikat</h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Penilaian ujian internal dan manajemen antrean ekspor data percetakan sertifikat fisik.
          </p>
        </div>

        {/* Global Action Button */}
        <div className="flex items-center gap-2">
          {activeMainTab === "antrean" && (
            <Button
              size="sm"
              className="gap-1.5 text-xs bg-[#10B981] hover:bg-[#059669] text-white shadow-sm font-semibold disabled:opacity-50"
              disabled={queueData.length === 0}
              onClick={handleExportBatch}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Ekspor Data Percetakan ({queueData.length} Siswa)</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-[#1F2937] text-[#D1D5DB] hover:text-white"
            onClick={() => {
              fetchData();
              fetchQueueAndHistory();
            }}
            disabled={loading || loadingQueue}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading || loadingQueue ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Navigasi Level Atas: 3 Tab Utama */}
      <div className="flex items-center gap-2 border-b border-[#1F2937] pb-1">
        <button
          onClick={() => setActiveMainTab("ujian")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-all border-b-2 ${
            activeMainTab === "ujian"
              ? "border-[#DC2626] text-white bg-[#111827]"
              : "border-transparent text-[#9CA3AF] hover:text-white hover:bg-[#111827]/50"
          }`}
        >
          <ClipboardCheck className="h-4 w-4 text-[#DC2626]" aria-hidden="true" />
          <span>Ujian Internal</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#1F2937] text-[#D1D5DB]">
            {data.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab("antrean")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-all border-b-2 ${
            activeMainTab === "antrean"
              ? "border-[#10B981] text-white bg-[#111827]"
              : "border-transparent text-[#9CA3AF] hover:text-white hover:bg-[#111827]/50"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
          <span>Antrean Percetakan</span>
          <span
            className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              queueData.length > 0
                ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30"
                : "bg-[#1F2937] text-[#9CA3AF]"
            }`}
          >
            {queueData.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab("riwayat")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-all border-b-2 ${
            activeMainTab === "riwayat"
              ? "border-[#38BDF8] text-white bg-[#111827]"
              : "border-transparent text-[#9CA3AF] hover:text-white hover:bg-[#111827]/50"
          }`}
        >
          <History className="h-4 w-4 text-[#38BDF8]" aria-hidden="true" />
          <span>Riwayat Cetak & Alumni</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#1F2937] text-[#D1D5DB]">
            {historyData.length}
          </span>
        </button>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded-lg border border-[#F43F5E]/30 bg-[#F43F5E]/10 px-4 py-3 text-xs text-[#F43F5E]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="hover:opacity-75">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3 text-xs text-[#10B981]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="hover:opacity-75">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KONTEN TAB 1: UJIAN INTERNAL */}
      {/* ========================================================================= */}
      {activeMainTab === "ujian" && (
        <div className="flex flex-col gap-6">
          {/* Kartu Statistik Ringkasan */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2.5 rounded-lg bg-[#1F2937] text-[#9CA3AF]">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider">Total Siswa</p>
                <p className="text-lg font-extrabold text-[#F9FAFB]">{stats.total} Siswa</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2.5 rounded-lg bg-[#10B981]/20 text-[#10B981]">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#10B981] tracking-wider flex items-center gap-1">
                  Siap Ujian Internal <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                </p>
                <p className="text-lg font-extrabold text-[#10B981]">{stats.siapUjian} Siswa</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#38BDF8]/30 bg-[#38BDF8]/10 p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2.5 rounded-lg bg-[#38BDF8]/20 text-[#38BDF8]">
                <Award className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#38BDF8] tracking-wider">Lulus Ujian</p>
                <p className="text-lg font-extrabold text-[#38BDF8]">{stats.lulus} Siswa</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2.5 rounded-lg bg-[#F59E0B]/20 text-[#F59E0B]">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#F59E0B] tracking-wider">Dalam Bimbingan</p>
                <p className="text-lg font-extrabold text-[#F59E0B]">{stats.dalamBimbingan} Siswa</p>
              </div>
            </div>
          </div>

          {/* Filter & Pencarian Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" aria-hidden="true" />
              <input
                type="text"
                placeholder="Cari siswa berdasarkan nama atau no. induk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#1F2937] bg-[#111827] pl-8 pr-3 text-xs text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none focus:border-[#DC2626] transition-colors"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#111827] border border-[#1F2937] p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setStatusFilter("semua")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === "semua" ? "bg-[#DC2626] text-white" : "text-[#9CA3AF] hover:text-[#D1D5DB]"
                }`}
              >
                Semua ({stats.total})
              </button>
              <button
                onClick={() => setStatusFilter("siap_ujian")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === "siap_ujian" ? "bg-[#10B981] text-white" : "text-[#9CA3AF] hover:text-[#D1D5DB]"
                }`}
              >
                Siap Ujian ({stats.siapUjian})
              </button>
              <button
                onClick={() => setStatusFilter("lulus")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === "lulus" ? "bg-[#38BDF8] text-white" : "text-[#9CA3AF] hover:text-[#D1D5DB]"
                }`}
              >
                Lulus ({stats.lulus})
              </button>
              <button
                onClick={() => setStatusFilter("dalam_bimbingan")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === "dalam_bimbingan" ? "bg-[#F59E0B] text-white" : "text-[#9CA3AF] hover:text-[#D1D5DB]"
                }`}
              >
                Bimbingan ({stats.dalamBimbingan})
              </button>
            </div>
          </div>

          {/* Grid Kartu Siswa Ujian */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : filteredAndSortedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-[#1F2937] rounded-xl bg-[#111827]">
              <AlertTriangle className="h-10 w-10 text-[#6B7280] mb-3" aria-hidden="true" />
              <p className="text-sm font-semibold text-[#D1D5DB]">Tidak ada data siswa</p>
              <p className="text-xs text-[#6B7280] mt-1">Coba sesuaikan pencarian atau filter status kelayakan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedData.map((s) => {
                const hasUjian = !!s.ujian;
                const isUjianLulus = !!s.ujian?.is_lulus;
                const isReadyForInternal = s.nilai_harian_ok && !s.ujian?.is_lulus;
                const gateSertifikat = s.nilai_harian_ok && s.is_lunas && isUjianLulus;
                const inQueue = s.status_sertifikat === "antrean";
                const isPrinted = s.status_sertifikat === "dicetak";

                let avg: number | null = null;
                if (s.ujian) {
                  const sum =
                    s.ujian.teori +
                    s.ujian.root +
                    s.ujian.hotpass +
                    s.ujian.filler +
                    s.ujian.capping +
                    s.ujian.gerinda;
                  avg = Math.round(sum / 6);
                }

                return (
                  <div
                    key={s.id}
                    className={`rounded-xl border bg-[#111827] p-5 flex flex-col gap-4 shadow-sm transition-all ${
                      isReadyForInternal
                        ? "border-[#10B981]/50 ring-1 ring-[#10B981]/20"
                        : inQueue
                        ? "border-[#38BDF8]/40 ring-1 ring-[#38BDF8]/20"
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
                          {inQueue && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#10B981] bg-[#10B981]/20 border border-[#10B981]/40 px-2 py-0.5 rounded-full">
                              Di Antrean Cetak
                            </span>
                          )}
                          {isPrinted && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#9CA3AF] bg-[#1F2937] border border-[#374151] px-2 py-0.5 rounded-full">
                              Sudah Dicetak
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
                    {hasUjian && s.ujian && (
                      <div className="grid grid-cols-3 gap-2 bg-[#0B0F17] rounded-lg p-3 border border-[#1F2937]">
                        <div className="text-center">
                          <p className="text-[10px] text-[#6B7280]">Teori</p>
                          <p className={`text-xs font-bold ${s.ujian.teori >= 80 ? "text-[#10B981]" : "text-[#F43F5E]"}`}>
                            {s.ujian.teori}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[#6B7280]">Root</p>
                          <p className={`text-xs font-bold ${s.ujian.root >= 80 ? "text-[#10B981]" : "text-[#F43F5E]"}`}>
                            {s.ujian.root}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[#6B7280]">Hot</p>
                          <p className={`text-xs font-bold ${s.ujian.hotpass >= 80 ? "text-[#10B981]" : "text-[#F43F5E]"}`}>
                            {s.ujian.hotpass}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[#6B7280]">Filler</p>
                          <p className={`text-xs font-bold ${s.ujian.filler >= 80 ? "text-[#10B981]" : "text-[#F43F5E]"}`}>
                            {s.ujian.filler}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[#6B7280]">Capping</p>
                          <p className={`text-xs font-bold ${s.ujian.capping >= 80 ? "text-[#10B981]" : "text-[#F43F5E]"}`}>
                            {s.ujian.capping}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[#6B7280]">Teknik</p>
                          <p className={`text-xs font-bold ${s.ujian.gerinda >= 80 ? "text-[#10B981]" : "text-[#F43F5E]"}`}>
                            {s.ujian.gerinda}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Tombol Aksi Kartu Siswa */}
                    <div className="flex flex-col gap-2 mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5 text-xs border-[#1F2937] hover:bg-[#1F2937] text-[#D1D5DB]"
                        onClick={() => handleOpenInput(s)}
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{s.ujian ? "Edit Nilai Internal" : "Input Nilai Internal"}</span>
                      </Button>

                      {/* Tombol Tambahkan ke Antrean Percetakan */}
                      {gateSertifikat && (
                        <div>
                          {inQueue ? (
                            <button
                              onClick={() => setActiveMainTab("antrean")}
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981]/25 transition-all"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Di Antrean Percetakan &rarr;</span>
                            </button>
                          ) : isPrinted ? (
                            <div className="flex items-center gap-2">
                              <span className="flex-1 text-[11px] text-[#9CA3AF] py-1 text-center bg-[#0B0F17] rounded border border-[#1F2937]">
                                Sudah Dicetak
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-xs border-[#38BDF8]/40 text-[#38BDF8] hover:bg-[#38BDF8]/10"
                                disabled={actionLoadingId === s.id}
                                onClick={() => handleAddToQueue(s.id)}
                                title="Masukkan kembali ke antrean percetakan untuk dicetak ulang"
                              >
                                {actionLoadingId === s.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5" />
                                )}
                                <span>Cetak Ulang</span>
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full gap-1.5 text-xs bg-[#10B981] hover:bg-[#059669] text-white font-semibold shadow-sm"
                              disabled={actionLoadingId === s.id}
                              onClick={() => handleAddToQueue(s.id)}
                            >
                              {actionLoadingId === s.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Printer className="h-3.5 w-3.5" />
                              )}
                              <span>Tambahkan ke Percetakan</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* KONTEN TAB 2: ANTREAN PERCETAKAN SERTIFIKAT (THE BATCH QUEUE) */}
      {/* ========================================================================= */}
      {activeMainTab === "antrean" && (
        <div className="flex flex-col gap-5">
          {/* Header Penjelasan Antrean */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-[#10B981]/20 text-[#10B981]">
                <FileSpreadsheet className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F9FAFB]">
                  Antrean Batch Percetakan ({queueData.length} Siswa Siap Cetak)
                </h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Data pada antrean ini akan diekspor ke template Excel percetakan fisik. Setelah diekspor, siswa otomatis
                  ditandai selesai (Alumni).
                </p>
              </div>
            </div>

            <Button
              size="sm"
              className="gap-2 text-xs bg-[#10B981] hover:bg-[#059669] text-white font-semibold disabled:opacity-40"
              disabled={queueData.length === 0}
              onClick={handleExportBatch}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Ekspor Data Percetakan (Excel)</span>
            </Button>
          </div>

          {/* Tabel / Daftar Siswa dalam Antrean */}
          {loadingQueue ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-[#111827] border border-[#1F2937] animate-pulse" />
              ))}
            </div>
          ) : queueData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-[#1F2937] rounded-xl bg-[#111827]">
              <FileSpreadsheet className="h-12 w-12 text-[#6B7280] mb-3" aria-hidden="true" />
              <p className="text-sm font-semibold text-[#D1D5DB]">Antrean Percetakan Masih Kosong</p>
              <p className="text-xs text-[#6B7280] mt-1 max-w-md">
                Buka tab <strong>Ujian Internal</strong>, lalu klik tombol{" "}
                <span className="text-[#10B981] font-semibold">"Tambahkan ke Percetakan"</span> pada siswa yang telah lulus
                ujian dan lunas administrasi.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-xs gap-1.5 border-[#1F2937] text-[#D1D5DB] hover:text-white"
                onClick={() => setActiveMainTab("ujian")}
              >
                <span>Buka Tab Ujian Internal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="border border-[#1F2937] rounded-xl bg-[#111827] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B0F17] text-[#9CA3AF] uppercase text-[10px] tracking-wider border-b border-[#1F2937]">
                    <tr>
                      <th className="py-3 px-4 w-12">No</th>
                      <th className="py-3 px-4">No Sertifikat</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">No. Induk</th>
                      <th className="py-3 px-4">Tempat & Tanggal Lahir</th>
                      <th className="py-3 px-4">Program</th>
                      <th className="py-3 px-4">Periode Belajar</th>
                      <th className="py-3 px-4">Date of Issue</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {queueData.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-[#1F2937]/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#9CA3AF]">
                          {String(idx + 1).padStart(3, "0")}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#38BDF8] whitespace-nowrap">
                          {item.no_sertifikat}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#F9FAFB] whitespace-nowrap">
                          {item.siswa.nama_lengkap}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#DC2626] font-bold">
                          {item.siswa.nomor_induk}
                        </td>
                        <td className="py-3 px-4 text-[#D1D5DB] whitespace-nowrap">
                          {item.formatted.place_and_dob}
                        </td>
                        <td className="py-3 px-4 text-[#D1D5DB] whitespace-nowrap">
                          {item.formatted.program_name}
                        </td>
                        <td className="py-3 px-4 text-[#9CA3AF] whitespace-nowrap">
                          {item.formatted.starting_from} &ndash; {item.formatted.to}
                        </td>
                        <td className="py-3 px-4 text-[#D1D5DB] whitespace-nowrap">
                          {item.formatted.date_of_issue}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs gap-1 border-[#1F2937] hover:border-[#38BDF8]/50 text-[#D1D5DB] hover:text-[#38BDF8]"
                              onClick={() => {
                                setReviewTarget(item);
                                setReviewModalOpen(true);
                              }}
                              title="Tinjau kelengkapan data sertifikat"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Review</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs border-[#1F2937] hover:border-[#F43F5E]/50 text-[#9CA3AF] hover:text-[#F43F5E]"
                              disabled={actionLoadingId === item.siswa_id}
                              onClick={() => handleRemoveFromQueue(item.siswa_id)}
                              title="Keluarkan dari antrean percetakan"
                            >
                              {actionLoadingId === item.siswa_id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* KONTEN TAB 3: RIWAYAT CETAK & ALUMNI */}
      {/* ========================================================================= */}
      {activeMainTab === "riwayat" && (
        <div className="flex flex-col gap-5">
          <div className="p-4 rounded-xl border border-[#38BDF8]/30 bg-[#38BDF8]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-[#38BDF8]/20 text-[#38BDF8]">
                <History className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F9FAFB]">
                  Arsip Riwayat Cetak Sertifikat ({historyData.length} Siswa)
                </h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Daftar siswa yang sertifikat fisiknya telah diekspor dan berstatus Alumni. Jika file hilang atau salah cetak,
                  klik tombol <strong>Cetak Ulang</strong> untuk memasukkan kembali ke antrean percetakan.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <a
                href="/api/v1/excel/template?modul=arsip_alumni"
                download
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#1F2937] bg-[#111827] hover:bg-[#1F2937] text-xs font-medium text-[#D1D5DB] transition-colors"
                title="Unduh format spreadsheet arsip alumni (2015+)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                <span>Template Arsip</span>
              </a>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs border-[#38BDF8]/40 hover:bg-[#38BDF8]/15 text-[#38BDF8]"
                onClick={() => setImportArsipOpen(true)}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Import Arsip Alumni</span>
              </Button>
              <Button
                size="sm"
                onClick={() => handleOpenCatatSertifikatModal()}
                className="gap-1.5 text-xs bg-[#38BDF8] hover:bg-[#0284C7] text-black font-semibold shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Catat Sertifikat Alumni</span>
              </Button>
            </div>
          </div>

          {/* Search Input & Verifikasi Nomor Sertifikat Siswa LPKS */}
          <div className="flex flex-col gap-3">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
              <input
                type="text"
                value={riwayatSearch}
                onChange={(e) => setRiwayatSearch(e.target.value)}
                placeholder="Cari nomor sertifikat untuk verifikasi resmi keabsahan alumni LPKS..."
                className="w-full h-10 pl-9 pr-14 rounded-xl border border-[#1F2937] bg-[#111827] text-xs text-[#F9FAFB] placeholder-[#6B7280] focus:outline-none focus:border-[#38BDF8] transition-all shadow-sm"
              />
              {riwayatSearch && (
                <button
                  onClick={() => setRiwayatSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#9CA3AF] hover:text-white px-2 py-0.5 rounded bg-[#1F2937]"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Banner Hasil Verifikasi Keabsahan */}
            {riwayatSearch.trim().length >= 3 && (
              <div>
                {verifiedMatch ? (
                  <div className="p-4 rounded-xl border border-[#10B981]/40 bg-[#10B981]/15 flex items-start gap-3.5 shadow-sm animate-in fade-in duration-200">
                    <div className="p-2 rounded-lg bg-[#10B981]/25 text-[#10B981] mt-0.5 shrink-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#10B981] text-black">
                          Terverifikasi Resmi
                        </span>
                        <span className="text-xs text-[#10B981] font-medium">Siswa &amp; Sertifikat Sah Terdaftar di LPKS</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#F9FAFB] mt-1.5">
                        {verifiedMatch.siswa?.nama_lengkap} &mdash;{" "}
                        <span className="font-mono text-[#38BDF8]">{verifiedMatch.no_sertifikat}</span>
                      </h3>
                      <p className="text-xs text-[#D1D5DB] mt-1 leading-relaxed">
                        Nomor Induk: <strong className="text-[#DC2626] font-mono">{verifiedMatch.siswa?.nomor_induk}</strong> &bull; Program: <strong>{verifiedMatch.formatted?.program_name || verifiedMatch.siswa?.program?.nama}</strong> &bull; Tanggal Cetak: <strong>{verifiedMatch.tgl_cetak ? new Date(verifiedMatch.tgl_cetak).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : verifiedMatch.formatted?.date_of_issue || "—"}</strong>
                      </p>
                    </div>
                  </div>
                ) : filteredHistoryData.length === 0 ? (
                  <div className="p-3.5 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-[#F43F5E] shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-[#F43F5E]">Data Tidak Ditemukan</p>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                        Nomor sertifikat atau kata kunci &quot;{riwayatSearch}&quot; tidak tercatat dalam arsip sertifikat resmi LPKS.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {loadingQueue ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-[#111827] border border-[#1F2937] animate-pulse" />
              ))}
            </div>
          ) : historyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-[#1F2937] rounded-xl bg-[#111827]">
              <History className="h-12 w-12 text-[#6B7280] mb-3" aria-hidden="true" />
              <p className="text-sm font-semibold text-[#D1D5DB]">Belum Ada Riwayat Percetakan</p>
              <p className="text-xs text-[#6B7280] mt-1">
                Data siswa yang diekspor dari Antrean Percetakan akan tersimpan di sini secara otomatis.
              </p>
            </div>
          ) : filteredHistoryData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-[#1F2937] rounded-xl bg-[#111827]">
              <Search className="h-10 w-10 text-[#6B7280] mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold text-[#D1D5DB]">Tidak Ada Hasil yang Cocok</p>
              <p className="text-xs text-[#6B7280] mt-1">
                Tidak ada riwayat cetak sertifikat yang cocok dengan pencarian &quot;{riwayatSearch}&quot;.
              </p>
            </div>
          ) : (
            <div className="border border-[#1F2937] rounded-xl bg-[#111827] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B0F17] text-[#9CA3AF] uppercase text-[10px] tracking-wider border-b border-[#1F2937]">
                    <tr>
                      <th className="py-3 px-4 w-12">No</th>
                      <th className="py-3 px-4">No Sertifikat</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">No. Induk</th>
                      <th className="py-3 px-4">Program</th>
                      <th className="py-3 px-4">Tanggal Dicetak</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {filteredHistoryData.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-[#1F2937]/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-[#9CA3AF]">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#38BDF8] whitespace-nowrap">
                          {item.no_sertifikat}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#F9FAFB] whitespace-nowrap">
                          {item.siswa.nama_lengkap}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#DC2626] font-bold">
                          {item.siswa.nomor_induk}
                        </td>
                        <td className="py-3 px-4 text-[#D1D5DB] whitespace-nowrap">
                          {item.formatted.program_name}
                        </td>
                        <td className="py-3 px-4 text-[#9CA3AF] whitespace-nowrap">
                          {item.tgl_cetak ? new Date(item.tgl_cetak).toLocaleDateString("id-ID") : "—"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded-full">
                            Tercetak &bull; Alumni
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs gap-1 border-[#1F2937] hover:border-[#38BDF8]/50 text-[#D1D5DB] hover:text-[#38BDF8]"
                              onClick={() => {
                                setReviewTarget(item);
                                setReviewModalOpen(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Lihat</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs gap-1 border-[#1F2937] hover:border-[#38BDF8]/50 text-[#D1D5DB] hover:text-[#38BDF8]"
                              onClick={() => handleOpenCatatSertifikatModal(item)}
                              title="Edit nomor sertifikat atau tanggal terbit arsip"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs gap-1 border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981]/10"
                              disabled={actionLoadingId === item.siswa_id}
                              onClick={() => handleAddToQueue(item.siswa_id)}
                              title="Masukkan kembali ke antrean percetakan untuk dicetak ulang"
                            >
                              {actionLoadingId === item.siswa_id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                              <span>Cetak Ulang</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL REVIEW DATA PESERTA PERCETAKAN */}
      {/* ========================================================================= */}
      <Modal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Review Data Percetakan Sertifikat Fisik"
        description="Pastikan ejaan nama lengkap, tanggal lahir, nomor induk, dan nama program sudah tepat sesuai kartu identitas peserta."
      >
        {reviewTarget && (
          <div className="flex flex-col gap-4">
            {/* Box Preview Sertifikat */}
            <div className="p-4 rounded-xl border border-[#1F2937] bg-[#0B0F17] flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                  LPKS Sumbu Hidup &bull; Cilacap
                </span>
                <span className="font-mono text-xs font-bold text-[#38BDF8] bg-[#38BDF8]/10 px-2.5 py-0.5 rounded border border-[#38BDF8]/30">
                  {reviewTarget.no_sertifikat}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-[#6B7280]">Nama Lengkap Peserta</p>
                  <p className="font-bold text-[#F9FAFB] text-sm mt-0.5">{reviewTarget.siswa.nama_lengkap}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B7280]">Nomor Induk / Registrasi</p>
                  <p className="font-mono font-bold text-[#DC2626] text-sm mt-0.5">{reviewTarget.siswa.nomor_induk}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B7280]">Tempat & Tanggal Lahir</p>
                  <p className="font-medium text-[#D1D5DB] mt-0.5">{reviewTarget.formatted.place_and_dob}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B7280]">Program Pelatihan</p>
                  <p className="font-medium text-[#D1D5DB] mt-0.5">{reviewTarget.formatted.program_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B7280]">Periode Pelatihan (Starting &ndash; To)</p>
                  <p className="font-medium text-[#D1D5DB] mt-0.5">
                    {reviewTarget.formatted.starting_from} s/d {reviewTarget.formatted.to}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B7280]">Date of Issue (Penerbitan)</p>
                  <p className="font-medium text-[#D1D5DB] mt-0.5">{reviewTarget.formatted.date_of_issue}</p>
                </div>
              </div>

              {/* Rekap Nilai Ujian atau Arsip Fisik */}
              {reviewTarget.ujian ? (
                <div className="mt-2 pt-2 border-t border-[#1F2937]">
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
                    Hasil Ujian Internal (Standar ≥ 80)
                  </p>
                  <div className="grid grid-cols-6 gap-2 text-center bg-[#111827] p-2 rounded-lg">
                    <div>
                      <p className="text-[9px] text-[#6B7280]">Teori</p>
                      <p className="text-xs font-bold text-[#10B981]">{reviewTarget.ujian.teori}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#6B7280]">Root</p>
                      <p className="text-xs font-bold text-[#10B981]">{reviewTarget.ujian.root}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#6B7280]">Hotpass</p>
                      <p className="text-xs font-bold text-[#10B981]">{reviewTarget.ujian.hotpass}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#6B7280]">Filler</p>
                      <p className="text-xs font-bold text-[#10B981]">{reviewTarget.ujian.filler}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#6B7280]">Capping</p>
                      <p className="text-xs font-bold text-[#10B981]">{reviewTarget.ujian.capping}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#6B7280]">Gerinda</p>
                      <p className="text-xs font-bold text-[#10B981]">{reviewTarget.ujian.gerinda}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 pt-2 border-t border-[#1F2937]">
                  <div className="p-3 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#38BDF8] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-[#38BDF8]">
                        Data Arsip Sertifikat Fisik Terverifikasi
                      </p>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-relaxed">
                        Sertifikat fisik telah diterbitkan sah untuk alumni ini. Lembar penilaian manual dan arsip berkas fisik tersimpan pada buku arsip administrasi lembaga.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => setReviewModalOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL INPUT NILAI UJIAN */}
      {/* ========================================================================= */}
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
                data-index={i}
                value={scores[key as keyof typeof scores]}
                onChange={(e) =>
                  setScores((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }))
                }
                placeholder="0–100"
              />
            </div>
          ))}

          <div className="col-span-2">
            <Input
              label="Catatan Penguji (Opsional)"
              name="catatan_penguji"
              type="text"
              data-index={6}
              value={scores.catatan_penguji}
              onChange={(e) =>
                setScores((prev) => ({
                  ...prev,
                  catatan_penguji: e.target.value,
                }))
              }
              placeholder="Catatan hasil pengujian internal las..."
            />
          </div>

          <div className="col-span-2 flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setInputModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Menyimpan...
                </>
              ) : (
                "Simpan Nilai Ujian"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Import Arsip Alumni */}
      <Modal
        open={importArsipOpen}
        onClose={() => setImportArsipOpen(false)}
        title="Import Data Arsip Alumni & Sertifikat (2015+)"
        size="md"
      >
        <form onSubmit={handleImportArsip} className="flex flex-col gap-4">
          {!importingArsip && !importArsipResult && (
            <>
              <div className="p-3.5 rounded-lg border border-[#38BDF8]/30 bg-[#38BDF8]/10 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#38BDF8]">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Format Khusus Arsip Alumni Lama (Mulai 2015)</span>
                </div>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Setiap baris data dalam spreadsheet ini akan secara otomatis diproses menjadi:
                </p>
                <ul className="list-disc pl-4 text-xs text-[#D1D5DB] space-y-1">
                  <li>Data Siswa status <strong>Alumni</strong></li>
                  <li>Transaksi Keuangan status <strong>Lunas</strong></li>
                  <li>Sertifikat Pelatihan status <strong>Dicetak</strong> (dengan nomor sertifikat)</li>
                </ul>
                <div className="pt-1">
                  <a
                    href="/api/v1/excel/template?modul=arsip_alumni"
                    download
                    className="inline-flex items-center gap-1.5 text-xs text-[#38BDF8] hover:underline font-semibold"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Unduh Template Arsip Alumni (.xlsx)</span>
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1.5">
                  Pilih File Spreadsheet Arsip (.xlsx / .csv):
                </label>
                <input
                  type="file"
                  accept=".xlsx, .csv"
                  onChange={(e) => setImportArsipFile(e.target.files?.[0] || null)}
                  className="text-xs text-[#D1D5DB] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#38BDF8] file:text-black hover:file:bg-[#0ea5e9] cursor-pointer"
                />
              </div>
            </>
          )}

          {importingArsip && (
            <div className="flex flex-col justify-center items-center py-8 gap-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-[#1F2937]" />
                  <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent"
                    strokeDasharray={2 * Math.PI * 36}
                    strokeDashoffset={2 * Math.PI * 36 * (1 - importArsipProgress / 100)}
                    className="text-[#38BDF8] transition-all duration-300 ease-out" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-lg font-bold text-[#F9FAFB]">{importArsipProgress}%</span>
                </div>
              </div>
              <div className="text-xs font-medium text-[#F9FAFB]">
                {importArsipStatus}
              </div>
              <p className="text-[10px] text-[#9CA3AF] text-center px-4">
                Sistem sedang memproses data siswa alumni, mencatat pelunasan keuangan, dan mengarsipkan nomor sertifikat. Mohon tunggu...
              </p>
            </div>
          )}

          {!importingArsip && importArsipResult && (
            <div className="flex flex-col gap-3 py-2">
              <div
                className={`rounded-lg p-3 text-xs flex items-start gap-2.5 ${
                  importArsipResult.success && (!importArsipResult.errors || importArsipResult.errors.length === 0)
                    ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"
                    : "bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/20"
                }`}
              >
                {importArsipResult.success && (!importArsipResult.errors || importArsipResult.errors.length === 0) ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed font-medium">{importArsipResult.message}</span>
              </div>
              {importArsipResult.errors && importArsipResult.errors.length > 0 && (() => {
                type ImportError = { row: number; reason: string; type?: "warning" | "error" };
                const warnings = (importArsipResult.errors as ImportError[]).filter(e => e.type === "warning");
                const errs     = (importArsipResult.errors as ImportError[]).filter(e => e.type !== "warning");

                const groupBy = (items: ImportError[]) =>
                  Object.entries(
                    items.reduce((acc, e) => {
                      if (!acc[e.reason]) acc[e.reason] = [];
                      acc[e.reason].push(e.row);
                      return acc;
                    }, {} as Record<string, number[]>)
                  );

                return (
                  <div className="flex flex-col gap-2">
                    {warnings.length > 0 && (
                      <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 max-h-36 overflow-y-auto">
                        <span className="text-[11px] font-semibold text-amber-400 block mb-2">⚠ Catatan:</span>
                        <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-amber-300/90">
                          {groupBy(warnings).map(([reason, rows], idx) => (
                            <li key={idx}><b>Baris {rows.join(", ")}:</b> {reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {errs.length > 0 && (
                      <div className="rounded-lg border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 max-h-36 overflow-y-auto">
                        <span className="text-[11px] font-semibold text-[#F43F5E] block mb-2">✕ Gagal diimpor:</span>
                        <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-[#F43F5E]/90">
                          {groupBy(errs).map(([reason, rows], idx) => (
                            <li key={idx}><b>Baris {rows.join(", ")}:</b> {reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex items-center gap-2 justify-end pt-2">
            {!importingArsip && !importArsipResult && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => setImportArsipOpen(false)}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!importArsipFile}
                  className="bg-[#38BDF8] hover:bg-[#0ea5e9] text-black font-semibold"
                >
                  Mulai Import Arsip
                </Button>
              </>
            )}
            {!importingArsip && importArsipResult && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setImportArsipOpen(false);
                  setImportArsipResult(null);
                  setImportArsipFile(null);
                }}
              >
                Tutup
              </Button>
            )}
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL CATAT / EDIT NOMOR SERTIFIKAT ALUMNI (ARSIP FISIK) */}
      {/* ========================================================================= */}
      <Modal
        open={modalAlumniCertOpen}
        onClose={() => !alumniCertSaving && setModalAlumniCertOpen(false)}
        title={
          alumniCertTarget
            ? `Edit Sertifikat Alumni — ${alumniCertTarget.siswa.nama_lengkap}`
            : "Catat Nomor Sertifikat Alumni (Arsip Fisik)"
        }
        description={
          alumniCertTarget
            ? "Perbarui nomor sertifikat resmi atau tanggal penerbitan arsip fisik."
            : "Catat nomor sertifikat resmi untuk siswa alumni terdahulu yang sudah memegang sertifikat fisik tanpa nilai ujian di sistem."
        }
      >
        <form onSubmit={handleSaveAlumniCert} className="space-y-4">
          {alumniCertError && (
            <div className="p-3 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/30 text-xs text-[#F43F5E]">
              {alumniCertError}
            </div>
          )}

          {alumniCertSuccess && (
            <div className="p-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 text-xs text-[#10B981] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{alumniCertSuccess}</span>
            </div>
          )}

          {/* Pemilihan Siswa jika mode Tambah Baru (Unified Searchable Dropdown / Combobox) */}
          {!alumniCertTarget ? (
            <div className="space-y-1.5" ref={alumniDropdownRef}>
              <label className="text-xs font-semibold text-[#D1D5DB] flex items-center justify-between">
                <span>Pilih Siswa / Alumni <span className="text-[#F43F5E]">*</span></span>
                {selectedStudent && (
                  <span className="text-[10px] text-[#10B981] font-normal flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Terpilih: {selectedStudent.nama_lengkap}
                  </span>
                )}
              </label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Ketik nama atau nomor induk untuk memilih siswa..."
                  value={alumniSearchQuery}
                  onFocus={() => setAlumniDropdownOpen(true)}
                  onChange={(e) => {
                    setAlumniSearchQuery(e.target.value);
                    setAlumniDropdownOpen(true);
                    if (alumniCertSiswaId) {
                      setAlumniCertSiswaId("");
                    }
                  }}
                  className={`w-full h-10 pl-9 pr-16 rounded-lg border bg-[#111827] text-xs placeholder-[#6B7280] focus:outline-none transition-colors ${
                    alumniCertSiswaId
                      ? "border-[#38BDF8] text-[#38BDF8] font-medium"
                      : "border-[#1F2937] text-[#F9FAFB] focus:border-[#38BDF8]"
                  }`}
                />

                {/* Action icons on the right */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  {alumniSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setAlumniSearchQuery("");
                        setAlumniCertSiswaId("");
                        setAlumniDropdownOpen(true);
                      }}
                      className="p-1 rounded text-[#9CA3AF] hover:text-white hover:bg-[#1F2937] transition-colors"
                      title="Hapus pilihan"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAlumniDropdownOpen((prev) => !prev)}
                    className="p-1 rounded text-[#9CA3AF] hover:text-white hover:bg-[#1F2937] transition-colors"
                    title="Buka pilihan dropdown"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        alumniDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Dropdown Popover Menu */}
                {alumniDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-[#1F2937] bg-[#0B0F17] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="bg-[#111827] px-3 py-1.5 text-[10px] text-[#9CA3AF] uppercase font-semibold tracking-wider flex justify-between items-center border-b border-[#1F2937]">
                      <span>Daftar Siswa ({filteredStudents.length})</span>
                      <span className="text-[9px] text-[#6B7280]">Ketik untuk menyaring</span>
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-[#1F2937]/50">
                      {filteredStudents.length === 0 ? (
                        <div className="py-6 px-4 text-center text-xs text-[#9CA3AF]">
                          Tidak ada siswa yang cocok dengan &quot;{alumniSearchQuery}&quot;
                        </div>
                      ) : (
                        filteredStudents.map((s) => {
                          const isSelected = s.id === alumniCertSiswaId;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setAlumniCertSiswaId(s.id);
                                setAlumniSearchQuery(
                                  `${s.nama_lengkap} (${s.nomor_induk || "Tanpa No. Induk"})`
                                );
                                setAlumniDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors ${
                                isSelected
                                  ? "bg-[#38BDF8]/15 text-[#38BDF8]"
                                  : "hover:bg-[#1F2937]/70 text-[#F9FAFB]"
                              }`}
                            >
                              <div className="truncate pr-2">
                                <div className={`text-xs font-semibold ${isSelected ? "text-[#38BDF8]" : "text-[#F9FAFB]"}`}>
                                  {s.nama_lengkap}
                                </div>
                                <div className="text-[11px] text-[#9CA3AF] flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[#DC2626] font-medium">
                                    {s.nomor_induk || "Tanpa No. Induk"}
                                  </span>
                                  {s.program && <span>&bull; {s.program.nama}</span>}
                                </div>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-[#38BDF8] shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-[#111827] border border-[#1F2937] space-y-1">
              <p className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider">
                Data Alumni
              </p>
              <p className="text-sm font-bold text-[#F9FAFB]">
                {alumniCertTarget.siswa.nama_lengkap}
              </p>
              <p className="text-xs text-[#9CA3AF]">
                No. Induk: <span className="font-mono text-[#DC2626] font-semibold">{alumniCertTarget.siswa.nomor_induk}</span> &bull; Program: {alumniCertTarget.formatted?.program_name || alumniCertTarget.siswa.program?.nama || "—"}
              </p>
            </div>
          )}

          {/* Nomor Sertifikat */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#D1D5DB]">
              Nomor Sertifikat Resmi <span className="text-[#F43F5E]">*</span>
            </label>
            <input
              type="text"
              value={alumniCertNo}
              onChange={(e) => setAlumniCertNo(e.target.value)}
              placeholder="cth: 05/LPK-S/XI/2018 atau LPKS/2025/WLD/001"
              required
              className="w-full h-10 px-3 rounded-lg border border-[#1F2937] bg-[#111827] text-xs font-mono font-bold text-[#38BDF8] placeholder-[#6B7280] focus:outline-none focus:border-[#38BDF8]"
            />
            <p className="text-[11px] text-[#6B7280]">
              Format nomor dapat disesuaikan dengan sertifikat fisik yang sudah dipegang alumni.
            </p>
          </div>

          {/* Tanggal Penerbitan / Cetak */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#D1D5DB]">
              Tanggal Terbit / Cetak
            </label>
            <input
              type="date"
              value={alumniCertTgl}
              onChange={(e) => setAlumniCertTgl(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#1F2937] bg-[#111827] text-xs text-[#F9FAFB] focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F2937]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={alumniCertSaving}
              onClick={() => setModalAlumniCertOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={alumniCertSaving}
              className="bg-[#38BDF8] hover:bg-[#0ea5e9] text-black font-semibold gap-1.5"
            >
              {alumniCertSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Sertifikat</span>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
