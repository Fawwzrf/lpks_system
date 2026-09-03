import React from "react";
import Link from "next/link";
import { MapPin, CheckCircle2, AlertTriangle, Wallet, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Status data placeholder — Tahap 5 akan diganti fetch API
const STATUS = {
  nama: "Budi Santoso",
  program: "Pengelasan SMAW",
  kehadiran: { hadir: 22, total: 25, persen: 88 },
  keuangan: { status: "cicil", sisa: 2000000 },
  layakUjian: false,
};

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
}

export default function BerandaPage() {
  const { kehadiran, keuangan, layakUjian } = STATUS;

  return (
    <div className="flex flex-col gap-4">
      {/* Greeting */}
      <div className="pt-1">
        <h1 className="text-lg font-bold text-[#F9FAFB] leading-tight">
          Halo, {STATUS.nama.split(" ")[0]}! 👋
        </h1>
        <p className="text-xs text-[#6B7280] mt-0.5">{STATUS.program}</p>
      </div>

      {/* Status Ringkasan Grid */}
      <section aria-label="Ringkasan status" className="grid grid-cols-2 gap-3">
        {/* Kehadiran */}
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[#9CA3AF]">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Kehadiran</span>
          </div>
          <p className="text-2xl font-bold text-[#F9FAFB] leading-none">{kehadiran.persen}%</p>
          <p className="text-[11px] text-[#6B7280]">{kehadiran.hadir} / {kehadiran.total} hari</p>
        </div>

        {/* Kelayakan Ujian */}
        <div className={`rounded-xl border p-4 flex flex-col gap-2 ${layakUjian ? "border-[#10B981]/30 bg-[#10B981]/8" : "border-[#F59E0B]/30 bg-[#F59E0B]/8"}`}>
          <div className={`flex items-center gap-1.5 ${layakUjian ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
            {layakUjian
              ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              : <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
            <span className="text-[10px] font-semibold uppercase tracking-wide">Ujian</span>
          </div>
          <p className={`text-sm font-bold leading-tight ${layakUjian ? "text-[#10B981]" : "text-[#F9FAFB]"}`}>
            {layakUjian ? "Layak Ujian" : "Belum Layak"}
          </p>
          <p className="text-[11px] text-[#6B7280]">Semua kriteria harus ≥ 80</p>
        </div>

        {/* Keuangan */}
        <div className="col-span-2 rounded-xl border border-[#1F2937] bg-[#111827] p-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center shrink-0">
            <Wallet className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Keuangan</p>
            <p className="text-xs font-semibold text-[#F9FAFB] mt-0.5">
              {keuangan.status === "lunas" ? "Lunas ✓" : `Sisa ${formatRp(keuangan.sisa)}`}
            </p>
          </div>
          <Badge variant={keuangan.status === "lunas" ? "success" : "warning"}>
            {keuangan.status === "lunas" ? "Lunas" : "Cicilan"}
          </Badge>
        </div>
      </section>

      {/* AI Weekly Insight */}
      <section aria-label="AI Weekly Insight">
        <div className="rounded-xl border border-[#DC2626]/20 bg-[#DC2626]/8 p-4 flex gap-3">
          <div className="h-8 w-8 rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-[#DC2626]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#F9FAFB] mb-1">Ringkasan Mingguan AI</p>
            <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
              Nilai kamu minggu ini stabil. Perlu sedikit peningkatan di kriteria <strong className="text-[#F9FAFB]">Kerapihan</strong>. Pertahankan konsistensi hadir!
            </p>
          </div>
        </div>
      </section>

      {/* Quick action */}
      <Link
        href="/siswa/presensi"
        className="flex items-center gap-3 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 hover:bg-[#DC2626]/15 p-4 transition-all"
      >
        <MapPin className="h-5 w-5 text-[#DC2626]" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-[#F9FAFB]">Absen Sekarang</p>
          <p className="text-[11px] text-[#9CA3AF]">Tap untuk buka halaman presensi GPS</p>
        </div>
        <span className="text-[#DC2626] text-lg leading-none">→</span>
      </Link>
    </div>
  );
}
