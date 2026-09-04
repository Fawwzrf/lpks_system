"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Clock, Info, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleEnterToNextField } from "@/lib/form-utils";

interface KriteriaItem {
  id: string;
  nama_kriteria: string;
  batas_lulus: number;
  deskripsi?: string;
}

interface RiwayatGrouped {
  tanggal: string;
  avg: number;
  created_by: string;
  count: number;
}

export default function NilaiPage() {
  const [kriteriaList, setKriteriaList] = useState<KriteriaItem[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [riwayat, setRiwayat] = useState<RiwayatGrouped[]>([]);

  const loadData = useCallback(async () => {
    try {
      // 1. Ambil kriteria master
      const resKriteria = await fetch("/api/v1/master/kriteria");
      let kList: KriteriaItem[] = [];
      if (resKriteria.ok) {
        const json = await resKriteria.json();
        kList = json.data || [];
      }
      if (kList.length === 0) {
        kList = [
          { id: "persiapan", nama_kriteria: "Persiapan", batas_lulus: 80, deskripsi: "Kelengkapan alat & APD" },
          { id: "proses",    nama_kriteria: "Proses",    batas_lulus: 80, deskripsi: "Teknik pengelasan" },
          { id: "k3",        nama_kriteria: "K3",        batas_lulus: 80, deskripsi: "Keselamatan & kesehatan kerja" },
          { id: "kerapihan", nama_kriteria: "Kerapihan", batas_lulus: 80, deskripsi: "Kebersihan & kerapihan hasil" },
          { id: "hasil-akhir", nama_kriteria: "Hasil Akhir", batas_lulus: 80, deskripsi: "Kualitas hasil lasan" },
        ];
      }
      setKriteriaList(kList);

      // 2. Ambil riwayat penilaian siswa
      const resNilai = await fetch("/api/v1/penilaian");
      if (resNilai.ok) {
        const json = await resNilai.json();
        const raw = json.data?.riwayat_mentah || [];
        // Group by tanggal
        const byDate: Record<string, { total: number; count: number; created_by: string }> = {};
        raw.forEach((r: { tanggal: string; nilai: number; created_by?: string }) => {
          if (!byDate[r.tanggal]) {
            byDate[r.tanggal] = { total: 0, count: 0, created_by: r.created_by || "siswa" };
          }
          byDate[r.tanggal].total += r.nilai;
          byDate[r.tanggal].count += 1;
        });

        const list: RiwayatGrouped[] = Object.entries(byDate).map(([tanggal, d]) => ({
          tanggal,
          avg: Math.round(d.total / d.count),
          created_by: d.created_by,
          count: d.count,
        })).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

        setRiwayat(list);
      }
    } catch (err) {
      console.error("Gagal memuat data penilaian:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleChange(kriteriaId: string, val: string) {
    const num = parseInt(val, 10);
    if (val !== "" && (isNaN(num) || num < 0 || num > 100)) return;
    setValues((prev) => ({ ...prev, [kriteriaId]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);

    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const payloadPenilaian = kriteriaList.map((k) => ({
        kriteria_id: k.id,
        nilai: parseInt(values[k.id] || "0", 10),
        catatan: "Input Mandiri Siswa",
      }));

      const res = await fetch("/api/v1/penilaian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal: todayStr,
          penilaian: payloadPenilaian,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error?.message || "Gagal menyimpan penilaian.");
        return;
      }

      setSaved(true);
      await loadData();
    } catch {
      setErrorMsg("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  const allFilled = kriteriaList.length > 0 && kriteriaList.every((k) => values[k.id] !== "" && values[k.id] !== undefined);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-xs text-[#6B7280]">
        <Loader2 className="h-6 w-6 animate-spin text-[#DC2626]" />
        <span>Memuat kriteria penilaian...</span>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <CheckCircle2 className="h-12 w-12 text-[#10B981]" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-[#F9FAFB]">Nilai Berhasil Disimpan!</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Data Anda telah tercatat dan menunggu verifikasi instruktur.</p>
        </div>
        <Button onClick={() => { setValues({}); setSaved(false); }}>Input Nilai Baru</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Input Nilai Mandiri</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Isi nilai per kriteria untuk sesi praktek hari ini.</p>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2.5 bg-[#111827] border border-[#374151] rounded-xl p-3">
        <Info className="h-4 w-4 text-[#38BDF8] shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
          Nilai 0–100. Standar kelulusan adalah <strong className="text-[#10B981]">≥ 80</strong>. Gunakan tombol <kbd className="text-[#D1D5DB] bg-[#0B0F17] border border-[#374151] rounded px-1">Enter</kbd> untuk berpindah antar kolom.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs text-[#F43F5E] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        data-form-container
        onKeyDown={handleEnterToNextField}
        className="flex flex-col gap-3"
        noValidate
      >
        {kriteriaList.map((k, i) => {
          const val = values[k.id] ?? "";
          const num = parseInt(val, 10);
          const valid = val === "" || (!isNaN(num) && num >= (k.batas_lulus || 80));
          return (
            <div key={k.id} className="rounded-xl border border-[#1F2937] bg-[#111827] p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#D1D5DB] leading-tight">{k.nama_kriteria}</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">{k.deskripsi || `Batas minimum kelulusan: ${k.batas_lulus}`}</p>
              </div>
              <input
                id={`nilai-${k.id}`}
                name={k.nama_kriteria}
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={val}
                onChange={(e) => handleChange(k.id, e.target.value)}
                placeholder="—"
                data-next={kriteriaList[i + 1]
                  ? `nilai-${kriteriaList[i + 1].id}`
                  : "submit"}
                className={`h-11 w-16 rounded-xl border text-center text-sm font-bold bg-[#0B0F17] text-[#F9FAFB] focus:outline-none transition-colors ${
                  val !== "" && !valid
                    ? "border-[#F43F5E] focus:border-[#F43F5E]"
                    : val !== "" && valid
                      ? "border-[#10B981] text-[#10B981] focus:border-[#10B981]"
                      : "border-[#374151] focus:border-[#DC2626]"
                }`}
                aria-label={`Nilai ${k.nama_kriteria}`}
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
          {saving ? "Menyimpan Nilai..." : "Kirim Nilai Praktek"}
        </Button>
      </form>

      {/* Riwayat */}
      <section aria-label="Riwayat nilai">
        <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Riwayat Input Terbaru
        </h2>
        {riwayat.length === 0 ? (
          <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-6 text-center text-xs text-[#6B7280]">
            Belum ada riwayat penilaian praktek.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {riwayat.map((r) => (
              <div key={r.tanggal} className="rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#D1D5DB]">{r.tanggal}</p>
                  <p className={`text-[11px] mt-0.5 ${r.created_by === "superadmin" ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                    {r.created_by === "superadmin" ? "✓ Diverifikasi Instruktur" : "⏳ Input Mandiri Siswa"}
                  </p>
                </div>
                <div className={`text-xl font-bold ${r.avg >= 80 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                  {r.avg}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
