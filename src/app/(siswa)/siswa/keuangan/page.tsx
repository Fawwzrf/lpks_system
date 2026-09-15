"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Wallet, Award } from "lucide-react";
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
  const [nilaiLengkap, setNilaiLengkap] = useState(false);
  const [ujianLulus, setUjianLulus] = useState(false);

  useEffect(() => {
    async function loadKeuangan() {
      try {
        const resMe = await fetch("/api/v1/auth/me");
        if (!resMe.ok) return;
        const jsonMe = await resMe.json();
        const id = jsonMe.data?.user?.siswa?.id;
        if (!id) return;

        const resKeu = await fetch(`/api/v1/keuangan/rekap/${id}`);
        if (resKeu.ok) {
          const jsonKeu = await resKeu.json();
          setData(jsonKeu.data);
        }

        // Cek kelayakan nilai harian
        const resNilai = await fetch(`/api/v1/penilaian?siswa_id=${id}`);
        if (resNilai.ok) {
          const jsonNilai = await resNilai.json();
          setNilaiLengkap(!!jsonNilai.data?.ringkasan_kelayakan?.siap_ujian);
        }

        // Cek kelulusan ujian internal
        const resUjian = await fetch(`/api/v1/ujian/${id}`);
        if (resUjian.ok) {
          const jsonUjian = await resUjian.json();
          setUjianLulus(!!jsonUjian.data?.is_lulus);
        }
      } catch (err) {
        console.error("Gagal memuat keuangan siswa:", err);
      } finally {
        setLoading(false);
      }
    }

    loadKeuangan();
  }, []);

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

  const layakSertifikat = lunas && nilaiLengkap && ujianLulus;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Keuangan</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Rincian tagihan pelatihan dan status kelulusan sertifikat.</p>
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

      {/* Status Sertifikat Kelulusan */}
      <section aria-label="Status sertifikat kelulusan">
        <div className={`rounded-xl border p-5 flex flex-col gap-3 ${layakSertifikat ? "border-[#10B981]/30 bg-[#10B981]/8" : "border-[#1F2937] bg-[#111827]"}`}>
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl border flex items-center justify-center ${layakSertifikat ? "border-[#10B981]/30 bg-[#10B981]/15" : "border-[#374151] bg-[#0B0F17]"}`}>
              <Award className={`h-4 w-4 ${layakSertifikat ? "text-[#10B981]" : "text-[#6B7280]"}`} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#F9FAFB]">Sertifikat Kelulusan Resmi</p>
              <p className="text-[11px] text-[#6B7280]">
                {layakSertifikat
                  ? "Syarat terpenuhi — sertifikat siap dicetak fisik oleh LPKS."
                  : "Sertifikat dicetak fisik setelah seluruh persyaratan terpenuhi."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center gap-2 text-[11px]">
              {nilaiLengkap ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" aria-hidden="true" />
              )}
              <span className={nilaiLengkap ? "text-[#10B981]" : "text-[#F59E0B]"}>
                Nilai harian semua kriteria ≥ 80 {nilaiLengkap && "✓"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              {ujianLulus ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" aria-hidden="true" />
              )}
              <span className={ujianLulus ? "text-[#10B981]" : "text-[#F59E0B]"}>
                Lulus Ujian Internal Pengelasan {ujianLulus && "✓"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              {lunas ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" aria-hidden="true" />
              )}
              <span className={lunas ? "text-[#10B981]" : "text-[#F59E0B]"}>
                Status keuangan lunas 100% {lunas && "✓"}
              </span>
            </div>
          </div>

          {layakSertifikat ? (
            <div className="mt-1 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 p-2.5 text-center text-xs text-[#10B981] font-medium">
              Data kelulusan Anda siap dicetak fisik via percetakan LPKS Sumbu Hidup.
            </div>
          ) : (
            <div className="mt-1 rounded-lg bg-[#0B0F17] border border-[#1F2937] p-2.5 text-center text-[11px] text-[#9CA3AF]">
              Sertifikat fisik diterbitkan dan diserahkan langsung oleh LPKS setelah selesai dicetak.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
