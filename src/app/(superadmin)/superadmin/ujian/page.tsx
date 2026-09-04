"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Award, CheckCircle2, XCircle, AlertTriangle, Printer, Plus, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { handleEnterToNextField } from "@/lib/form-utils";

interface SiswaUjianItem {
  id: string;
  nomor_induk: string;
  nama_lengkap: string;
  program_nama: string;
  total_biaya: number;
  total_terbayar: number;
  is_lunas: boolean;
  nilai_harian_ok: boolean;
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
  const [data, setData] = useState<SiswaUjianItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [inputTarget, setInputTarget] = useState<SiswaUjianItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/v1/ujian");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? (typeof json.error === "string" ? json.error : "Gagal memuat data ujian."));
      }
      setData(json.data || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan memuat data ujian.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        catatan_penguji: scores.catatan_penguji.trim() || undefined,
      };

      const res = await fetch("/api/v1/ujian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? (typeof json.error === "string" ? json.error : "Gagal menyimpan nilai ujian."));
      }

      setSuccessMsg(json.data?.message || "Nilai ujian berhasil disimpan!");
      setInputModalOpen(false);
      await fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrintSertifikat(siswaId: string) {
    window.open(`/api/v1/sertifikat/${siswaId}`, "_blank");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Ujian &amp; Sertifikat</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Gate-check kelayakan ujian dan verifikasi pencetakan sertifikat PDF resmi.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Segarkan
        </Button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-[#F43F5E]/10 border border-[#F43F5E]/20 text-[#F43F5E] text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && data.length === 0 ? (
        <div className="p-12 text-center text-xs text-[#6B7280] flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-[#DC2626]" />
          <span>Memuat data siswa dan evaluasi gate check ujian...</span>
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#1F2937] p-8 text-center text-xs text-[#6B7280]">
          Belum ada data siswa terdaftar.
        </div>
      ) : (
        /* Siswa Cards Grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => {
            const hasUjian = !!s.ujian;
            const avg = hasUjian
              ? Math.round(
                  (s.ujian!.teori +
                    s.ujian!.root +
                    s.ujian!.hotpass +
                    s.ujian!.filler +
                    s.ujian!.capping +
                    s.ujian!.gerinda) /
                    6
                )
              : null;

            const isUjianLulus = !!s.ujian?.is_lulus;
            const gateSertifikat = s.is_lunas && isUjianLulus;

            return (
              <div
                key={s.id}
                className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col gap-4 shadow-sm"
              >
                {/* Header Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#F9FAFB] truncate">{s.nama_lengkap}</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
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
                {s.ujian && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {KRITERIA_LIST.map(({ key, label }) => {
                      const v = s.ujian ? (s.ujian as unknown as Record<string, number>)[key] : 0;
                      const ok = v >= 80;
                      return (
                        <div key={key} className="rounded-lg bg-[#0B0F17] border border-[#1F2937] p-2 text-center">
                          <p className="text-[9px] text-[#6B7280] truncate" title={label}>
                            {label.split(" ")[0]}
                          </p>
                          <p className={`text-sm font-bold ${ok ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                            {v}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-auto pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleOpenInput(s)}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {s.ujian ? "Ubah Nilai" : "Input Nilai"}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white disabled:opacity-40"
                    disabled={!gateSertifikat}
                    onClick={() => handlePrintSertifikat(s.id)}
                    title={
                      !gateSertifikat
                        ? "Syarat sertifikat belum terpenuhi (wajib Lunas dan Nilai Ujian Lulus)"
                        : "Cetak Sertifikat Kelulusan PDF"
                    }
                  >
                    <Printer className="h-3.5 w-3.5" aria-hidden="true" /> Sertifikat
                  </Button>
                </div>

                {!gateSertifikat && (
                  <div className="flex items-center gap-1.5 text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg px-2.5 py-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      {!s.is_lunas
                        ? "Keuangan belum lunas"
                        : !isUjianLulus
                        ? "Nilai ujian belum lulus (min 80 tiap kriteria)"
                        : "Syarat belum lengkap"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Input Nilai Ujian */}
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
                value={scores[key as keyof typeof scores]}
                onChange={(e) => setScores({ ...scores, [key]: e.target.value })}
                placeholder="80"
                data-next={KRITERIA_LIST[i + 1]?.key ?? "catatan"}
              />
            </div>
          ))}

          <div className="col-span-2">
            <Input
              id="catatan"
              label="Catatan Penguji (Opsional)"
              name="catatan_penguji"
              value={scores.catatan_penguji}
              onChange={(e) => setScores({ ...scores, catatan_penguji: e.target.value })}
              placeholder="Misal: Penetrasi root sangat rapi, capping sedikit tebal"
              data-next="submit-btn"
            />
          </div>

          <div className="col-span-2 flex gap-2 justify-end mt-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setInputModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              id="submit-btn"
              type="submit"
              disabled={submitting}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                </>
              ) : (
                "Simpan Nilai Ujian"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
