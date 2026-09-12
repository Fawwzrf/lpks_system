"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Download, Upload, FileText, Users, KeyRound,
  Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, RefreshCw,
  Edit, Trash2, AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

interface SiswaItem {
  id: string;
  nomor_induk: string;
  nama_lengkap: string;
  username?: string;
  nik: string;
  email: string;
  no_hp?: string;
  tempat_lahir?: string;
  tgl_lahir?: string;
  alamat_lengkap?: string;
  pendidikan_terakhir?: string;
  tgl_masuk?: string;
  tgl_keluar?: string | null;
  program?: { nama: string };
  is_password_default?: boolean;
}

interface ProgramItem {
  id: string;
  kode_program: string;
  nama: string;
}

type FilterStatus = "semua" | "aktif" | "alumni";

export default function SiswaPage() {
  const router = useRouter();
  const [siswaList, setSiswaList] = useState<SiswaItem[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("semua");
  const [programFilter, setProgramFilter] = useState<string>("semua");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);

  // Modal Kelola Akun
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaItem | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credSaving, setCredSaving] = useState(false);
  const [credMsg, setCredMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal Hapus Siswa
  const [deleteSiswa, setDeleteSiswa] = useState<SiswaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Import Modal
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; errors?: { row: number; reason: string }[] } | null>(null);

  useEffect(() => {
    async function loadPrograms() {
      try {
        const res = await fetch("/api/v1/master/program");
        if (res.ok) {
          const json = await res.json();
          setPrograms(json.data || []);
        }
      } catch (e) {
        console.error("Gagal memuat program:", e);
      }
    }
    loadPrograms();
  }, []);

  const loadSiswa = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/v1/siswa?limit=${limit}&page=${page}`;
      if (filter !== "semua") {
        url += `&status=${filter}`;
      }
      if (programFilter !== "semua") {
        url += `&program_id=${programFilter}`;
      }
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setSiswaList(json.data || []);
        setTotal(json.meta?.total || 0);
      }
    } catch (err) {
      console.error("Gagal memuat data siswa:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, programFilter, search, page, limit]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filter, programFilter, search, limit]);

  useEffect(() => {
    loadSiswa();
  }, [loadSiswa]);

  function openKelolaAkun(s: SiswaItem) {
    setSelectedSiswa(s);
    setNewUsername(s.username || "");
    setNewPassword("");
    setShowPassword(false);
    setCredMsg(null);
  }

  async function handleSaveCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSiswa) return;
    setCredSaving(true);
    setCredMsg(null);

    const payload: { username?: string; password?: string } = {};
    if (newUsername.trim() && newUsername.trim() !== selectedSiswa.username) {
      payload.username = newUsername.trim();
    }
    if (newPassword.trim()) {
      payload.password = newPassword.trim();
    }

    if (!payload.username && !payload.password) {
      setCredMsg({ type: "error", text: "Masukkan username baru atau password baru untuk diperbarui." });
      setCredSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/siswa/${selectedSiswa.id}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setCredMsg({ type: "error", text: data.error?.message || "Gagal memperbarui kredensial." });
        return;
      }

      setCredMsg({ type: "success", text: "Kredensial siswa berhasil diperbarui!" });
      await loadSiswa();
      setTimeout(() => setSelectedSiswa(null), 1500);
    } catch {
      setCredMsg({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setCredSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteSiswa) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/siswa/${deleteSiswa.id}`, { method: "DELETE" });
      if (res.ok) {
        await loadSiswa();
        setDeleteSiswa(null);
      } else {
        alert("Gagal menghapus siswa.");
      }
    } catch (e) {
      alert("Kesalahan jaringan saat menghapus siswa.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportProgress(0);
    setImportStatus("Mempersiapkan data...");
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const res = await fetch("/api/v1/excel/import?modul=siswa", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setImportResult({ success: false, message: json.error?.message || "Gagal mengimpor file." });
        setImporting(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setImporting(false);
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
          } catch(e) {}
        }
      }

      setImporting(false);

      if (finalResult) {
        setImportResult({
          success: true,
          message: finalResult.message,
          errors: finalResult.errors
        });
        await loadSiswa();
      }
    } catch {
      setImportResult({ success: false, message: "Terjadi kesalahan saat mengunggah file." });
      setImporting(false);
    }
  }

  const columns = [
    {
      key: "no",
      header: "No",
      render: (row: SiswaItem) => <span className="text-[11px] text-[#9CA3AF]">{(page - 1) * limit + siswaList.indexOf(row) + 1}</span>
    },
    {
      key: "nomor_induk",
      header: "No. Induk",
      render: (row: SiswaItem) => (
        <span className="font-mono text-[#DC2626] text-[11px] font-bold">{row.nomor_induk}</span>
      ),
    },
    {
      key: "nama_lengkap",
      header: "Nama",
      render: (row: SiswaItem) => (
        <span className="text-xs font-semibold text-[#F9FAFB]">{row.nama_lengkap}</span>
      ),
    },
    {
      key: "nik",
      header: "NIK",
      render: (row: SiswaItem) => <span className="text-[11px] text-[#D1D5DB] font-mono">{row.nik || "—"}</span>
    },
    {
      key: "lahir",
      header: "Lahir",
      render: (row: SiswaItem) => (
        <div className="text-[11px] text-[#9CA3AF] min-w-[100px]">
          <p>{row.tempat_lahir || "—"}</p>
          <p className="text-[#6B7280]">{row.tgl_lahir || "—"}</p>
        </div>
      )
    },
    {
      key: "alamat",
      header: "Alamat",
      render: (row: SiswaItem) => (
        <span className="text-[11px] text-[#9CA3AF] block max-w-[150px] truncate" title={row.alamat_lengkap}>
          {row.alamat_lengkap || "—"}
        </span>
      )
    },
    {
      key: "program",
      header: "Program",
      render: (row: SiswaItem) => (
        <span className="text-[11px] text-[#D1D5DB]">{row.program?.nama || "—"}</span>
      ),
    },
    {
      key: "no_hp",
      header: "No. HP",
      render: (row: SiswaItem) => <span className="text-[11px] text-[#9CA3AF]">{row.no_hp || "—"}</span>
    },
    {
      key: "pendidikan",
      header: "Pend.",
      render: (row: SiswaItem) => <span className="text-[11px] text-[#9CA3AF]">{row.pendidikan_terakhir || "—"}</span>
    },
    {
      key: "masuk",
      header: "Masuk",
      render: (row: SiswaItem) => <span className="text-[11px] text-[#9CA3AF]">{row.tgl_masuk || "—"}</span>
    },
    {
      key: "keluar",
      header: "Keluar",
      render: (row: SiswaItem) => <span className="text-[11px] text-[#9CA3AF]">{row.tgl_keluar || "—"}</span>
    },
    {
      key: "aksi",
      header: "Aksi",
      className: "w-36 text-right",
      render: (row: SiswaItem) => (
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          <button
            onClick={() => router.push(`/superadmin/siswa/edit/${row.id}`)}
            className="p-1.5 rounded-md border border-[#1F2937] hover:border-[#10B981]/40 bg-[#0B0F17] hover:bg-[#10B981]/10 text-[#9CA3AF] hover:text-[#10B981] transition-all"
            title="Edit Siswa"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteSiswa(row)}
            className="p-1.5 rounded-md border border-[#1F2937] hover:border-[#F43F5E]/40 bg-[#0B0F17] hover:bg-[#F43F5E]/10 text-[#9CA3AF] hover:text-[#F43F5E] transition-all"
            title="Hapus Siswa (Anonimisasi)"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => openKelolaAkun(row)}
            className="p-1.5 rounded-md border border-[#1F2937] hover:border-[#3B82F6]/40 bg-[#0B0F17] hover:bg-[#3B82F6]/10 text-[#9CA3AF] hover:text-[#3B82F6] transition-all"
            title="Kelola Akun Login"
          >
            <KeyRound className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Data Siswa</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Direktori seluruh siswa pelatihan &amp; manajemen akun login.</p>
        </div>
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/api/v1/excel/template?modul=siswa"
            download
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#1F2937] bg-[#111827] hover:bg-[#1F2937] text-xs font-medium text-[#D1D5DB] transition-colors"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Template
          </a>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
            <Upload className="h-3.5 w-3.5" aria-hidden="true" /> Import Excel
          </Button>
          <a
            href="/api/v1/excel/export?modul=siswa"
            download
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#1F2937] bg-[#111827] hover:bg-[#1F2937] text-xs font-medium text-[#D1D5DB] transition-colors"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export Excel
          </a>
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

        <div className="w-[200px]">
          <Select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
          >
            <option value="semua">Semua Program</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.kode_program} - {p.nama}</option>
            ))}
          </Select>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, NIK, nomor induk..."
            className="h-9 w-full rounded-lg border border-[#1F2937] bg-[#111827] pl-8 pr-3 text-xs text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none focus:border-[#DC2626] transition-colors"
          />
        </div>

        <button
          onClick={loadSiswa}
          className="p-2 rounded-lg border border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:text-white transition-colors"
          title="Segarkan data"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        <div className="ml-auto flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#111827] border border-[#1F2937] text-sm text-[#9CA3AF] shadow-sm">
          <Users className="h-4 w-4 text-[#EF4444]" aria-hidden="true" />
          <span>Total: <strong className="text-white font-semibold text-base">{total}</strong> siswa terdaftar</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-xs text-[#6B7280]">
          <Loader2 className="h-6 w-6 animate-spin text-[#DC2626]" />
          <span>Memuat data direktori siswa...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Table columns={columns} data={siswaList} emptyMessage="Tidak ada siswa yang cocok dengan kriteria pencarian." />
          <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
            <div className="flex items-center gap-2">
              <span>Menampilkan</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-[#111827] border border-[#1F2937] rounded px-2 py-1 focus:outline-none focus:border-[#DC2626]"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>data per halaman</span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded bg-[#111827] border border-[#1F2937] hover:bg-[#1F2937] disabled:opacity-50 transition-colors"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1.5 font-medium">Halaman {page} dari {Math.max(1, Math.ceil(total / limit))}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / limit) || siswaList.length === 0}
                className="px-3 py-1.5 rounded bg-[#111827] border border-[#1F2937] hover:bg-[#1F2937] disabled:opacity-50 transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kelola Akun */}
      <Modal
        open={!!selectedSiswa}
        onClose={() => setSelectedSiswa(null)}
        title="Kelola Akun Siswa"
        size="sm"
      >
        {selectedSiswa && (
          <form onSubmit={handleSaveCredentials} className="flex flex-col gap-4">
            <div className="rounded-xl border border-[#1F2937] bg-[#0B0F17] p-3 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">Nama Siswa:</span>
                <strong className="text-[#F9FAFB]">{selectedSiswa.nama_lengkap}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">No. Induk:</span>
                <span className="font-mono font-bold text-[#DC2626]">{selectedSiswa.nomor_induk}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">Status Kata Sandi:</span>
                {selectedSiswa.is_password_default !== false ? (
                  <span className="text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                    Default ({selectedSiswa.username})
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px]">
                    Telah diubah mandiri oleh siswa
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-[#111827] border border-[#1F2937] p-2.5 text-[11px] text-[#9CA3AF] leading-relaxed">
              <p>
                <strong className="text-[#D1D5DB]">Keamanan Kata Sandi:</strong> Sesuai standar enkripsi hash (OWASP), password yang telah diubah siswa tersimpan aman dan tidak dapat dilihat dalam teks polos oleh siapapun. Gunakan formulir di bawah untuk mereset kata sandi jika siswa lupa.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#9CA3AF]">Username Login</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Username baru"
                className="h-9 w-full rounded-lg border border-[#374151] bg-[#0B0F17] px-3 text-xs text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#9CA3AF]">Reset Kata Sandi</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin diubah"
                  className="h-9 w-full rounded-lg border border-[#374151] bg-[#0B0F17] px-3 pr-9 text-xs text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#D1D5DB]"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <span className="text-[10px] text-[#6B7280]">Minimal 6 karakter jika ingin mengganti sandi.</span>
            </div>

            {credMsg && (
              <div
                className={`rounded-lg p-2.5 text-xs flex items-center gap-2 ${
                  credMsg.type === "success"
                    ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"
                    : "bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/20"
                }`}
              >
                {credMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{credMsg.text}</span>
              </div>
            )}

            <div className="flex items-center gap-2 justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedSiswa(null)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={credSaving}>
                {credSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</> : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Hapus Siswa */}
      <Modal
        open={!!deleteSiswa}
        onClose={() => setDeleteSiswa(null)}
        title="Hapus Data Siswa"
        size="sm"
      >
        {deleteSiswa && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs text-[#F43F5E] flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 text-[11px]">
                <strong className="text-xs">Peringatan Penghapusan</strong>
                <p className="leading-relaxed opacity-90">
                  Data akademik (nilai, presensi) akan tetap dipertahankan untuk kebutuhan riwayat statistik. Namun data pribadi <b>(NIK, No. HP, Alamat)</b> akan dihapus secara permanen (anonimisasi) sesuai dengan kebijakan privasi.
                </p>
              </div>
            </div>

            <div className="text-xs text-[#9CA3AF] mt-1">
              Apakah Anda yakin ingin menghapus/menonaktifkan siswa <b>{deleteSiswa.nama_lengkap}</b> ({deleteSiswa.nomor_induk})?
            </div>

            <div className="flex items-center gap-2 justify-end mt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDeleteSiswa(null)}>Batal</Button>
              <Button type="button" size="sm" onClick={handleDeleteConfirm} disabled={deleting} className="bg-[#DC2626] text-white hover:bg-[#B91C1C]">
                {deleting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menghapus...</> : "Ya, Hapus Data"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Import Excel */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Data Siswa dari Excel"
        size="sm"
      >
        <form onSubmit={handleImport} className="flex flex-col gap-4">
          {!importing && !importResult && (
            <>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Unggah file spreadsheet (.xlsx) sesuai template format LPKS. Gunakan tombol &quot;Template&quot; di atas jika belum memiliki formatnya.
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
            <div className="flex flex-col justify-center items-center py-8 gap-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-[#1F2937]" />
                  <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent"
                    strokeDasharray={2 * Math.PI * 36}
                    strokeDashoffset={2 * Math.PI * 36 * (1 - importProgress / 100)}
                    className="text-[#DC2626] transition-all duration-300 ease-out" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-lg font-bold text-[#F9FAFB]">{importProgress}%</span>
                </div>
              </div>
              <div className="text-xs font-medium text-[#F9FAFB]">
                {importStatus}
              </div>
              <p className="text-[10px] text-[#9CA3AF] text-center px-4">
                Sistem sedang memproses data dan secara otomatis membuatkan username serta kata sandi untuk setiap siswa. Mohon tunggu...
              </p>
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
              {importResult.errors && importResult.errors.length > 0 && (() => {
                type ImportError = { row: number; reason: string; type?: "warning" | "error" };
                const warnings = (importResult.errors as ImportError[]).filter(e => e.type === "warning");
                const errs     = (importResult.errors as ImportError[]).filter(e => e.type !== "warning");

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
                        <span className="text-[11px] font-semibold text-amber-400 block mb-2">⚠ Dilewati (data sudah ada):</span>
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
            {(!importing && !importResult) && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={!importFile}>
                  Mulai Import
                </Button>
              </>
            )}
            {!importing && importResult && (
              <Button type="button" size="sm" onClick={() => { setImportOpen(false); setImportResult(null); setImportFile(null); }}>
                Tutup
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
