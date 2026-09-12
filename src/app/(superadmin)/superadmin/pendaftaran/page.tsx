"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, Circle, ChevronRight, ChevronLeft,
  Copy, Check, Eye, EyeOff, AlertTriangle, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { handleEnterToNextField } from "@/lib/form-utils";

const BERKAS_LIST = [
  "Fotokopi Ijazah terakhir (2 lembar)",
  "Fotokopi KTP (2 lembar)",
  "Fotokopi KK (2 lembar)",
  "Pas foto 3x4 latar belakang merah (3 lembar)",
  "Surat keterangan sehat dokter (1 lembar)",
];

const SESSION_KEY = "lpks_pendaftaran_draft";

interface ProgramItem {
  id: string;
  kode_program: string;
  nama: string;
  biaya: number;
  estimasi_durasi_hari: number;
}

interface RegistrationSuccessData {
  nama_lengkap: string;
  nomor_induk: string;
  username: string;
  password?: string;
}

type FieldErrors = Record<string, string>;

/** Validasi satu field — dipakai onBlur dan saat submit */
function validateField(name: string, value: string): string {
  switch (name) {
    case "nama":
      if (!value.trim()) return "Nama lengkap wajib diisi.";
      if (value.trim().length < 3) return "Nama lengkap minimal 3 karakter.";
      return "";
    case "nik": {
      const v = value.trim();
      if (!v) return "NIK wajib diisi.";
      if (!/^\d+$/.test(v)) return "NIK hanya boleh berisi angka.";
      if (v.length < 16) return `NIK kurang dari 16 digit (sekarang ${v.length} digit).`;
      if (v.length > 16) return `NIK lebih dari 16 digit (sekarang ${v.length} digit).`;
      return "";
    }
    case "email": {
      const v = value.trim();
      if (!v) return "Email wajib diisi.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Format email tidak valid (cth: nama@gmail.com).";
      return "";
    }
    case "telepon": {
      const v = value.trim().replace(/[\s-]/g, "");
      if (v && !/^(\+62|62|0)\d{8,13}$/.test(v)) return "Format nomor tidak valid (cth: 08123456789 atau +628123456789).";
      return "";
    }
    case "program_id":
      if (!value) return "Program pelatihan wajib dipilih.";
      return "";
    case "tgl_masuk":
      if (!value) return "Tanggal masuk wajib diisi.";
      return "";
    default:
      return "";
  }
}

/** Validasi semua field sebelum submit */
function validateForm(data: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {};
  for (const name of ["nama", "nik", "email", "telepon", "program_id", "tgl_masuk"]) {
    const msg = validateField(name, data[name] ?? "");
    if (msg) errors[name] = msg;
  }
  return errors;
}

