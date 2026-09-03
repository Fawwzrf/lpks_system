"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, ChevronRight, ChevronLeft, Hash } from "lucide-react";
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

// Auto-generate nomor induk: LPKS-YYYY-XXXX
function generateNomorInduk() {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `LPKS-${year}-${seq}`;
}

export default function PendaftaranPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [checkedBerkas, setCheckedBerkas] = useState<Set<number>>(new Set());
  const [nomorInduk] = useState(generateNomorInduk);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

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
    setSaving(true);
    // Simulate save (Tahap 5 akan connect ke API)
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <CheckCircle2 className="h-12 w-12 text-[#10B981]" aria-hidden="true" />
        <div className="text-center">
          <h2 className="text-sm font-bold text-[#F9FAFB]">Pendaftaran Berhasil!</h2>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Siswa telah didaftarkan dengan nomor induk{" "}
            <span className="text-[#DC2626] font-mono font-bold">{nomorInduk}</span>.
          </p>
        </div>
        <Button onClick={() => { setStep(1); setCheckedBerkas(new Set()); setDone(false); }}>
          Daftarkan Siswa Baru
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Pendaftaran Siswa</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Tahap {step} dari 2 — {step === 1 ? "Verifikasi Berkas Fisik" : "Input Biodata"}</p>
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
                {s === 1 ? "Berkas Fisik" : "Biodata"}
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
          {/* Nomor Induk Callout */}
          <div className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-[#DC2626]" aria-hidden="true" />
              <span className="text-xs font-semibold text-[#DC2626]">Nomor Induk Otomatis</span>
            </div>
            <p className="font-mono text-2xl font-bold text-[#F9FAFB] tracking-widest">{nomorInduk}</p>
            <p className="text-[11px] text-[#9CA3AF] mt-1">Nomor ini akan ditetapkan permanen untuk siswa ini.</p>
          </div>

          <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nama Lengkap" name="nama" required placeholder="Budi Santoso" data-next="email" />
              <Input label="Email" name="email" type="email" required placeholder="budi@email.com" data-next="telepon" />
              <Input label="No. Telepon" name="telepon" type="tel" placeholder="08xx-xxxx-xxxx" data-next="tempat_lahir" />
              <Input label="Tempat Lahir" name="tempat_lahir" placeholder="Jakarta" data-next="tanggal_lahir" />
              <Input label="Tanggal Lahir" name="tanggal_lahir" type="date" data-next="alamat" />
              <Select label="Program Pelatihan" name="program_id" required data-next="alamat">
                <option value="">Pilih program...</option>
                <option value="1">Pengelasan SMAW</option>
                <option value="2">Pengelasan MIG/MAG</option>
                <option value="3">Pengelasan TIG</option>
              </Select>
            </div>
            <Input label="Alamat Lengkap" name="alamat" placeholder="Jl. Contoh No. 1, Jakarta" data-next="submit" />
          </div>

          <div className="flex items-center gap-3 justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Kembali
            </Button>
            <Button id="submit" type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Daftarkan Siswa"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
