"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Award,
  TrendingUp,
  Calendar,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const WARNA_PALETTE = [
  "#DC2626", // Merah Spark
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#38BDF8", // Sky
  "#818CF8", // Indigo
  "#EC4899", // Pink
  "#A855F7", // Purple
];

interface KriteriaStatus {
  nama: string;
  nilai_tertinggi: number;
  lulus: boolean;
}

interface UjianData {
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
}

interface RiwayatItem {
  id: string;
  tanggal: string;
  nilai: number;
  created_by?: string;
  catatan?: string;
  kriteria?: {
    id: string;
    nama_kriteria: string;
    batas_lulus: number;
  };
}

function KompetensiIcon({ value, lulus }: { value: number; lulus: boolean }) {
  if (lulus || value >= 80) return <CheckCircle2 className="h-4 w-4 text-[#10B981]" aria-label="Kompeten" />;
  if (value >= 70) return <AlertTriangle className="h-4 w-4 text-[#F59E0B]" aria-label="Perlu peningkatan" />;
  return <XCircle className="h-4 w-4 text-[#F43F5E]" aria-label="Belum kompeten" />;
}

export default function TranskripPage() {
  const [focusKriteria, setFocusKriteria] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [siswaId, setSiswaId] = useState<string | null>(null);
  const [siswaInfo, setSiswaInfo] = useState<{
    nama_lengkap: string;
    nomor_induk: string;
    program?: { nama: string };
  } | null>(null);
  const [trendData, setTrendData] = useState<Array<Record<string, string | number>>>([]);
  const [statusKelayakan, setStatusKelayakan] = useState<Record<string, KriteriaStatus>>({});
  const [siapUjian, setSiapUjian] = useState(false);
  const [kriteriaKeys, setKriteriaKeys] = useState<string[]>([]);
  const [ujianData, setUjianData] = useState<UjianData | null>(null);
  const [riwayatMentah, setRiwayatMentah] = useState<RiwayatItem[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    async function loadTranskrip() {
      try {
        const res = await fetch("/api/v1/penilaian");
        if (res.ok) {
          const json = await res.json();
          const d = json.data;
          const rawTrend = d?.grafik_tren || [];
          const status = d?.status_kelayakan || {};
          const keys = Object.keys(status);
          const currentSiswaId = d?.siswa_id || null;

          setTrendData(rawTrend);
          setStatusKelayakan(status);
          setKriteriaKeys(keys);
          setSiapUjian(!!d?.ringkasan_kelayakan?.siap_ujian);
          setSiswaId(currentSiswaId);
          setSiswaInfo(d?.siswa || null);
          setRiwayatMentah(d?.riwayat_mentah || []);

          // Ambil hasil ujian internal jika ada
          if (currentSiswaId) {
            try {
              const resUjian = await fetch(`/api/v1/ujian/${currentSiswaId}`);
              if (resUjian.ok) {
                const jsonUjian = await resUjian.json();
                setUjianData(jsonUjian.data || null);
              }
            } catch {
              // Ujian belum ada, tidak masalah
            }
          }
        }
      } catch (err) {
        console.error("Gagal memuat transkrip penilaian:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTranskrip();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-5 animate-pulse pb-10">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40 bg-[#1F2937]" />
          <Skeleton className="h-3.5 w-60 bg-[#1F2937]/60" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#1F2937] bg-[#111827] p-3 flex flex-col gap-1.5">
              <Skeleton className="h-3 w-16 bg-[#1F2937]" />
              <Skeleton className="h-5 w-10 bg-[#1F2937]" />
            </div>
          ))}
        </div>
        <Skeleton className="h-32 w-full rounded-xl bg-[#1F2937]/50" />
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 h-64 flex flex-col gap-3">
          <Skeleton className="h-4 w-36 bg-[#1F2937]" />
          <Skeleton className="h-full w-full rounded-lg bg-[#1F2937]/40" />
        </div>
      </div>
    );
  }

  const kriteriaList = kriteriaKeys.length > 0 ? kriteriaKeys : ["persiapan", "proses", "k3", "kerapihan", "hasil akhir"];

  // Metrik Agregat Transkrip
  const scores = riwayatMentah.map((r) => Number(r.nilai || 0));
  const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const uniqueDatesCount = new Set(riwayatMentah.map((r) => r.tanggal)).size;
  const kriteriaKompetenCount = Object.values(statusKelayakan).filter((item) => item.lulus || item.nilai_tertinggi >= 80).length;

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Header & Unduh Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Transkrip Penilaian Praktek</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {siswaInfo?.program?.nama || "Pelatihan Pengelasan"} • No. Induk: {siswaInfo?.nomor_induk || "—"}
          </p>
        </div>

        {siswaId && (
          <a
            href={`/api/v1/excel/export?modul=penilaian&siswa_id=${siswaId}`}
            download
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-[#DC2626] to-[#B91C1C] hover:brightness-110 active:scale-[0.98] text-xs font-bold text-white shadow-md shadow-red-900/25 transition-all self-start sm:self-auto cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Unduh Transkrip (.xlsx)</span>
          </a>
        )}
      </div>

      {/* Ringkasan Metrik Transkrip */}
      <section aria-label="Metrik transkrip">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3 text-center">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Rata-Rata Nilai</p>
            <p className={`text-lg font-bold font-mono mt-1 ${avgScore >= 80 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
              {avgScore > 0 ? avgScore : "—"}
            </p>
            <p className="text-[10px] text-[#6B7280] mt-0.5">Standar KKM: 80</p>
          </div>

          <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3 text-center">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Nilai Tertinggi</p>
            <p className="text-lg font-bold font-mono text-[#10B981] mt-1">
              {maxScore > 0 ? maxScore : "—"}
            </p>
            <p className="text-[10px] text-[#6B7280] mt-0.5">Rekor praktek</p>
          </div>

          <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3 text-center">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Hari Praktek</p>
            <p className="text-lg font-bold font-mono text-[#F9FAFB] mt-1">
              {uniqueDatesCount} Hari
            </p>
            <p className="text-[10px] text-[#6B7280] mt-0.5">{riwayatMentah.length} sesi tercatat</p>
          </div>

          <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3 text-center">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Kriteria Lulus</p>
            <p className={`text-lg font-bold font-mono mt-1 ${kriteriaKompetenCount >= 5 ? "text-[#10B981]" : "text-[#DC2626]"}`}>
              {kriteriaKompetenCount} / {kriteriaList.length}
            </p>
            <p className="text-[10px] text-[#6B7280] mt-0.5">{kriteriaKompetenCount >= 5 ? "Semua kriteria ok" : "Belum lengkap"}</p>
          </div>
        </div>
      </section>

      {/* Hasil Ujian Internal Pengelasan */}
      <section aria-label="Hasil Ujian Internal">
        <div className={`rounded-xl border p-4 flex flex-col gap-3 ${
          ujianData
            ? ujianData.is_lulus
              ? "border-[#10B981]/30 bg-[#10B981]/8"
              : "border-[#F43F5E]/30 bg-[#F43F5E]/8"
            : siapUjian
              ? "border-[#38BDF8]/30 bg-[#38BDF8]/8"
              : "border-[#1F2937] bg-[#111827]"
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                ujianData
                  ? ujianData.is_lulus
                    ? "bg-[#10B981]/20 text-[#10B981]"
                    : "bg-[#F43F5E]/20 text-[#F43F5E]"
                  : siapUjian
                    ? "bg-[#38BDF8]/20 text-[#38BDF8]"
                    : "bg-[#1F2937] text-[#9CA3AF]"
              }`}>
                <Award className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#F9FAFB]">Hasil Ujian Internal Pengelasan</h2>
                <p className="text-[11px] text-[#9CA3AF]">
                  {ujianData
                    ? `Diuji pada ${ujianData.tgl_ujian}`
                    : siapUjian
                      ? "Memenuhi syarat — Siap dijadwalkan ujian internal"
                      : "Selesaikan bimbingan praktek harian untuk mengikuti ujian"}
                </p>
              </div>
            </div>

            <Badge
              variant={
                ujianData
                  ? ujianData.is_lulus
                    ? "success"
                    : "destructive"
                  : siapUjian
                    ? "spark"
                    : "neutral"
              }
            >
              {ujianData
                ? ujianData.is_lulus
                  ? "Lulus Ujian"
                  : "Belum Lulus"
                : siapUjian
                  ? "Siap Ujian"
                  : "Dalam Bimbingan"}
            </Badge>
          </div>

          {ujianData ? (
            <div className="flex flex-col gap-2.5 pt-1">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                <div className="p-2 rounded-lg bg-[#0B0F17] border border-[#1F2937]">
                  <p className="text-[10px] text-[#9CA3AF]">Teori</p>
                  <p className="text-xs font-bold font-mono text-white mt-0.5">{ujianData.teori}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#0B0F17] border border-[#1F2937]">
                  <p className="text-[10px] text-[#9CA3AF]">Root</p>
                  <p className="text-xs font-bold font-mono text-white mt-0.5">{ujianData.root}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#0B0F17] border border-[#1F2937]">
                  <p className="text-[10px] text-[#9CA3AF]">Hot Pass</p>
                  <p className="text-xs font-bold font-mono text-white mt-0.5">{ujianData.hotpass}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#0B0F17] border border-[#1F2937]">
                  <p className="text-[10px] text-[#9CA3AF]">Filler</p>
                  <p className="text-xs font-bold font-mono text-white mt-0.5">{ujianData.filler}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#0B0F17] border border-[#1F2937]">
                  <p className="text-[10px] text-[#9CA3AF]">Capping</p>
                  <p className="text-xs font-bold font-mono text-white mt-0.5">{ujianData.capping}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#0B0F17] border border-[#1F2937]">
                  <p className="text-[10px] text-[#9CA3AF]">Gerinda</p>
                  <p className="text-xs font-bold font-mono text-white mt-0.5">{ujianData.gerinda}</p>
                </div>
              </div>

              {ujianData.catatan_penguji && (
                <div className="text-[11px] text-[#9CA3AF] bg-[#0B0F17] border border-[#1F2937] p-2.5 rounded-lg">
                  <span className="font-semibold text-white">Catatan Penguji:</span> {ujianData.catatan_penguji}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-[#9CA3AF] bg-[#0B0F17]/60 border border-[#1F2937] p-2.5 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" />
              <span>
                {siapUjian
                  ? "Seluruh kriteria harian telah memenuhi standar minimum (≥ 80). Silakan hubungi instruktur bengkel untuk pelaksanaan Ujian Internal."
                  : "Ujian Internal hanya dapat dilaksanakan setelah seluruh 5 kriteria nilai harian mencapai standar KKM ≥ 80."}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Status Kompetensi 5 Kriteria Harian */}
      <section aria-label="Status kompetensi per kriteria">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-[#DC2626]" /> Evaluasi 5 Kriteria Praktek (KKM: 80)
          </h2>
          <span className="text-[11px] text-[#6B7280]">Nilai Tertinggi Dicapai</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {kriteriaList.map((k) => {
            const item = statusKelayakan[k] || {
              nama: k.charAt(0).toUpperCase() + k.slice(1),
              nilai_tertinggi: 0,
              lulus: false,
            };
            const v = item.nilai_tertinggi;
            const kompeten = item.lulus || v >= 80;
            return (
              <div key={k} className="flex items-center gap-3 bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-3">
                <KompetensiIcon value={v} lulus={kompeten} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[#D1D5DB]">{item.nama}</span>
                    <span className={`text-xs font-bold font-mono ${kompeten ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                      {v > 0 ? v : "—"} {kompeten ? "✓" : ""}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#0B0F17] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, v)}%`, background: kompeten ? "#10B981" : "#F59E0B" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Grafik Tren Perkembangan */}
      <section aria-label="Grafik tren nilai">
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#DC2626]" />
              <span className="text-xs font-semibold text-[#F9FAFB]">Kurva Tren Penilaian Harian</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {kriteriaList.map((k, idx) => {
                const nama = statusKelayakan[k]?.nama || k;
                const warna = WARNA_PALETTE[idx % WARNA_PALETTE.length];
                const isActive = focusKriteria === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFocusKriteria(isActive ? null : k)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all cursor-pointer"
                    style={{
                      borderColor: warna,
                      color: focusKriteria === null || isActive ? warna : "#6B7280",
                      background: isActive ? `${warna}25` : "transparent",
                      opacity: focusKriteria && !isActive ? 0.35 : 1,
                    }}
                    aria-pressed={isActive}
                  >
                    {nama}
                  </button>
                );
              })}
            </div>
          </div>

          {trendData.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6B7280]">
              Belum ada data riwayat nilai yang cukup untuk membentuk kurva tren.
            </div>
          ) : (
            <div className="w-full h-56 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis
                    dataKey="tanggal"
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[50, 100]}
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0B0F17",
                      border: "1px solid #1F2937",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    labelStyle={{ color: "#9CA3AF" }}
                  />
                  <ReferenceLine
                    y={80}
                    stroke="#10B981"
                    strokeDasharray="3 3"
                    label={{ value: "KKM 80", fill: "#10B981", fontSize: 9, position: "insideTopRight" }}
                  />
                  {kriteriaList.map((k, idx) => {
                    const warna = WARNA_PALETTE[idx % WARNA_PALETTE.length];
                    const isFocus = focusKriteria === null || focusKriteria === k;
                    return (
                      <Line
                        key={k}
                        type="monotone"
                        dataKey={k}
                        name={statusKelayakan[k]?.nama || k}
                        stroke={warna}
                        strokeWidth={isFocus ? 2.5 : 1}
                        strokeOpacity={isFocus ? 1 : 0.2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Riwayat Sesi Praktek Terkini */}
      {riwayatMentah.length > 0 && (
        <section aria-label="Rincian riwayat penilaian">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-[#DC2626]" /> Riwayat Penilaian Praktek
            </h2>
            <button
              type="button"
              onClick={() => setShowAllHistory(!showAllHistory)}
              className="text-xs text-[#DC2626] hover:underline cursor-pointer"
            >
              {showAllHistory ? "Tampilkan Lebih Sedikit" : `Lihat Semua (${riwayatMentah.length})`}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {(showAllHistory ? riwayatMentah : riwayatMentah.slice(-5).reverse()).map((item) => {
              const kName = item.kriteria?.nama_kriteria || "Kriteria";
              const isPass = Number(item.nilai) >= (item.kriteria?.batas_lulus || 80);
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#F9FAFB] truncate">{kName}</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      {item.tanggal} • {item.created_by === "superadmin" ? "Instruktur" : "Input Mandiri"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-mono text-sm font-bold ${isPass ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                      {item.nilai}
                    </span>
                    <span className={`block text-[10px] ${isPass ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                      {isPass ? "Lulus" : "Remidi"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