export default function PendaftaranPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [checkedBerkas, setCheckedBerkas] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [successData, setSuccessData] = useState<RegistrationSuccessData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Controlled fields for sessionStorage persistence
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [tanggalMasuk, setTanggalMasuk] = useState("");
  const [programId, setProgramId] = useState("");
  const [nextNomorInduk, setNextNomorInduk] = useState<string | null>(null);

  // Restore draft from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.step) setStep(draft.step);
        if (draft.checkedBerkas) setCheckedBerkas(new Set(draft.checkedBerkas));
        if (draft.formValues) setFormValues(draft.formValues);
        if (draft.tanggalMasuk) setTanggalMasuk(draft.tanggalMasuk);
        if (draft.programId) setProgramId(draft.programId);
        if (draft.nextNomorInduk) setNextNomorInduk(draft.nextNomorInduk);
      }
    } catch { /* corrupted storage, ignore */ }
  }, []);

  // Persist draft to sessionStorage on every meaningful change
  const persistDraft = useCallback((patch: Record<string, unknown>) => {
    try {
      const existing = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...existing, ...patch }));
    } catch { /* quota exceeded, ignore */ }
  }, []);

  function handleFieldChange(name: string, value: string) {
    setFormValues((prev) => {
      const next = { ...prev, [name]: value };
      persistDraft({ formValues: next });
      return next;
    });
    // Clear error on change (re-validate below happens on blur)
    if (fieldErrors[name]) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  }

  function handleFieldBlur(name: string, value: string) {
    const msg = validateField(name, value);
    setFieldErrors((prev) => {
      if (!msg) { const n = { ...prev }; delete n[name]; return n; }
      return { ...prev, [name]: msg };
    });
  }

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

  // Fetch next nomor induk when program changes
  useEffect(() => {
    if (!programId) {
      setNextNomorInduk(null);
      persistDraft({ nextNomorInduk: null });
      return;
    }
    async function loadNextId() {
      try {
        const res = await fetch(`/api/v1/siswa/next-id?program_id=${programId}`);
        if (res.ok) {
          const json = await res.json();
          setNextNomorInduk(json.data.next_nomor_induk);
          persistDraft({ nextNomorInduk: json.data.next_nomor_induk });
        }
      } catch (e) {
        console.error("Gagal memuat next nomor induk:", e);
      }
    }
    loadNextId();
  }, [programId, persistDraft]);

  const allBerkasChecked = checkedBerkas.size === BERKAS_LIST.length;
  const selectedProgram = programs.find((p) => p.id === programId);

  const tglKeluar = React.useMemo(() => {
    if (!tanggalMasuk || !selectedProgram?.estimasi_durasi_hari) return "";
    const date = new Date(tanggalMasuk);
    date.setDate(date.getDate() + selectedProgram.estimasi_durasi_hari);
    return date.toISOString().split("T")[0];
  }, [tanggalMasuk, selectedProgram]);

  function toggleBerkas(i: number) {
    setCheckedBerkas((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      persistDraft({ checkedBerkas: [...next] });
      return next;
    });
  }

  function toggleAllBerkas() {
    const next = checkedBerkas.size === BERKAS_LIST.length
      ? new Set<number>()
      : new Set(BERKAS_LIST.map((_, i) => i));
    setCheckedBerkas(next);
    persistDraft({ checkedBerkas: [...next] });
  }

  function goToStep2() {
    setStep(2);
    persistDraft({ step: 2 });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const rawData: Record<string, string> = {};
    formData.forEach((val, key) => { rawData[key] = val as string; });
    // Merge controlled values
    rawData.program_id = programId;
    rawData.tgl_masuk = tanggalMasuk;

    const errors = validateForm(rawData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll to first error
      const firstKey = Object.keys(errors)[0];
      document.querySelector(`[name="${firstKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setFieldErrors({});
    setSaving(true);

    const checklistMap: Record<string, boolean> = {};
    BERKAS_LIST.forEach((b, idx) => { checklistMap[b] = checkedBerkas.has(idx); });

    const payload = {
      program_id: programId,
      nama_lengkap: rawData.nama,
      nik: rawData.nik,
      email: rawData.email,
      no_hp: rawData.telepon || null,
      tempat_lahir: rawData.tempat_lahir || null,
      tgl_lahir: rawData.tanggal_lahir || null,
      alamat_lengkap: `${rawData.jalan}, RT ${rawData.rt}/RW ${rawData.rw}, ${rawData.kelurahan}, Kec. ${rawData.kecamatan}, ${rawData.kabupaten}, Prov. ${rawData.provinsi}`,
      nama_ayah: rawData.nama_ayah || null,
      nama_ibu: rawData.nama_ibu || null,
      pendidikan_terakhir: rawData.pendidikan_terakhir || null,
      nisn: rawData.nisn || null,
      tgl_masuk: tanggalMasuk || null,
      tgl_keluar: tglKeluar || null,
      checklist_berkas: checklistMap,
    };

    try {
      const res = await fetch("/api/v1/siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const code: string = data?.error?.code || "";
        const msg: string = data?.error?.message || data?.message || "Terjadi kesalahan tidak dikenal.";
        const details: string = data?.error?.details || "";

        // Petakan error code dari API ke field yang tepat
        switch (code) {
          case "VALIDATION_ERROR":
            // Cek field mana yang kurang
            if (msg.includes("NIK")) setFieldErrors({ nik: msg });
            else if (msg.includes("email")) setFieldErrors({ email: msg });
            else if (msg.includes("nama")) setFieldErrors({ nama: msg });
            else if (msg.includes("Program")) setFieldErrors({ program_id: msg });
            else setFieldErrors({ _global: msg });
            break;
          case "INVALID_NIK":
            setFieldErrors({ nik: "NIK tidak valid — harus tepat 16 digit angka." });
            document.querySelector('[name="nik"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
            break;
          case "DUPLICATE_ACCOUNT":
            if (msg.includes("NIK")) setFieldErrors({ nik: "NIK ini sudah terdaftar di sistem. Pastikan NIK belum pernah didaftarkan." });
            else setFieldErrors({ nama: "Username untuk nama ini sudah dipakai. Coba tambahkan nama tengah atau belakang." });
            break;
          case "DUPLICATE_DATA":
            setFieldErrors({ email: "Email atau NIK sudah terdaftar di sistem.", nik: "Email atau NIK sudah terdaftar di sistem." });
            break;
          case "NOMOR_INDUK_FAILED":
            setFieldErrors({ _global: "Gagal membuat Nomor Induk otomatis. Coba lagi atau hubungi administrator." });
            break;
          case "AUTH_CREATE_FAILED":
            setFieldErrors({ _global: "Gagal membuat akun login siswa di sistem autentikasi. Coba lagi." });
            break;
          case "DATABASE_ERROR":
            setFieldErrors({ _global: `Gagal menyimpan data ke database.${details ? ` Detail: ${details}` : " Coba lagi atau hubungi administrator."}` });
            break;
          case "INTERNAL_ERROR":
          default:
            setFieldErrors({ _global: `Terjadi kesalahan server yang tidak terduga.${details ? ` (${details})` : " Coba refresh halaman dan ulangi pendaftaran."}` });
        }
        return;
      }

      // Clear draft on success
      sessionStorage.removeItem(SESSION_KEY);

      setSuccessData({
        nama_lengkap: data.data?.nama_lengkap || payload.nama_lengkap,
        nomor_induk: data.data?.nomor_induk || "—",
        username: data.data?.generated_credentials?.username || data.data?.username,
        password: data.data?.generated_credentials?.password,
      });
    } catch {
      setFieldErrors({ _global: "Tidak dapat terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  function handleCopy() {
    if (!successData) return;
    const text = `Kredensial Login Siswa LPKS Sumbu Hidup:\nNama: ${successData.nama_lengkap}\nNomor Induk: ${successData.nomor_induk}\nUsername: ${successData.username}\nPassword: ${successData.password || ""}\nURL Login: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ─── Success Screen ───────────────────────────────────────────────────────────
  if (successData) {
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto py-6">
        <div className="flex items-center gap-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-2xl p-4">
          <CheckCircle2 className="h-8 w-8 text-[#10B981] shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold text-[#F9FAFB]">Pendaftaran Berhasil!</h2>
            <p className="text-xs text-[#9CA3AF]">
              Siswa <strong className="text-white">{successData.nama_lengkap}</strong> telah resmi terdaftar.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-[#DC2626]/40 bg-[#111827] p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
            <span className="text-xs font-bold text-[#F9FAFB] uppercase tracking-wider">Kredensial Akun Siswa</span>
            <span className="text-[10px] bg-[#DC2626]/20 text-[#DC2626] font-semibold px-2 py-0.5 rounded-full">Hanya Muncul Sekali</span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between bg-[#0B0F17] rounded-xl p-3 border border-[#1F2937]">
              <span className="text-xs text-[#6B7280]">Nomor Induk Siswa</span>
              <span className="font-mono text-sm font-bold text-[#F9FAFB]">{successData.nomor_induk}</span>
            </div>
            <div className="flex items-center justify-between bg-[#0B0F17] rounded-xl p-3 border border-[#1F2937]">
              <span className="text-xs text-[#6B7280]">Username Login</span>
              <span className="font-mono text-sm font-bold text-[#DC2626]">{successData.username}</span>
            </div>
            <div className="flex items-center justify-between bg-[#0B0F17] rounded-xl p-3 border border-[#1F2937]">
              <span className="text-xs text-[#6B7280]">Password Sementara</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#10B981]">
                  {showPassword ? successData.password : "••••••••"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-[#6B7280] hover:text-[#D1D5DB]"
                  aria-label={showPassword ? "Sembunyikan" : "Lihat"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3 flex gap-2.5 items-start text-xs text-[#F59E0B]">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed text-[11px]">
              Password ini di-generate otomatis dan <strong>tidak disimpan secara terbuka</strong> di database. Berikan kredensial ini ke siswa dan minta mereka segera mengubahnya setelah login.
            </span>
          </div>

          <Button onClick={handleCopy} className="w-full gap-2">
            {copied ? (
              <><Check className="h-4 w-4 text-[#10B981]" /> Berhasil Disalin ke Clipboard!</>
            ) : (
              <><Copy className="h-4 w-4" /> Salin Kredensial Siswa</>
            )}
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setStep(1);
            setCheckedBerkas(new Set());
            setSuccessData(null);
            setFormValues({});
            setTanggalMasuk("");
            setProgramId("");
            setNextNomorInduk(null);
            sessionStorage.removeItem(SESSION_KEY);
          }}
        >
          Daftarkan Siswa Baru Lainnya
        </Button>
      </div>
    );
  }

  // ─── Main Form ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Pendaftaran Siswa</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">
          Tahap {step} dari 2 — {step === 1 ? "Verifikasi Berkas Fisik" : "Input Biodata Siswa"}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-3">
        {[1, 2].map((s) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 ${step >= s ? "text-[#DC2626]" : "text-[#4B5563]"}`}>
              <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? "border-[#DC2626] bg-[#DC2626]/10 text-[#DC2626]" : "border-[#374151] text-[#4B5563]"}`}>
                {s}
              </div>
              <span className="text-xs font-medium hidden sm:block">
                {s === 1 ? "Berkas Fisik" : "Biodata & Program"}
              </span>
            </div>
            {s === 1 && <div className="flex-1 h-px bg-[#1F2937]" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Checklist Berkas */}
      {step === 1 && (
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col gap-4">
          <p className="text-xs text-[#9CA3AF]">Centang berkas yang sudah diserahkan calon siswa secara fisik.</p>
          <ul className="flex flex-col gap-2" aria-label="Checklist berkas">
            {BERKAS_LIST.map((berkas, i) => {
              const checked = checkedBerkas.has(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => toggleBerkas(i)}
                    className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-xs transition-all duration-150 text-left ${checked ? "bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981]" : "bg-[#0B0F17] border border-[#1F2937] text-[#9CA3AF] hover:border-[#374151] hover:text-[#D1D5DB]"}`}
                    aria-pressed={checked}
                  >
                    {checked
                      ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      : <Circle className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    {berkas}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between pt-2 border-t border-[#1F2937]">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#6B7280]">{checkedBerkas.size} / {BERKAS_LIST.length} berkas</span>
              <Button type="button" variant="outline" size="sm" onClick={toggleAllBerkas} className="text-[10px] py-1 h-7">
                {allBerkasChecked ? "Batal Centang Semua" : "Centang Semua"}
              </Button>
            </div>
            <Button onClick={goToStep2} disabled={!allBerkasChecked}>
              Lanjut Input Biodata <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Biodata Form */}
      {step === 2 && (
        <form
          onSubmit={handleSubmit}
          data-form-container
          onKeyDown={handleEnterToNextField}
          className="flex flex-col gap-5"
          noValidate
        >
          {/* Global error */}
          {fieldErrors._global && (
            <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs text-[#F43F5E] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{fieldErrors._global}</span>
            </div>
          )}

          <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col gap-1">

            {/* DATA PRIBADI */}
            <div className="flex items-center gap-4 mt-2 mb-4">
              <span className="text-[10px] font-bold tracking-widest text-[#DC2626] uppercase">Data Pribadi</span>
              <div className="flex-1 h-px bg-[#1F2937]" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Nama Lengkap *"
                name="nama"
                required
                placeholder="Nama lengkap sesuai KTP"
                data-next="nik"
                value={formValues.nama ?? ""}
                onChange={(e) => handleFieldChange("nama", e.target.value)}
                onBlur={(e) => handleFieldBlur("nama", e.target.value)}
                error={fieldErrors.nama}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="NIK * (16 digit)"
                  name="nik"
                  required
                  placeholder="3201XXXXXXXXXXXX"
                  maxLength={16}
                  data-next="tempat_lahir"
                  value={formValues.nik ?? ""}
                  onChange={(e) => handleFieldChange("nik", e.target.value.replace(/\D/g, ""))}
                  onBlur={(e) => handleFieldBlur("nik", e.target.value)}
                  error={fieldErrors.nik}
                  hint={formValues.nik ? `${formValues.nik.length}/16 digit` : undefined}
                />
                <Input
                  label="Tempat Lahir"
                  name="tempat_lahir"
                  placeholder="Kota/Kab. tempat lahir"
                  data-next="tanggal_lahir"
                  value={formValues.tempat_lahir ?? ""}
                  onChange={(e) => handleFieldChange("tempat_lahir", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Tanggal Lahir"
                  name="tanggal_lahir"
                  type="date"
                  data-next="jalan"
                  value={formValues.tanggal_lahir ?? ""}
                  onChange={(e) => handleFieldChange("tanggal_lahir", e.target.value)}
                />
              </div>
            </div>

            {/* ALAMAT */}
            <div className="flex items-center gap-4 mt-6 mb-4">
              <span className="text-[10px] font-bold tracking-widest text-[#DC2626] uppercase">Alamat</span>
              <div className="flex-1 h-px bg-[#1F2937]" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Jalan / Dusun / Daerah (incl. No. Rumah)"
                name="jalan"
                placeholder="cth: Jl. Ir.H Juanda No. 12  /  Dusun II Surumana"
                data-next="rt"
                value={formValues.jalan ?? ""}
                onChange={(e) => handleFieldChange("jalan", e.target.value)}
              />
              <div className="grid grid-cols-4 gap-4">
                <Input label="RT" name="rt" placeholder="001" data-next="rw" value={formValues.rt ?? ""} onChange={(e) => handleFieldChange("rt", e.target.value)} />
                <Input label="RW" name="rw" placeholder="001" data-next="kelurahan" value={formValues.rw ?? ""} onChange={(e) => handleFieldChange("rw", e.target.value)} />
                <Input label="Kelurahan / Desa" name="kelurahan" placeholder="Nama kelurahan" data-next="kecamatan" value={formValues.kelurahan ?? ""} onChange={(e) => handleFieldChange("kelurahan", e.target.value)} />
                <Input label="Kecamatan" name="kecamatan" placeholder="Nama kecamatan" data-next="kabupaten" value={formValues.kecamatan ?? ""} onChange={(e) => handleFieldChange("kecamatan", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Kabupaten / Kota" name="kabupaten" placeholder="cth: Kab. Cilacap  /  Kota Palu" data-next="provinsi" value={formValues.kabupaten ?? ""} onChange={(e) => handleFieldChange("kabupaten", e.target.value)} />
                <Input label="Provinsi" name="provinsi" placeholder="cth: Jawa Tengah" data-next="nama_ayah" value={formValues.provinsi ?? ""} onChange={(e) => handleFieldChange("provinsi", e.target.value)} />
              </div>
            </div>

            {/* ORANG TUA */}
            <div className="flex items-center gap-4 mt-6 mb-4">
              <span className="text-[10px] font-bold tracking-widest text-[#DC2626] uppercase">Orang Tua</span>
              <div className="flex-1 h-px bg-[#1F2937]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nama Ayah" name="nama_ayah" placeholder="Nama ayah (opsional)" data-next="nama_ibu" value={formValues.nama_ayah ?? ""} onChange={(e) => handleFieldChange("nama_ayah", e.target.value)} />
              <Input label="Nama Ibu" name="nama_ibu" placeholder="Nama ibu (opsional)" data-next="telepon" value={formValues.nama_ibu ?? ""} onChange={(e) => handleFieldChange("nama_ibu", e.target.value)} />
            </div>

            {/* KONTAK */}
            <div className="flex items-center gap-4 mt-6 mb-4">
              <span className="text-[10px] font-bold tracking-widest text-[#DC2626] uppercase">Kontak</span>
              <div className="flex-1 h-px bg-[#1F2937]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="No. HP / WhatsApp"
                name="telepon"
                type="tel"
                placeholder="08xxxxxxxxxx"
                data-next="email"
                value={formValues.telepon ?? ""}
                onChange={(e) => handleFieldChange("telepon", e.target.value)}
                onBlur={(e) => handleFieldBlur("telepon", e.target.value)}
                error={fieldErrors.telepon}
              />
              <Input
                label="Email *"
                name="email"
                type="email"
                required
                placeholder="nama.siswa@gmail.com"
                data-next="pendidikan_terakhir"
                value={formValues.email ?? ""}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                onBlur={(e) => handleFieldBlur("email", e.target.value)}
                error={fieldErrors.email}
              />
            </div>

            {/* PENDIDIKAN & PROGRAM */}
            <div className="flex items-center gap-4 mt-6 mb-4">
              <span className="text-[10px] font-bold tracking-widest text-[#DC2626] uppercase">Pendidikan & Program</span>
              <div className="flex-1 h-px bg-[#1F2937]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Pend. Terakhir" name="pendidikan_terakhir" data-next="nisn"
                value={formValues.pendidikan_terakhir ?? ""}
                onChange={(e) => handleFieldChange("pendidikan_terakhir", e.target.value)}
              >
                <option value="">— Pilih —</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="SLTP">SLTP</option>
                <option value="SMA">SMA</option>
                <option value="SLTA">SLTA</option>
                <option value="SMK">SMK</option>
                <option value="MA">MA</option>
                <option value="Paket A Setara SD">Paket A Setara SD</option>
                <option value="Paket B Setara SMP">Paket B Setara SMP</option>
                <option value="Paket C Setara SMA">Paket C Setara SMA</option>
                <option value="D1">D1</option>
                <option value="D2">D2</option>
                <option value="D3">D3</option>
                <option value="D4">D4</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S3">S3</option>
              </Select>
              <Input
                label="NISN"
                name="nisn"
                placeholder="Nomor Induk Siswa Nasional"
                data-next="program_id"
                value={formValues.nisn ?? ""}
                onChange={(e) => handleFieldChange("nisn", e.target.value)}
              />
            </div>

            {/* Program Pelatihan */}
            <div className="mt-4 flex flex-col gap-2">
              <Select
                label="Program Pelatihan *"
                name="program_id"
                required
                value={programId}
                onChange={(e) => {
                  setProgramId(e.target.value);
                  persistDraft({ programId: e.target.value });
                  if (fieldErrors.program_id) setFieldErrors((prev) => { const n = { ...prev }; delete n.program_id; return n; });
                }}
                data-next="tgl_masuk"
                error={fieldErrors.program_id}
              >
                <option value="">— Pilih Program —</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.kode_program} — {p.nama} (Rp {Number(p.biaya).toLocaleString("id-ID")} · {p.estimasi_durasi_hari} hari)
                  </option>
                ))}
              </Select>

              {/* Nomor Induk Preview — large, clear */}
              {selectedProgram && (
                <div className="flex items-center gap-3 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-2.5">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium">Nomor Induk Siswa Baru:</span>
                    <span className="text-base font-mono font-bold text-[#10B981]">{nextNomorInduk || `${selectedProgram.kode_program}.XXXX`}</span>
                  </div>
                  <div className="ml-auto text-right flex flex-col">
                    <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium">Biaya Program</span>
                    <span className="text-sm font-semibold text-[#F9FAFB]">Rp {Number(selectedProgram.biaya).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Input
                label="Tanggal Masuk *"
                name="tgl_masuk"
                type="date"
                value={tanggalMasuk}
                onChange={(e) => {
                  setTanggalMasuk(e.target.value);
                  persistDraft({ tanggalMasuk: e.target.value });
                  if (fieldErrors.tgl_masuk) setFieldErrors((prev) => { const n = { ...prev }; delete n.tgl_masuk; return n; });
                }}
                data-next="submit"
                error={fieldErrors.tgl_masuk}
              />
              <Input
                label="Tanggal Keluar (Estimasi)"
                name="tgl_keluar"
                type="date"
                value={tglKeluar}
                readOnly
                className="opacity-60 bg-black/30 pointer-events-none"
                hint="Otomatis dihitung dari durasi program"
              />
            </div>

          </div>

          <div className="flex items-center gap-3 justify-between">
            <Button type="button" variant="outline" onClick={() => { setStep(1); persistDraft({ step: 1 }); }}>
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Kembali
            </Button>
            <Button id="submit" type="submit" disabled={saving}>
              {saving ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Mendaftarkan...</>
              ) : (
                "Daftarkan & Generate Akun Siswa"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
