import React from "react";
import { CheckCircle2, AlertTriangle, Download, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Transaksi {
  id: number;
  tanggal: string;
  jumlah: number;
  keterangan: string;
}

const DATA = {
  totalTagihan: 3_500_000,
  sudahBayar: 1_500_000,
  status: "cicil" as "lunas" | "cicil",
  layakSertifikat: false,
  transaksi: [
    { id: 1, tanggal: "30 Agu 2025", jumlah: 1_000_000, keterangan: "Cicilan ke-1" },
    { id: 2, tanggal: "01 Sep 2025", jumlah: 500_000,   keterangan: "Cicilan ke-2" },
  ] as Transaksi[],
};

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
}

export default function KeuanganSiswaPage() {
  const sisa = DATA.totalTagihan - DATA.sudahBayar;
  const progress = Math.round((DATA.sudahBayar / DATA.totalTagihan) * 100);
  const lunas = DATA.status === "lunas";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Keuangan &amp; Sertifikat</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Rincian tagihan dan status sertifikat.</p>
      </div>

      {/* Tagihan Card */}
      <section aria-label="Ringkasan tagihan">
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Total Tagihan</p>
              <p className="text-2xl font-bold text-[#F9FAFB] leading-none mt-1">{formatRp(DATA.totalTagihan)}</p>
            </div>
            <Badge variant={lunas ? "success" : "warning"}>{lunas ? "Lunas" : "Cicilan"}</Badge>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[11px] text-[#9CA3AF] mb-1.5">
              <span>Sudah dibayar: {formatRp(DATA.sudahBayar)}</span>
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
                Sisa: {formatRp(sisa)}
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
        <div className="flex flex-col gap-2">
          {DATA.transaksi.map((t) => (
            <div key={t.id} className="flex items-center gap-3 bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#D1D5DB]">{t.keterangan}</p>
                <p className="text-[11px] text-[#6B7280]">{t.tanggal}</p>
              </div>
              <p className="text-xs font-bold text-[#10B981] shrink-0">{formatRp(t.jumlah)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* E-Sertifikat */}
      <section aria-label="Download e-sertifikat">
        <div className={`rounded-xl border p-5 flex flex-col gap-3 ${DATA.layakSertifikat ? "border-[#10B981]/30 bg-[#10B981]/8" : "border-[#1F2937] bg-[#111827]"}`}>
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl border flex items-center justify-center ${DATA.layakSertifikat ? "border-[#10B981]/30 bg-[#10B981]/15" : "border-[#374151] bg-[#0B0F17]"}`}>
              <Download className={`h-4 w-4 ${DATA.layakSertifikat ? "text-[#10B981]" : "text-[#6B7280]"}`} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#F9FAFB]">E-Sertifikat Kompetensi</p>
              <p className="text-[11px] text-[#6B7280]">
                {DATA.layakSertifikat ? "Siap diunduh!" : "Belum tersedia — selesaikan semua syarat"}
              </p>
            </div>
          </div>

          {!DATA.layakSertifikat && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" aria-hidden="true" />
                <span className="text-[#F59E0B]">Nilai harian semua kriteria ≥ 80</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" aria-hidden="true" />
                <span className="text-[#F59E0B]">Nilai ujian akhir lulus</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" aria-hidden="true" />
                <span className="text-[#F59E0B]">Pembayaran lunas</span>
              </div>
            </div>
          )}

          <button
            disabled={!DATA.layakSertifikat}
            className="h-10 w-full rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              enabled:bg-[#10B981] enabled:hover:bg-[#059669] enabled:text-white"
            aria-disabled={!DATA.layakSertifikat}
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Unduh Sertifikat PDF
          </button>
        </div>
      </section>
    </div>
  );
}
