"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Download, Upload, FileText, Users, KeyRound,
  Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";

interface SiswaItem {
  id: string;
  nomor_induk: string;
  nama_lengkap: string;
  username?: string;
  nik: string;
  email: string;
  no_hp?: string;
  tgl_keluar?: string | null;
  program?: { nama: string };
  is_password_default?: boolean;
}

type FilterStatus = "semua" | "aktif" | "alumni";

export default function SiswaPage() {
  const [siswaList, setSiswaList] = useState<SiswaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("semua");
  const [search, setSearch] = useState("");

  // Modal Kelola Akun
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaItem | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credSaving, setCredSaving] = useState(false);
  const [credMsg, setCredMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Import Modal
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadSiswa = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/v1/siswa?limit=100";
      if (filter !== "semua") {
        url += `&status=${filter}`;
      }
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setSiswaList(json.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat data siswa:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

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

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const res = await fetch("/api/v1/excel/import?modul=siswa", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        setImportResult({ success: false, message: json.error?.message || "Gagal mengimpor file." });
        return;
      }

      setImportResult({
        success: true,
        message: `Berhasil mengimpor ${json.data?.imported_count || 0} siswa baru!`,
      });
      await loadSiswa();
      setTimeout(() => {
        setImportOpen(false);
        setImportFile(null);
        setImportResult(null);
      }, 2000);
    } catch {
      setImportResult({ success: false, message: "Terjadi kesalahan saat mengunggah file." });
    } finally {
      setImporting(false);
    }
  }

  const columns = [
    {
      key: "nomor_induk",
      header: "No. Induk",
      render: (row: SiswaItem) => (
        <span className="font-mono text-[#DC2626] text-[11px] font-bold">{row.nomor_induk}</span>
      ),
    },
    {
      key: "nama_lengkap",
      header: "Nama Siswa",
      render: (row: SiswaItem) => (
        <div>
          <p className="text-xs font-semibold text-[#F9FAFB]">{row.nama_lengkap}</p>
          <p className="text-[11px] text-[#6B7280]">User: {row.username || "—"}</p>
        </div>
      ),
    },
    {
      key: "program",
      header: "Program",
      render: (row: SiswaItem) => (
        <span className="text-xs text-[#D1D5DB]">{row.program?.nama || "Pelatihan"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: SiswaItem) => {
        const isAlumni = !!row.tgl_keluar;
        return (
          <Badge variant={isAlumni ? "neutral" : "success"}>
            {isAlumni ? "Alumni" : "Aktif"}
          </Badge>
        );
      },
    },
    {
      key: "kontak",
      header: "Kontak",
      render: (row: SiswaItem) => (
        <div className="text-[11px] text-[#9CA3AF]">
          <p>{row.email}</p>
          <p className="text-[#6B7280]">{row.no_hp || "—"}</p>
        </div>
      ),
    },
    {
      key: "aksi",
      header: "Aksi",
      className: "w-28 text-right",
      render: (row: SiswaItem) => (
        <button
          onClick={() => openKelolaAkun(row)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#1F2937] hover:border-[#DC2626]/40 bg-[#0B0F17] hover:bg-[#DC2626]/10 text-[11px] text-[#D1D5DB] hover:text-white transition-all"
        >
          <KeyRound className="h-3 w-3 text-[#DC2626]" /> Kelola Akun
        </button>
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

        <div className="ml-auto flex items-center gap-1.5 text-xs text-[#6B7280]">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{siswaList.length} siswa terdaftar</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-xs text-[#6B7280]">
          <Loader2 className="h-6 w-6 animate-spin text-[#DC2626]" />
          <span>Memuat data direktori siswa...</span>
        </div>
      ) : (
        <Table columns={columns} data={siswaList} emptyMessage="Tidak ada siswa yang cocok dengan kriteria pencarian." />
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
            <div className="rounded-xl border border-[#1F2937] bg-[#0B0F17] p-3 text-xs">
              <p className="text-[#9CA3AF]">Nama Siswa: <strong className="text-[#F9FAFB]">{selectedSiswa.nama_lengkap}</strong></p>
              <p className="text-[#6B7280] mt-0.5">No. Induk: {selectedSiswa.nomor_induk}</p>
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

      {/* Modal Import Excel */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Data Siswa dari Excel"
        size="sm"
      >
        <form onSubmit={handleImport} className="flex flex-col gap-4">
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Unggah file spreadsheet (.xlsx) sesuai template format LPKS. Gunakan tombol &quot;Template&quot; di atas jika belum memiliki formatnya.
          </p>

          <input
            type="file"
            accept=".xlsx, .csv"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            className="text-xs text-[#D1D5DB] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#DC2626] file:text-white hover:file:bg-[#B91C1C] cursor-pointer"
          />

          {importResult && (
            <div
              className={`rounded-lg p-3 text-xs flex items-center gap-2 ${
                importResult.success
                  ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"
                  : "bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/20"
              }`}
            >
              {importResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{importResult.message}</span>
            </div>
          )}

          <div className="flex items-center gap-2 justify-end pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(false)}>
              Tutup
            </Button>
            <Button type="submit" size="sm" disabled={!importFile || importing}>
              {importing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengimpor...</> : "Mulai Import"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
