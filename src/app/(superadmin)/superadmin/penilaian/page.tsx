"use client";

import React, { useState } from "react";
import { Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { handleEnterToNextField } from "@/lib/form-utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const KRITERIA = ["Persiapan", "Proses", "K3", "Kerapihan", "Hasil Akhir"] as const;
type Kriteria = typeof KRITERIA[number];

const WARNA: Record<Kriteria, string> = {
  Persiapan: "#DC2626",
  Proses:    "#F59E0B",
  K3:        "#10B981",
  Kerapihan: "#38BDF8",
  "Hasil Akhir": "#818CF8",
};

const DEMO_NILAI = [
  { id: 1, siswa: "Budi Santoso",  tanggal: "2025-09-01", Persiapan: 85, Proses: 80, K3: 90, Kerapihan: 78, "Hasil Akhir": 82, by: "Mandiri" },
  { id: 2, siswa: "Sari Dewi",     tanggal: "2025-09-01", Persiapan: 90, Proses: 88, K3: 92, Kerapihan: 85, "Hasil Akhir": 91, by: "Instruktur" },
  { id: 3, siswa: "Budi Santoso",  tanggal: "2025-09-02", Persiapan: 87, Proses: 83, K3: 91, Kerapihan: 80, "Hasil Akhir": 84, by: "Mandiri" },
];

const TREND_DATA = [
  { tgl: "28 Ags", Persiapan: 75, Proses: 72, K3: 80, Kerapihan: 70, "Hasil Akhir": 73 },
  { tgl: "29 Ags", Persiapan: 80, Proses: 76, K3: 83, Kerapihan: 75, "Hasil Akhir": 78 },
  { tgl: "01 Sep", Persiapan: 85, Proses: 80, K3: 90, Kerapihan: 78, "Hasil Akhir": 82 },
  { tgl: "02 Sep", Persiapan: 87, Proses: 83, K3: 91, Kerapihan: 80, "Hasil Akhir": 84 },
];

const columns = [
  { key: "siswa",   header: "Siswa" },
  { key: "tanggal", header: "Tanggal", render: (r: typeof DEMO_NILAI[number]) => <span className="font-mono text-[11px]">{r.tanggal}</span> },
  ...KRITERIA.map((k) => ({
    key: k,
    header: k,
    render: (r: typeof DEMO_NILAI[number]) => {
      const v = r[k];
      return <span className={`font-mono font-medium ${v >= 80 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>{v}</span>;
    },
  })),
  {
    key: "by", header: "Input oleh",
    render: (r: typeof DEMO_NILAI[number]) => (
      <Badge variant={r.by === "Instruktur" ? "spark" : "neutral"}>{r.by}</Badge>
    ),
  },
];

export default function PenilaianPage() {
  const [focusKriteria, setFocusKriteria] = useState<Kriteria | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Penilaian Harian</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Monitoring dan input nilai per kriteria.</p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Input / Koreksi Nilai
        </Button>
      </div>

      {/* Grafik Tren */}
      <section aria-label="Grafik tren nilai">
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <TrendingUp className="h-4 w-4 text-[#DC2626]" aria-hidden="true" />
            <h2 className="text-xs font-semibold text-[#F9FAFB]">Tren Nilai — Budi Santoso</h2>
            <div className="ml-auto flex flex-wrap gap-1.5">
              {KRITERIA.map((k) => (
                <button
                  key={k}
                  onClick={() => setFocusKriteria(focusKriteria === k ? null : k)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all"
                  style={{
                    borderColor: WARNA[k],
                    color: focusKriteria === null || focusKriteria === k ? WARNA[k] : "#374151",
                    background: focusKriteria === k ? `${WARNA[k]}20` : "transparent",
                    opacity: focusKriteria && focusKriteria !== k ? 0.4 : 1,
                  }}
                  aria-pressed={focusKriteria === k}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
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
                  strokeOpacity={focusKriteria === null || focusKriteria === k ? 1 : 0.2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <Table columns={columns as Parameters<typeof Table>[0]["columns"]} data={DEMO_NILAI} />

      {/* Modal Input Nilai */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Input / Koreksi Nilai"
        description="Isi nilai per kriteria untuk siswa yang dipilih."
      >
        <form
          data-form-container
          onKeyDown={handleEnterToNextField}
          className="flex flex-col gap-4"
          onSubmit={(e) => { e.preventDefault(); setModalOpen(false); }}
        >
          <Select label="Siswa" name="siswa_id" required data-next="tanggal">
            <option value="">Pilih siswa...</option>
            <option value="1">Budi Santoso</option>
            <option value="2">Sari Dewi</option>
          </Select>
          <Input label="Tanggal" name="tanggal" type="date" required data-next="Persiapan" />
          {KRITERIA.map((k, i) => (
            <Input
              key={k}
              label={k}
              name={k}
              type="number"
              min={0}
              max={100}
              placeholder="0–100"
              data-next={KRITERIA[i + 1] ?? "submit"}
            />
          ))}
          <div className="flex gap-2 justify-end mt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button id="submit" type="submit">Simpan Nilai</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
