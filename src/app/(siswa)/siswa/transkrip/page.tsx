"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const KRITERIA = ["Persiapan", "Proses", "K3", "Kerapihan", "Hasil Akhir"] as const;
type Kriteria = typeof KRITERIA[number];

const WARNA: Record<Kriteria, string> = {
  Persiapan:    "#DC2626",
  Proses:       "#F59E0B",
  K3:           "#10B981",
  Kerapihan:    "#38BDF8",
  "Hasil Akhir": "#818CF8",
};

const TREND_DATA = [
  { tgl: "26 Ags", Persiapan: 72, Proses: 70, K3: 78, Kerapihan: 68, "Hasil Akhir": 71 },
  { tgl: "28 Ags", Persiapan: 77, Proses: 74, K3: 81, Kerapihan: 72, "Hasil Akhir": 75 },
  { tgl: "30 Ags", Persiapan: 80, Proses: 76, K3: 83, Kerapihan: 73, "Hasil Akhir": 78 },
  { tgl: "01 Sep", Persiapan: 85, Proses: 80, K3: 90, Kerapihan: 78, "Hasil Akhir": 82 },
  { tgl: "02 Sep", Persiapan: 87, Proses: 83, K3: 91, Kerapihan: 80, "Hasil Akhir": 84 },
];

// Latest values
const LATEST: Record<Kriteria, number> = {
  Persiapan:    87,
  Proses:       83,
  K3:           91,
  Kerapihan:    80,
  "Hasil Akhir": 84,
};

function KompetensiIcon({ value }: { value: number }) {
  if (value >= 80) return <CheckCircle2 className="h-5 w-5 text-[#10B981]" aria-label="Kompeten" />;
  if (value >= 70) return <AlertTriangle className="h-5 w-5 text-[#F59E0B]" aria-label="Perlu peningkatan" />;
  return <XCircle className="h-5 w-5 text-[#F43F5E]" aria-label="Belum kompeten" />;
}

export default function TranskripPage() {
  const [focusKriteria, setFocusKriteria] = useState<Kriteria | null>(null);

  const allKompeten = KRITERIA.every((k) => LATEST[k] >= 80);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Transkrip &amp; Grafik</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Perkembangan nilai per kriteria kompetensi.</p>
      </div>

      {/* Status Kompetensi */}
      <section aria-label="Status kompetensi per kriteria">
        <div className={`rounded-xl border p-3 mb-3 flex items-center gap-3 ${allKompeten ? "border-[#10B981]/30 bg-[#10B981]/8" : "border-[#F59E0B]/30 bg-[#F59E0B]/8"}`}>
          {allKompeten
            ? <CheckCircle2 className="h-5 w-5 text-[#10B981] shrink-0" aria-hidden="true" />
            : <AlertTriangle className="h-5 w-5 text-[#F59E0B] shrink-0" aria-hidden="true" />}
          <p className={`text-xs font-semibold ${allKompeten ? "text-[#10B981]" : "text-[#F9FAFB]"}`}>
            {allKompeten ? "Semua kriteria kompeten — layak ujian!" : "Beberapa kriteria belum mencapai ≥ 80"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {KRITERIA.map((k) => {
            const v = LATEST[k];
            const kompeten = v >= 80;
            return (
              <div key={k} className="flex items-center gap-3 bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-3">
                <KompetensiIcon value={v} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[#D1D5DB]">{k}</span>
                    <span className={`text-xs font-bold font-mono ${kompeten ? "text-[#10B981]" : "text-[#F59E0B]"}`}>{v}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#0B0F17] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${v}%`, background: kompeten ? "#10B981" : "#F59E0B" }}
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
            <p className="text-xs font-semibold text-[#F9FAFB] mb-2">Grafik Tren — pilih fokus kriteria:</p>
            <div className="flex flex-wrap gap-1.5">
              {KRITERIA.map((k) => (
                <button
                  key={k}
                  onClick={() => setFocusKriteria(focusKriteria === k ? null : k)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all"
                  style={{
                    borderColor: WARNA[k],
                    color: focusKriteria === null || focusKriteria === k ? WARNA[k] : "#374151",
                    background: focusKriteria === k ? `${WARNA[k]}20` : "transparent",
                    opacity: focusKriteria && focusKriteria !== k ? 0.35 : 1,
                  }}
                  aria-pressed={focusKriteria === k}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={TREND_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="tgl" tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 100]} tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "#9CA3AF" }}
              />
              {KRITERIA.map((k) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={WARNA[k]}
                  strokeWidth={focusKriteria === null || focusKriteria === k ? 2.5 : 1}
                  strokeOpacity={focusKriteria === null || focusKriteria === k ? 1 : 0.15}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
