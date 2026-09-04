"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2, Circle, ChevronRight, ChevronLeft,
  Copy, Check, Eye, EyeOff, AlertTriangle, Loader2, AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { handleEnterToNextField } from "@/lib/form-utils";

// Static list of required physical documents
const BERKAS_LIST = [
  "Fotokopi KTP",
  "Fotokopi Kartu Keluarga",
  "Pas Foto 3×4 (2 lembar)",
  "Ijazah Terakhir (min. SMP)",
  "Surat Keterangan Sehat",
  "Surat Pernyataan Kesanggupan",
];

interface ProgramItem {
  id: string;
  kode_program: string;
  nama: string;
  biaya: number;
}

interface RegistrationSuccessData {
  nama_lengkap: string;
  nomor_induk: string;
  username: string;
  password?: string;
}

export default function PendaftaranPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [checkedBerkas, setCheckedBerkas] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [successData, setSuccessData] = useState<RegistrationSuccessData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const allBerkasChecked = checkedBerkas.size === BERKAS_LIST.length;

  function toggleBerkas(i: number) {
    setCheckedBerkas((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const checklistMap: Record<string, boolean> = {};
    BERKAS_LIST.forEach((b, idx) => {
      checklistMap[b] = checkedBerkas.has(idx);
    });

    const payload = {
      program_id: formData.get("program_id") as string,
      nama_lengkap: formData.get("nama") as string,
      nik: formData.get("nik") as string,
      email: formData.get("email") as string,
      no_hp: (formData.get("telepon") as string) || null,
      tempat_lahir: (formData.get("tempat_lahir") as string) || null,
      tgl_lahir: (formData.get("tanggal_lahir") as string) || null,
      alamat_lengkap: (formData.get("alamat") as string) || null,
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
        setErrorMsg(data.error?.message || "Gagal mendaftarkan siswa.");
        return;
      }

      setSuccessData({
        nama_lengkap: data.data?.nama_lengkap || payload.nama_lengkap,
        nomor_induk: data.data?.nomor_induk || "—",
        username: data.data?.generated_credentials?.username || data.data?.username,
        password: data.data?.generated_credentials?.password,
      });
    } catch {
      setErrorMsg("Tidak dapat terhubung ke server.");
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

        {/* Panel Kredensial Sekali Tampil */}
        <div className="rounded-2xl border-2 border-[#DC2626]/40 bg-[#111827] p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
            <span className="text-xs font-bold text-[#F9FAFB] uppercase tracking-wider">
              Kredensial Akun Siswa
            </span>
            <span className="text-[10px] bg-[#DC2626]/20 text-[#DC2626] font-semibold px-2 py-0.5 rounded-full">
              Hanya Muncul Sekali
            </span>
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

          {/* Warning */}
          <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3 flex gap-2.5 items-start text-xs text-[#F59E0B]">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed text-[11px]">
              Password ini di-generate otomatis dan <strong>tidak disimpan secara terbuka</strong> di database. Berikan kredensial ini ke siswa dan minta mereka segera mengubahnya setelah login.
            </span>
          </div>

          {/* Copy button */}
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
          }}
        >
          Daftarkan Siswa Baru Lainnya
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Pendaftaran Siswa</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Tahap {step} dari 2 — {step === 1 ? "Verifikasi Berkas Fisik" : "Input Biodata Siswa"}</p>
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
            <span className="text-xs text-[#6B7280]">{checkedBerkas.size} / {BERKAS_LIST.length} berkas</span>
            <Button onClick={() => setStep(2)} disabled={!allBerkasChecked}>
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
          {errorMsg && (
            <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs text-[#F43F5E] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nama Lengkap" name="nama" required placeholder="Budi Santoso" data-next="nik" />
              <Input label="NIK (16 Digit)" name="nik" required placeholder="3201234567890001" maxLength={16} data-next="email" />
              <Input label="Email" name="email" type="email" required placeholder="budi@email.com" data-next="telepon" />
              <Input label="No. Telepon / WhatsApp" name="telepon" type="tel" placeholder="08123456789" data-next="tempat_lahir" />
              <Input label="Tempat Lahir" name="tempat_lahir" placeholder="Bandung" data-next="tanggal_lahir" />
              <Input label="Tanggal Lahir" name="tanggal_lahir" type="date" data-next="program_id" />
              <div className="sm:col-span-2">
                <Select label="Program Pelatihan" name="program_id" required data-next="alamat">
                  <option value="">Pilih program pelatihan...</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.kode_program} — {p.nama} (Rp {Number(p.biaya).toLocaleString("id-ID")})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <Input label="Alamat Lengkap" name="alamat" placeholder="Jl. Raya Timur No. 42" data-next="submit" />
          </div>

          <div className="flex items-center gap-3 justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
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
