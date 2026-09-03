"use client";

import React, { useState } from "react";
import { Award, CheckCircle2, XCircle, AlertTriangle, Printer, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { handleEnterToNextField } from "@/lib/form-utils";

const KRITERIA_UJIAN = ["Teori", "SMAW 1F", "SMAW 2F", "SMAW 3F", "Distorsi", "NDT"] as const;
type KriteriaUjian = typeof KRITERIA_UJIAN[number];

interface SiswaUjian {
  id: number;
  nama: string;
  nilaiHarian: boolean; // semua kriteria ≥ 80
  lunas: boolean;
  nilaiUjian: Partial<Record<KriteriaUjian, number>>;
}

const DEMO: SiswaUjian[] = [
  { id: 1, nama: "Budi Santoso", nilaiHarian: true,  lunas: true,  nilaiUjian: { Teori: 82, "SMAW 1F": 85, "SMAW 2F": 80, "SMAW 3F": 78, Distorsi: 83, NDT: 84 } },
  { id: 2, nama: "Sari Dewi",    nilaiHarian: true,  lunas: true,  nilaiUjian: { Teori: 90, "SMAW 1F": 92, "SMAW 2F": 88, "SMAW 3F": 85, Distorsi: 90, NDT: 91 } },
  { id: 3, nama: "Rina Marlina", nilaiHarian: false, lunas: false, nilaiUjian: {} },
];

function GateIndicator({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${ok ? "text-[#10B981]" : "text-[#F43F5E]"}`}>
      {ok
        ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        : <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />}
      <span>{label}</span>
    </div>
  );
}

export default function UjianPage() {
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [inputTarget, setInputTarget] = useState<SiswaUjian | null>(null);

  function avgNilaiUjian(ujian: Partial<Record<KriteriaUjian, number>>) {
    const vals = Object.values(ujian).filter((v): v is number => v !== undefined);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  const allGate = (s: SiswaUjian) => s.nilaiHarian && s.lunas;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Ujian &amp; Sertifikat</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Gate-check kelayakan ujian dan penerbitan sertifikat.</p>
      </div>

      {/* Siswa Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DEMO.map((s) => {
          const avg = avgNilaiUjian(s.nilaiUjian);
          const gateOk = allGate(s);
          const lulus = avg !== null && avg >= 80 && gateOk;
          return (
            <div
              key={s.id}
              className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-[#F9FAFB]">{s.nama}</p>
                  {avg !== null ? (
                    <p className={`text-xl font-bold mt-0.5 ${avg >= 80 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                      {avg}<span className="text-xs font-normal text-[#6B7280]"> / 100 rata-rata</span>
                    </p>
                  ) : (
                    <p className="text-xs text-[#6B7280] mt-0.5">Belum ada nilai ujian</p>
                  )}
                </div>
                <div className="h-9 w-9 rounded-xl bg-[#1F2937] border border-[#374151] flex items-center justify-center">
                  <Award className={`h-5 w-5 ${lulus ? "text-[#10B981]" : "text-[#6B7280]"}`} aria-hidden="true" />
                </div>
              </div>

              {/* Gate Check */}
              <div className="flex flex-col gap-1.5 bg-[#0B0F17] rounded-lg p-3">
                <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-widest mb-1">Gate Check</p>
                <GateIndicator label="Semua nilai harian ≥ 80" ok={s.nilaiHarian} />
                <GateIndicator label="Pembayaran lunas" ok={s.lunas} />
                {avg !== null && <GateIndicator label={`Rata-rata ujian ≥ 80 (${avg})`} ok={avg >= 80} />}
              </div>

              {/* Nilai ujian grid */}
              {Object.keys(s.nilaiUjian).length > 0 && (
                <div className="grid grid-cols-3 gap-1.5">
                  {KRITERIA_UJIAN.map((k) => {
                    const v = s.nilaiUjian[k];
                    return (
                      <div key={k} className="rounded-lg bg-[#0B0F17] border border-[#1F2937] p-2 text-center">
                        <p className="text-[9px] text-[#6B7280] truncate">{k}</p>
                        <p className={`text-sm font-bold ${v !== undefined && v >= 80 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                          {v ?? "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => { setInputTarget(s); setInputModalOpen(true); }}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Input Nilai
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  disabled={!lulus}
                  title={!lulus ? "Gate-check belum terpenuhi" : "Cetak sertifikat PDF"}
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" /> Sertifikat
                </Button>
              </div>

              {!gateOk && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Gate-check belum terpenuhi
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Input Nilai Ujian */}
      <Modal
        open={inputModalOpen}
        onClose={() => setInputModalOpen(false)}
        title={`Input Nilai Ujian — ${inputTarget?.nama ?? ""}`}
        description="Masukkan nilai untuk setiap kriteria ujian."
      >
        <form
          data-form-container
          onKeyDown={handleEnterToNextField}
          className="grid grid-cols-2 gap-4"
          onSubmit={(e) => { e.preventDefault(); setInputModalOpen(false); }}
        >
          {KRITERIA_UJIAN.map((k, i) => (
            <Input
              key={k}
              label={k}
              name={k}
              type="number"
              min={0}
              max={100}
              placeholder="0–100"
              data-next={KRITERIA_UJIAN[i + 1] ?? "submit"}
            />
          ))}
          <div className="col-span-2 flex gap-2 justify-end mt-2">
            <Button type="button" variant="outline" onClick={() => setInputModalOpen(false)}>Batal</Button>
            <Button id="submit" type="submit">Simpan Nilai</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
