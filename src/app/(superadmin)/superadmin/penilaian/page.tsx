"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, TrendingUp, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { handleEnterToNextField } from "@/lib/form-utils";
import { formatDateIndo } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const WARNA_PALETTE = ["#DC2626", "#F59E0B", "#10B981", "#38BDF8", "#818CF8", "#EC4899"];

interface SiswaOption {
  id: string;
  nomor_induk: string;
  nama_lengkap: string;
}

interface KriteriaItem {
  id: string;
  nama_kriteria: string;
  batas_lulus: number;
}

interface PenilaianRow {
  id: string;
  tanggal: string;
  nilai: number;
  created_by?: string;
  catatan?: string;
  kriteria?: { nama_kriteria: string };
  siswa_nama?: string;
}

export default function PenilaianPage() {
  const [siswaList, setSiswaList] = useState<SiswaOption[]>([]);
  const [kriteriaList, setKriteriaList] = useState<KriteriaItem[]>([]);
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>("");
  const [trendData, setTrendData] = useState<Array<Record<string, string | number>>>([]);
  const [riwayatList, setRiwayatList] = useState<PenilaianRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusKriteria, setFocusKriteria] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Initial load: siswa & kriteria
  useEffect(() => {
    async function loadMeta() {
      try {
        const [resSiswa, resKriteria] = await Promise.allSettled([
          fetch("/api/v1/siswa?status=aktif&limit=100"),
          fetch("/api/v1/master/kriteria"),
        ]);

        if (resSiswa.status === "fulfilled" && resSiswa.value.ok) {
          const jsonSiswa = await resSiswa.value.json();
          const sList = jsonSiswa.data || [];
          setSiswaList(sList);
          if (sList.length > 0) {
            setSelectedSiswaId(sList[0].id);
          }
        }

        if (resKriteria.status === "fulfilled" && resKriteria.value.ok) {
          const jsonKriteria = await resKriteria.value.json();
          setKriteriaList(jsonKriteria.data || []);
        }
      } catch (err) {
        console.error("Gagal memuat metadata penilaian:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMeta();
  }, []);

  // 2. Load penilaian untuk siswa yang dipilih
  const loadPenilaianSiswa = useCallback(async (sId: string) => {
    if (!sId) return;
    try {
      const res = await fetch(`/api/v1/penilaian?siswa_id=${sId}`);
      if (res.ok) {
        const json = await res.json();
        setTrendData(json.data?.grafik_tren || []);
        setRiwayatList(json.data?.riwayat_mentah || []);
      }
    } catch (err) {
      console.error("Gagal memuat data penilaian siswa:", err);
    }
  }, []);

  useEffect(() => {
    if (selectedSiswaId) {
      loadPenilaianSiswa(selectedSiswaId);
    }
  }, [selectedSiswaId, loadPenilaianSiswa]);

  async function handleInputNilai(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const targetSiswaId = formData.get("siswa_id") as string;
    const tanggal = (formData.get("tanggal") as string) || new Date().toISOString().split("T")[0];

    const penilaianPayload = kriteriaList.map((k) => ({
      kriteria_id: k.id,
      nilai: parseInt((formData.get(`kriteria_${k.id}`) as string) || "0", 10),
      catatan: "Verifikasi Instruktur",
    }));

    try {
      const res = await fetch("/api/v1/penilaian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siswa_id: targetSiswaId,
          tanggal,
          penilaian: penilaianPayload,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error?.message || "Gagal menyimpan penilaian.");
        return;
      }

      setModalOpen(false);
      if (targetSiswaId === selectedSiswaId) {
        await loadPenilaianSiswa(targetSiswaId);
      } else {
        setSelectedSiswaId(targetSiswaId);
      }
    } catch {
      setErrorMsg("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  const selectedSiswaObj = siswaList.find((s) => s.id === selectedSiswaId);

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      render: (r: PenilaianRow) => (
        <span className="font-mono text-[11px] text-[#D1D5DB]">{formatDateIndo(r.tanggal)}</span>
      ),
    },
    {
      key: "kriteria",
      header: "Kriteria",
      render: (r: PenilaianRow) => (
        <span className="text-xs font-semibold text-[#F9FAFB]">{r.kriteria?.nama_kriteria || "—"}</span>
      ),
    },
    {
      key: "nilai",
      header: "Nilai",
      render: (r: PenilaianRow) => (
        <span className={`font-mono font-bold text-xs ${r.nilai >= 80 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
          {r.nilai}
        </span>
      ),
    },
    {
      key: "by",
      header: "Status Input",
      render: (r: PenilaianRow) => (
        <Badge variant={r.created_by === "superadmin" ? "spark" : "neutral"}>
          {r.created_by === "superadmin" ? "Instruktur" : "Mandiri Siswa"}
        </Badge>
      ),
    },
    {
      key: "catatan",
      header: "Catatan",
      render: (r: PenilaianRow) => (
        <span className="text-xs text-[#9CA3AF]">{r.catatan || "—"}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Penilaian Harian</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Monitoring kurva perkembangan praktek dan input nilai instruktur.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setModalOpen(true); setErrorMsg(null); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Input / Koreksi Nilai
          </Button>
          <button
            onClick={() => loadPenilaianSiswa(selectedSiswaId)}
            className="p-2 rounded-lg border border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:text-white transition-colors"
            title="Segarkan data penilaian"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Selector Siswa */}
      <div className="flex items-center gap-3 bg-[#111827] border border-[#1F2937] rounded-xl p-3 max-w-md">
        <span className="text-xs text-[#9CA3AF] shrink-0 font-medium">Pilih Siswa:</span>
        <select
          value={selectedSiswaId}
          onChange={(e) => setSelectedSiswaId(e.target.value)}
          className="h-8 flex-1 rounded-lg border border-[#374151] bg-[#0B0F17] px-2.5 text-xs text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
        >
          {siswaList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nomor_induk} — {s.nama_lengkap}
            </option>
          ))}
        </select>
      </div>

      {/* Grafik Tren */}
      <section aria-label="Grafik tren nilai">
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <TrendingUp className="h-4 w-4 text-[#DC2626]" aria-hidden="true" />
            <h2 className="text-xs font-semibold text-[#F9FAFB]">
              Tren Perkembangan Nilai — {selectedSiswaObj?.nama_lengkap || "Siswa"}
            </h2>
            <div className="ml-auto flex flex-wrap gap-1.5">
              {kriteriaList.map((k, idx) => {
                const warna = WARNA_PALETTE[idx % WARNA_PALETTE.length];
                const key = k.nama_kriteria.toLowerCase();
                const isActive = focusKriteria === key;
                return (
                  <button
                    key={k.id}
                    onClick={() => setFocusKriteria(isActive ? null : key)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all"
                    style={{
                      borderColor: warna,
                      color: focusKriteria === null || isActive ? warna : "#374151",
                      background: isActive ? `${warna}20` : "transparent",
                      opacity: focusKriteria && !isActive ? 0.35 : 1,
                    }}
                    aria-pressed={isActive}
                  >
                    {k.nama_kriteria}
                  </button>
                );
              })}
            </div>
          </div>

          {trendData.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6B7280]">
              Belum ada data riwayat penilaian untuk siswa ini.
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
                  const key = k.nama_kriteria.toLowerCase();
                  const warna = WARNA_PALETTE[idx % WARNA_PALETTE.length];
                  const isFocus = focusKriteria === null || focusKriteria === key;
                  return (
                    <Line
                      key={k.id}
                      type="monotone"
                      dataKey={key}
                      name={k.nama_kriteria}
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

      {/* Tabel Riwayat */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-xs text-[#6B7280]">
          <Loader2 className="h-6 w-6 animate-spin text-[#DC2626]" />
          <span>Memuat data penilaian...</span>
        </div>
      ) : (
        <Table columns={columns} data={riwayatList} emptyMessage="Belum ada riwayat penilaian untuk siswa ini." />
      )}

      {/* Modal Input Nilai */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Input / Koreksi Nilai Praktek"
        description="Masukkan hasil evaluasi harian instruktur."
      >
        <form
          data-form-container
          onKeyDown={handleEnterToNextField}
          className="flex flex-col gap-4"
          onSubmit={handleInputNilai}
        >
          {errorMsg && (
            <div className="rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/20 p-2.5 text-xs text-[#F43F5E] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Select label="Pilih Siswa" name="siswa_id" defaultValue={selectedSiswaId} required data-next="tanggal">
            <option value="">Pilih siswa...</option>
            {siswaList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nomor_induk} — {s.nama_lengkap}
              </option>
            ))}
          </Select>

          <Input
            label="Tanggal Penilaian"
            name="tanggal"
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
            required
            data-next={kriteriaList[0] ? `kriteria_${kriteriaList[0].id}` : "submit"}
          />

          <div className="grid grid-cols-2 gap-3">
            {kriteriaList.map((k, i) => (
              <Input
                key={k.id}
                label={k.nama_kriteria}
                name={`kriteria_${k.id}`}
                type="number"
                min={0}
                max={100}
                required
                placeholder="0–100"
                data-next={kriteriaList[i + 1] ? `kriteria_${kriteriaList[i + 1].id}` : "submit"}
              />
            ))}
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button id="submit" type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</> : "Simpan Nilai"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
