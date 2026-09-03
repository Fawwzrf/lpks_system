"use client";

import React, { useState } from "react";
import { CheckCircle2, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleEnterToNextField } from "@/lib/form-utils";

const KRITERIA = [
  { key: "Persiapan",    desc: "Kelengkapan alat & APD" },
  { key: "Proses",       desc: "Teknik pengelasan" },
  { key: "K3",           desc: "Keselamatan & kesehatan kerja" },
  { key: "Kerapihan",    desc: "Kebersihan & kerapihan hasil" },
  { key: "Hasil Akhir",  desc: "Kualitas hasil lasan" },
] as const;

type KriteriaKey = typeof KRITERIA[number]["key"];

const RIWAYAT = [
  { id: 1, tanggal: "02 Sep 2025", values: { Persiapan: 85, Proses: 80, K3: 90, Kerapihan: 78, "Hasil Akhir": 82 }, status: "tervalidasi" },
  { id: 2, tanggal: "01 Sep 2025", values: { Persiapan: 80, Proses: 76, K3: 83, Kerapihan: 73, "Hasil Akhir": 78 }, status: "menunggu" },
];

export default function NilaiPage() {
  const [values, setValues] = useState<Partial<Record<KriteriaKey, string>>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleChange(key: KriteriaKey, val: string) {
    const num = parseInt(val);
    if (val !== "" && (isNaN(num) || num < 0 || num > 100)) return;
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    setSaved(true);
  }

  const allFilled = KRITERIA.every((k) => values[k.key] !== "" && values[k.key] !== undefined);

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <CheckCircle2 className="h-12 w-12 text-[#10B981]" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-[#F9FAFB]">Nilai Terkirim!</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Menunggu validasi instruktur.</p>
        </div>
        <Button onClick={() => { setValues({}); setSaved(false); }}>Input Nilai Baru</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Input Nilai Mandiri</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Isi nilai per kriteria untuk sesi hari ini.</p>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2.5 bg-[#111827] border border-[#374151] rounded-xl p-3">
        <Info className="h-4 w-4 text-[#38BDF8] shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
          Nilai 0–100. Gunakan tombol <kbd className="text-[#D1D5DB] bg-[#0B0F17] border border-[#374151] rounded px-1">Enter</kbd> untuk pindah ke kolom berikutnya.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        data-form-container
        onKeyDown={handleEnterToNextField}
        className="flex flex-col gap-3"
        noValidate
      >
        {KRITERIA.map((k, i) => {
          const val = values[k.key] ?? "";
          const num = parseInt(val);
          const valid = val === "" || (!isNaN(num) && num >= 80);
          return (
            <div key={k.key} className="rounded-xl border border-[#1F2937] bg-[#111827] p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#D1D5DB] leading-tight">{k.key}</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">{k.desc}</p>
              </div>
              <input
                id={`nilai-${k.key.replace(/\s+/g, "-")}`}
                name={k.key}
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={val}
                onChange={(e) => handleChange(k.key, e.target.value)}
                placeholder="—"
                data-next={KRITERIA[i + 1]
                  ? `nilai-${KRITERIA[i + 1].key.replace(/\s+/g, "-")}`
                  : "submit"}
                className={`h-11 w-16 rounded-xl border text-center text-sm font-bold bg-[#0B0F17] text-[#F9FAFB] focus:outline-none transition-colors ${
                  val !== "" && !valid
                    ? "border-[#F43F5E] focus:border-[#F43F5E]"
                    : val !== "" && valid
                      ? "border-[#10B981] text-[#10B981] focus:border-[#10B981]"
                      : "border-[#374151] focus:border-[#DC2626]"
                }`}
                aria-label={`Nilai ${k.key}`}
              />
            </div>
          );
        })}

        <Button
          id="submit"
          type="submit"
          disabled={saving || !allFilled}
          className="mt-1"
        >
          {saving ? "Mengirim..." : "Kirim Nilai"}
        </Button>
      </form>

      {/* Riwayat */}
      <section aria-label="Riwayat nilai">
        <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Riwayat Input Terbaru
        </h2>
        <div className="flex flex-col gap-2">
          {RIWAYAT.map((r) => {
            const avg = Math.round(Object.values(r.values).reduce((a, b) => a + b, 0) / Object.keys(r.values).length);
            return (
              <div key={r.id} className="rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#D1D5DB]">{r.tanggal}</p>
                  <p className={`text-[11px] mt-0.5 ${r.status === "tervalidasi" ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                    {r.status === "tervalidasi" ? "✓ Tervalidasi instruktur" : "⏳ Menunggu validasi"}
                  </p>
                </div>
                <div className={`text-xl font-bold ${avg >= 80 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                  {avg}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
