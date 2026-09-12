"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Download, Wallet, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";
import { formatRupiah, formatDateIndo } from "@/lib/utils";

interface TransaksiItem {
  id: string;
  tgl_bayar: string;
  nominal: number;
  keterangan: string;
  metode_bayar: string;
}

interface KeuanganData {
  total_biaya: number;
  total_terbayar: number;
  sisa_tagihan: number;
  status: "Lunas" | "Cicil";
  is_lunas: boolean;
  riwayat_transaksi: TransaksiItem[];
}

export default function KeuanganSiswaPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<KeuanganData | null>(null);
  const [siswaId, setSiswaId] = useState<string | null>(null);
  const [layakSertifikat, setLayakSertifikat] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);

  useEffect(() => {
    async function loadKeuangan() {
      try {
        const resMe = await fetch("/api/v1/auth/me");
        if (!resMe.ok) return;
        const jsonMe = await resMe.json();
        const id = jsonMe.data?.user?.siswa?.id;
        if (!id) return;

        setSiswaId(id);

        const resKeu = await fetch(`/api/v1/keuangan/rekap/${id}`);
        if (resKeu.ok) {
          const jsonKeu = await resKeu.json();
          setData(jsonKeu.data);
        }

        // Cek kelayakan ujian & nilai untuk sertifikat
        const resNilai = await fetch(`/api/v1/penilaian?siswa_id=${id}`);
        if (resNilai.ok) {
          const jsonNilai = await resNilai.json();
          const siap = !!jsonNilai.data?.ringkasan_kelayakan?.siap_ujian;
          // Sertifikat butuh lunas + nilai siap
          setLayakSertifikat(siap && (jsonMe.data?.user?.siswa?.status === "lulus" || false));
        }
      } catch (err) {
        console.error("Gagal memuat keuangan siswa:", err);
      } finally {
        setLoading(false);
      }
    }

    loadKeuangan();
  }, []);

  async function downloadSertifikat() {
    if (!siswaId) return;
    setDownloading(true);
    setCertError(null);
    try {
      const res = await fetch(`/api/v1/sertifikat/${siswaId}`);
      if (!res.ok) {
        const errJson = await res.json();
        setCertError(errJson.error?.message || "Sertifikat belum dapat diunduh.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Sertifikat_Pengelasan_LPKS.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setCertError("Gagal mengunduh sertifikat. Periksa koneksi internet Anda.");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5 animate-pulse">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48 bg-[#1F2937]" />
          <Skeleton className="h-3.5 w-64 bg-[#1F2937]/60" />
        </div>
        <Skeleton className="h-20 w-full rounded-2xl bg-[#1F2937]/50" />
        <CardSkeleton count={3} />
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col gap-3">
          <Skeleton className="h-4 w-36 bg-[#1F2937]" />
          <div className="divide-y divide-[#1F2937]/60">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="py-3 flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-32 bg-[#1F2937]" />
                  <Skeleton className="h-2.5 w-20 bg-[#1F2937]/60" />
                </div>
                <Skeleton className="h-4 w-24 bg-[#1F2937]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalTagihan = data?.total_biaya || 0;
  const sudahBayar = data?.total_terbayar || 0;
  const sisa = data?.sisa_tagihan || 0;
  const progress = totalTagihan > 0 ? Math.min(100, Math.round((sudahBayar / totalTagihan) * 100)) : 0;
  const lunas = data?.is_lunas || (sisa === 0 && totalTagihan > 0);
  const transaksi = data?.riwayat_transaksi || [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Keuangan &amp; Sertifikat</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Rincian tagihan pelatihan dan status sertifikat kelulusan.</p>
      </div>

      {/* Tagihan Card */}
      <section aria-label="Ringkasan tagihan">
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Total Biaya Pelatihan</p>
              <p className="text-2xl font-bold text-[#F9FAFB] leading-none mt-1">{formatRupiah(totalTagihan)}</p>
            </div>
            <Badge variant={lunas ? "success" : "warning"}>{lunas ? "Lunas" : "Cicilan"}</Badge>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[11px] text-[#9CA3AF] mb-1.5">
              <span>Sudah dibayar: {formatRupiah(sudahBayar)}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#0B0F17] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#DC2626] transition-all duration-700"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            {!lunas && (
              <p className="text-xs text-[#F59E0B] font-medium mt-2">
                Sisa Tagihan: {formatRupiah(sisa)}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Riwayat Transaksi */}
      <section aria-label="Riwayat pembayaran">
        <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3 flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5" aria-hidden="true" /> Riwayat Pembayaran
        </h2>
        {transaksi.length === 0 ? (
          <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-6 text-center text-xs text-[#6B7280]">
            Belum ada catatan transaksi pembayaran.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {transaksi.map((t) => (
              <div key={t.id} className="flex items-center gap-3 bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#D1D5DB]">{t.keterangan || `Pembayaran (${t.metode_bayar})`}</p>
                  <p className="text-[11px] text-[#6B7280]">{formatDateIndo(t.tgl_bayar)}</p>
                </div>
                <p className="text-xs font-bold text-[#10B981] shrink-0">{formatRupiah(Number(t.nominal))}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* E-Sertifikat */}
      <section aria-label="Download e-sertifikat">
        <div className={`rounded-xl border p-5 flex flex-col gap-3 ${layakSertifikat ? "border-[#10B981]/30 bg-[#10B981]/8" : "border-[#1F2937] bg-[#111827]"}`}>
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl border flex items-center justify-center ${layakSertifikat ? "border-[#10B981]/30 bg-[#10B981]/15" : "border-[#374151] bg-[#0B0F17]"}`}>
              <Download className={`h-4 w-4 ${layakSertifikat ? "text-[#10B981]" : "text-[#6B7280]"}`} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#F9FAFB]">E-Sertifikat Kompetensi</p>
              <p className="text-[11px] text-[#6B7280]">
                {layakSertifikat ? "Syarat terpenuhi! Siap diunduh." : "Selesaikan seluruh persyaratan kelulusan"}
              </p>
            </div>
          </div>

          {!layakSertifikat && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" aria-hidden="true" />
                <span className="text-[#F59E0B]">Nilai harian semua kriteria ≥ 80</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" aria-hidden="true" />
                <span className="text-[#F59E0B]">Lulus Ujian Internal Pengelasan</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" aria-hidden="true" />
                <span className="text-[#F59E0B]">Status keuangan lunas 100%</span>
              </div>
            </div>
          )}

          {certError && (
            <p className="text-xs text-[#F43F5E] bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-lg p-2.5">
              {certError}
            </p>
          )}

          <button
            onClick={downloadSertifikat}
            disabled={downloading}
            className="h-10 w-full rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all bg-[#DC2626] hover:bg-[#B91C1C] text-white disabled:opacity-50"
          >
            {downloading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Mengunduh Sertifikat...</>
            ) : (
              <><Download className="h-4 w-4" aria-hidden="true" /> Unduh Sertifikat PDF</>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
