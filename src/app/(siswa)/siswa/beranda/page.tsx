"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, CheckCircle2, AlertTriangle, Wallet, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";

interface StudentDashboardData {
  nama: string;
  program: string;
  siswa_id: string;
  kehadiran: { hadir: number; total: number; persen: number };
  keuangan: { status: "Lunas" | "Cicil"; sisa: number };
  layakUjian: boolean;
  kriteriaTerpenuhi: number;
  totalKriteria: number;
  aiRingkasan: string;
}

export default function BerandaPage() {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        // 1. Get current auth & student info
        const resMe = await fetch("/api/v1/auth/me");
        if (!resMe.ok) return;
        const jsonMe = await resMe.json();
        const user = jsonMe.data?.user;
        const siswa = user?.siswa;
        const siswaId = siswa?.id;

        if (!siswaId) {
          setData({
            nama: user?.nama || "Siswa",
            program: "Program Pelatihan Pengelasan",
            siswa_id: "",
            kehadiran: { hadir: 0, total: 25, persen: 0 },
            keuangan: { status: "Cicil", sisa: 0 },
            layakUjian: false,
            kriteriaTerpenuhi: 0,
            totalKriteria: 5,
            aiRingkasan: "Belum ada evaluasi AI. Terus ikuti sesi pelatihan dan catat presensi setiap hari.",
          });
          return;
        }

        // 2. Fetch parallel: Kehadiran, Penilaian, Keuangan, AI Summary
        const [resPresensi, resNilai, resKeuangan, resAi] = await Promise.allSettled([
          fetch(`/api/v1/presensi?siswa_id=${siswaId}&limit=100`),
          fetch(`/api/v1/penilaian?siswa_id=${siswaId}`),
          fetch(`/api/v1/keuangan/rekap/${siswaId}`),
          fetch(`/api/v1/ai/summary/${siswaId}`),
        ]);

        // Parse presensi
        let hadirCount = 0;
        const totalTargetHari = 25; // Standar kurikulum LPKS
        if (resPresensi.status === "fulfilled" && resPresensi.value.ok) {
          const presensiJson = await resPresensi.value.json();
          const list = presensiJson.data || [];
          hadirCount = list.filter((p: { status: string }) => p.status === "Hadir").length;
        }
        const persenKehadiran = Math.min(100, Math.round((hadirCount / totalTargetHari) * 100));

        // Parse penilaian & kelayakan
        let layakUjian = false;
        let kriteriaTerpenuhi = 0;
        let totalKriteria = 5;
        if (resNilai.status === "fulfilled" && resNilai.value.ok) {
          const nilaiJson = await resNilai.value.json();
          layakUjian = !!nilaiJson.data?.ringkasan_kelayakan?.siap_ujian;
          kriteriaTerpenuhi = nilaiJson.data?.ringkasan_kelayakan?.kriteria_terpenuhi || 0;
          totalKriteria = nilaiJson.data?.ringkasan_kelayakan?.total_kriteria || 5;
        }

        // Parse keuangan
        let statusKeuangan: "Lunas" | "Cicil" = "Cicil";
        let sisaTagihan = 0;
        if (resKeuangan.status === "fulfilled" && resKeuangan.value.ok) {
          const keuJson = await resKeuangan.value.json();
          statusKeuangan = keuJson.data?.is_lunas ? "Lunas" : "Cicil";
          sisaTagihan = keuJson.data?.sisa_tagihan || 0;
        }

        // Parse AI Summary
        let aiRingkasan = "Nilai latihan dan konsistensi kehadiran Anda terus dipantau. Pastikan semua kriteria mencapai nilai minimum 80.";
        if (resAi.status === "fulfilled" && resAi.value.ok) {
          const aiJson = await resAi.value.json();
          if (Array.isArray(aiJson.data) && aiJson.data.length > 0) {
            aiRingkasan = aiJson.data[0]?.isi_ringkasan || aiRingkasan;
          }
        }

        setData({
          nama: siswa.nama_lengkap || user.nama || "Siswa",
          program: siswa.program?.nama || "Pelatihan Pengelasan",
          siswa_id: siswaId,
          kehadiran: {
            hadir: hadirCount,
            total: totalTargetHari,
            persen: persenKehadiran,
          },
          keuangan: {
            status: statusKeuangan,
            sisa: sisaTagihan,
          },
          layakUjian,
          kriteriaTerpenuhi,
          totalKriteria,
          aiRingkasan,
        });
      } catch (err) {
        console.error("Gagal memuat beranda siswa:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-xs text-[#6B7280]">
        <Loader2 className="h-6 w-6 animate-spin text-[#DC2626]" />
        <span>Memuat data beranda...</span>
      </div>
    );
  }

  const namaDepan = data?.nama?.split(" ")[0] || "Siswa";
  const { kehadiran, keuangan, layakUjian, aiRingkasan } = data || {
    kehadiran: { hadir: 0, total: 25, persen: 0 },
    keuangan: { status: "Cicil" as const, sisa: 0 },
    layakUjian: false,
    aiRingkasan: "Belum ada catatan evaluasi.",
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Greeting */}
      <div className="pt-1">
        <h1 className="text-lg font-bold text-[#F9FAFB] leading-tight">
          Halo, {namaDepan}! 👋
        </h1>
        <p className="text-xs text-[#6B7280] mt-0.5">{data?.program}</p>
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
          <p className="text-[11px] text-[#6B7280]">{kehadiran.hadir} / {kehadiran.total} hari hadir</p>
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
          <p className="text-[11px] text-[#6B7280]">
            {data?.kriteriaTerpenuhi} dari {data?.totalKriteria} kriteria terpenuhi
          </p>
        </div>

        {/* Keuangan */}
        <div className="col-span-2 rounded-xl border border-[#1F2937] bg-[#111827] p-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center shrink-0">
            <Wallet className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Keuangan</p>
            <p className="text-xs font-semibold text-[#F9FAFB] mt-0.5">
              {keuangan.status === "Lunas" ? "Lunas ✓" : `Sisa ${formatRupiah(keuangan.sisa)}`}
            </p>
          </div>
          <Badge variant={keuangan.status === "Lunas" ? "success" : "warning"}>
            {keuangan.status === "Lunas" ? "Lunas" : "Cicilan"}
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
            <p className="text-xs font-semibold text-[#F9FAFB] mb-1">Ringkasan Evaluasi AI</p>
            <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
              {aiRingkasan}
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
