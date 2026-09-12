"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
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

function KompetensiIcon({ value, lulus }: { value: number; lulus: boolean }) {
  if (lulus || value >= 80) return <CheckCircle2 className="h-5 w-5 text-[#10B981]" aria-label="Kompeten" />;
  if (value >= 70) return <AlertTriangle className="h-5 w-5 text-[#F59E0B]" aria-label="Perlu peningkatan" />;
  return <XCircle className="h-5 w-5 text-[#F43F5E]" aria-label="Belum kompeten" />;
}

export default function TranskripPage() {
  const [focusKriteria, setFocusKriteria] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<Array<Record<string, string | number>>>([]);
  const [statusKelayakan, setStatusKelayakan] = useState<Record<string, KriteriaStatus>>({});
  const [siapUjian, setSiapUjian] = useState(false);
  const [kriteriaKeys, setKriteriaKeys] = useState<string[]>([]);

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

          setTrendData(rawTrend);
          setStatusKelayakan(status);
          setKriteriaKeys(keys);
          setSiapUjian(!!d?.ringkasan_kelayakan?.siap_ujian);
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
      <div className="flex flex-col gap-5 animate-pulse">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40 bg-[#1F2937]" />
          <Skeleton className="h-3.5 w-60 bg-[#1F2937]/60" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#1F2937] bg-[#111827] p-3.5 flex flex-col gap-2">
              <Skeleton className="h-3 w-20 bg-[#1F2937]" />
              <Skeleton className="h-6 w-12 bg-[#1F2937]" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 h-64 flex flex-col gap-3">
          <Skeleton className="h-4 w-36 bg-[#1F2937]" />
          <Skeleton className="h-full w-full rounded-lg bg-[#1F2937]/40" />
        </div>
      </div>
    );
  }

  const kriteriaList = kriteriaKeys.length > 0 ? kriteriaKeys : ["persiapan", "proses", "k3", "kerapihan", "hasil akhir"];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Transkrip &amp; Grafik</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Perkembangan nilai per kriteria kompetensi.</p>
      </div>

      {/* Status Kompetensi */}
      <section aria-label="Status kompetensi per kriteria">
        <div className={`rounded-xl border p-3 mb-3 flex items-center gap-3 ${siapUjian ? "border-[#10B981]/30 bg-[#10B981]/8" : "border-[#F59E0B]/30 bg-[#F59E0B]/8"}`}>
          {siapUjian
            ? <CheckCircle2 className="h-5 w-5 text-[#10B981] shrink-0" aria-hidden="true" />
            : <AlertTriangle className="h-5 w-5 text-[#F59E0B] shrink-0" aria-hidden="true" />}
          <p className={`text-xs font-semibold ${siapUjian ? "text-[#10B981]" : "text-[#F9FAFB]"}`}>
            {siapUjian ? "Semua kriteria kompeten — siap mengikuti ujian internal!" : "Beberapa kriteria belum mencapai standar kelulusan minimum (≥ 80)"}
          </p>
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
                    <span className={`text-xs font-bold font-mono ${kompeten ? "text-[#10B981]" : "text-[#F59E0B]"}`}>{v}</span>
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

      {/* Grafik Tren */}
      <section aria-label="Grafik tren nilai">
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4">
          <div className="mb-3">
            <p className="text-xs font-semibold text-[#F9FAFB] mb-2">Grafik Tren — filter kriteria:</p>
            <div className="flex flex-wrap gap-1.5">
              {kriteriaList.map((k, idx) => {
                const nama = statusKelayakan[k]?.nama || k;
                const warna = WARNA_PALETTE[idx % WARNA_PALETTE.length];
                const isActive = focusKriteria === k;
                return (
                  <button
                    key={k}
                    onClick={() => setFocusKriteria(isActive ? null : k)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all"
                    style={{
                      borderColor: warna,
                      color: focusKriteria === null || isActive ? warna : "#374151",
                      background: isActive ? `${warna}20` : "transparent",
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
              Belum ada data riwayat nilai yang cukup untuk membentuk grafik tren.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="tanggal" tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[50, 100]} tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "#9CA3AF" }}
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
                      strokeOpacity={isFocus ? 1 : 0.15}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}
