"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  MapPin,
  Layers,
  CheckSquare,
  Settings,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Save,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { handleEnterToNextField } from "@/lib/form-utils";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "program" | "kriteria" | "berkas" | "lokasi";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "program", label: "Program Pelatihan", icon: Layers },
  { id: "kriteria", label: "Kriteria Nilai", icon: CheckSquare },
  { id: "berkas", label: "Syarat Berkas", icon: Settings },
  { id: "lokasi", label: "Lokasi GPS", icon: MapPin },
];

interface ProgramItem {
  id: string;
  kode_program: string;
  nama: string;
  biaya: number;
  estimasi_durasi_hari: number;
}

interface KriteriaItem {
  id: string;
  nama_kriteria: string;
  batas_lulus: number;
  urutan: number;
}

interface BerkasItem {
  id: string;
  kode_berkas: string;
  nama_berkas: string;
  wajib: boolean;
}

interface LokasiItem {
  id?: string;
  nama_titik: string;
  lat: number;
  lng: number;
  radius_meter: number;
}

export default function MasterPage() {
  const [activeTab, setActiveTab] = useState<Tab>("program");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Data states
  const [programList, setProgramList] = useState<ProgramItem[]>([]);
  const [kriteriaList, setKriteriaList] = useState<KriteriaItem[]>([]);
  const [berkasList, setBerkasList] = useState<BerkasItem[]>([]);
  const [lokasiData, setLokasiData] = useState<LokasiItem>({
    nama_titik: "Bengkel Las LPKS Sumbu Hidup",
    lat: -6.917464,
    lng: 107.619122,
    radius_meter: 100,
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [formProgram, setFormProgram] = useState({ kode: "", nama: "", biaya: "", durasi: "30" });
  const [formKriteria, setFormKriteria] = useState({ nama: "", batas_lulus: "80", urutan: "1" });
  const [formBerkas, setFormBerkas] = useState({ kode: "", nama: "", wajib: true });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      if (activeTab === "program") {
        const res = await fetch("/api/v1/master/program");
        const json = await res.json();
        if (res.ok) setProgramList(json.data || []);
      } else if (activeTab === "kriteria") {
        const res = await fetch("/api/v1/master/kriteria");
        const json = await res.json();
        if (res.ok) setKriteriaList(json.data || []);
      } else if (activeTab === "berkas") {
        const res = await fetch("/api/v1/master/syarat-berkas");
        const json = await res.json();
        if (res.ok) setBerkasList(json.data || []);
      } else if (activeTab === "lokasi") {
        const res = await fetch("/api/v1/master/lokasi");
        const json = await res.json();
        if (res.ok && json.data) {
          setLokasiData({
            id: json.data.id,
            nama_titik: json.data.nama_titik || "Bengkel Las LPKS Sumbu Hidup",
            lat: json.data.lat ?? -6.917464,
            lng: json.data.lng ?? 107.619122,
            radius_meter: json.data.radius_meter ?? 100,
          });
        }
      }
    } catch {
      setErrorMsg("Gagal memuat master data.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      let endpoint = "";
      let payload = {};

      if (activeTab === "program") {
        endpoint = "/api/v1/master/program";
        payload = {
          kode_program: formProgram.kode,
          nama: formProgram.nama,
          biaya: parseFloat(formProgram.biaya),
          estimasi_durasi_hari: parseInt(formProgram.durasi, 10),
        };
      } else if (activeTab === "kriteria") {
        endpoint = "/api/v1/master/kriteria";
        payload = {
          nama_kriteria: formKriteria.nama,
          batas_lulus: parseInt(formKriteria.batas_lulus, 10),
          urutan: parseInt(formKriteria.urutan, 10),
        };
      } else if (activeTab === "berkas") {
        endpoint = "/api/v1/master/syarat-berkas";
        payload = {
          kode_berkas: formBerkas.kode,
          nama_berkas: formBerkas.nama,
          wajib: formBerkas.wajib,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Gagal menyimpan item baru.");
      }

      setSuccessMsg("Data berhasil ditambahkan!");
      setModalOpen(false);
      // Reset form
      setFormProgram({ kode: "", nama: "", biaya: "", durasi: "30" });
      setFormKriteria({ nama: "", batas_lulus: "80", urutan: "1" });
      setFormBerkas({ kode: "", nama: "", wajib: true });
      await fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    let endpoint = "";
    if (activeTab === "program") endpoint = `/api/v1/master/program?id=${id}`;
    if (activeTab === "kriteria") endpoint = `/api/v1/master/kriteria?id=${id}`;
    if (activeTab === "berkas") endpoint = `/api/v1/master/syarat-berkas?id=${id}`;

    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Gagal menghapus data.");
      }
      setSuccessMsg("Data berhasil dihapus!");
      await fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveLokasi(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/v1/master/lokasi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lokasiData),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Gagal menyimpan koordinat lokasi.");
      }
      setSuccessMsg("Koordinat lokasi geofencing berhasil diperbarui!");
      await fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Master Data Dinamis</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Konfigurasi data referensi sistem, program, kriteria, berkas, dan titik GPS.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Segarkan
        </Button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-[#F43F5E]/10 border border-[#F43F5E]/20 text-[#F43F5E] text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab Nav */}
      <div className="flex flex-wrap gap-1 bg-[#111827] border border-[#1F2937] rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
              activeTab === id
                ? "bg-[#DC2626] text-white shadow-sm"
                : "text-[#9CA3AF] hover:text-[#D1D5DB] hover:bg-[#1F2937]/50"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* Content Section */}
      {activeTab === "lokasi" ? (
        /* Lokasi Form Card */
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#1F2937]">
            <div className="h-8 w-8 rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8]">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#F9FAFB]">Pengaturan Pusat Geofencing GPS</p>
              <p className="text-[11px] text-[#6B7280]">
                Pusat absensi presensi siswa. Presensi hanya diakui jika dalam radius toleransi.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveLokasi} className="flex flex-col gap-4 max-w-xl">
            <Input
              label="Nama Titik Lokasi"
              name="nama_titik"
              required
              value={lokasiData.nama_titik}
              onChange={(e) => setLokasiData({ ...lokasiData, nama_titik: e.target.value })}
              placeholder="Contoh: Bengkel Utama LPKS Sumbu Hidup"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Latitude"
                name="lat"
                type="number"
                step="any"
                required
                value={lokasiData.lat}
                onChange={(e) => setLokasiData({ ...lokasiData, lat: parseFloat(e.target.value) || 0 })}
                placeholder="-6.917464"
              />
              <Input
                label="Longitude"
                name="lng"
                type="number"
                step="any"
                required
                value={lokasiData.lng}
                onChange={(e) => setLokasiData({ ...lokasiData, lng: parseFloat(e.target.value) || 0 })}
                placeholder="107.619122"
              />
            </div>
            <Input
              label="Radius Toleransi (Meter)"
              name="radius_meter"
              type="number"
              min={10}
              max={1000}
              required
              value={lokasiData.radius_meter}
              onChange={(e) =>
                setLokasiData({ ...lokasiData, radius_meter: parseInt(e.target.value, 10) || 100 })
              }
              placeholder="100"
            />

            <div className="pt-2">
              <Button type="submit" disabled={submitting} className="gap-2 bg-[#DC2626] hover:bg-[#B91C1C]">
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Simpan Koordinat
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        /* Table List for Program / Kriteria / Berkas */
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F2937]">
            <span className="text-xs font-semibold text-[#F9FAFB]">
              Daftar {TABS.find((t) => t.id === activeTab)?.label}
            </span>
            <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5 bg-[#DC2626] hover:bg-[#B91C1C]">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Tambah Item
            </Button>
          </div>

          {loading ? (
            <div className="divide-y divide-[#1F2937] animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-10 bg-[#1F2937]" />
                      <Skeleton className="h-4 w-44 bg-[#1F2937]" />
                    </div>
                    <Skeleton className="h-3 w-64 bg-[#1F2937]/60" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg bg-[#1F2937]" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-[#1F2937]">
              {/* Program tab */}
              {activeTab === "program" &&
                (programList.length === 0 ? (
                  <li className="px-5 py-8 text-center text-xs text-[#6B7280]">Belum ada data program.</li>
                ) : (
                  programList.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[#1F2937]/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] bg-[#1F2937] border border-[#374151] px-1.5 py-0.5 rounded text-[#F9FAFB]">
                            {item.kode_program}
                          </span>
                          <p className="text-xs font-medium text-[#F9FAFB]">{item.nama}</p>
                        </div>
                        <p className="text-[11px] text-[#6B7280] mt-1">
                          Biaya: Rp {Number(item.biaya).toLocaleString("id-ID")} &bull; Estimasi Durasi:{" "}
                          {item.estimasi_durasi_hari} Hari
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="h-7 w-7 rounded-lg hover:bg-[#F43F5E]/10 text-[#6B7280] hover:text-[#F43F5E] flex items-center justify-center transition-colors"
                        title="Hapus Program"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))
                ))}

              {/* Kriteria tab */}
              {activeTab === "kriteria" &&
                (kriteriaList.length === 0 ? (
                  <li className="px-5 py-8 text-center text-xs text-[#6B7280]">Belum ada data kriteria.</li>
                ) : (
                  kriteriaList.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[#1F2937]/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#9CA3AF] bg-[#1F2937] px-2 py-0.5 rounded">
                            Urutan #{item.urutan}
                          </span>
                          <p className="text-xs font-medium text-[#F9FAFB]">{item.nama_kriteria}</p>
                        </div>
                        <p className="text-[11px] text-[#6B7280] mt-1">
                          Standar Batas Kelulusan: <span className="text-[#10B981] font-semibold">{item.batas_lulus}</span> / 100
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="h-7 w-7 rounded-lg hover:bg-[#F43F5E]/10 text-[#6B7280] hover:text-[#F43F5E] flex items-center justify-center transition-colors"
                        title="Hapus Kriteria"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))
                ))}

              {/* Berkas tab */}
              {activeTab === "berkas" &&
                (berkasList.length === 0 ? (
                  <li className="px-5 py-8 text-center text-xs text-[#6B7280]">Belum ada syarat berkas.</li>
                ) : (
                  berkasList.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[#1F2937]/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[#9CA3AF] bg-[#1F2937] px-1.5 py-0.5 rounded">
                            {item.kode_berkas}
                          </span>
                          <p className="text-xs font-medium text-[#F9FAFB]">{item.nama_berkas}</p>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${
                              item.wajib
                                ? "bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30"
                                : "bg-[#6B7280]/20 text-[#9CA3AF]"
                            }`}
                          >
                            {item.wajib ? "Wajib" : "Opsional"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="h-7 w-7 rounded-lg hover:bg-[#F43F5E]/10 text-[#6B7280] hover:text-[#F43F5E] flex items-center justify-center transition-colors"
                        title="Hapus Syarat Berkas"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))
                ))}
            </ul>
          )}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title={`Tambah ${TABS.find((t) => t.id === activeTab)?.label}`}
      >
        <form
          data-form-container
          onKeyDown={handleEnterToNextField}
          className="flex flex-col gap-4"
          onSubmit={handleAddSubmit}
        >
          {activeTab === "program" && (
            <>
              <Input
                label="Kode Program (Misal: 01, 02)"
                name="kode"
                required
                value={formProgram.kode}
                onChange={(e) => setFormProgram({ ...formProgram, kode: e.target.value })}
                placeholder="01"
                data-next="prog-nama"
              />
              <Input
                id="prog-nama"
                label="Nama Program Pelatihan"
                name="nama"
                required
                value={formProgram.nama}
                onChange={(e) => setFormProgram({ ...formProgram, nama: e.target.value })}
                placeholder="SMAW 6G Pipe Welding"
                data-next="prog-biaya"
              />
              <Input
                id="prog-biaya"
                label="Biaya Pelatihan (Rp)"
                name="biaya"
                type="number"
                required
                value={formProgram.biaya}
                onChange={(e) => setFormProgram({ ...formProgram, biaya: e.target.value })}
                placeholder="8500000"
                data-next="prog-durasi"
              />
              <Input
                id="prog-durasi"
                label="Estimasi Durasi (Hari)"
                name="durasi"
                type="number"
                required
                value={formProgram.durasi}
                onChange={(e) => setFormProgram({ ...formProgram, durasi: e.target.value })}
                placeholder="30"
                data-next="submit-btn"
              />
            </>
          )}

          {activeTab === "kriteria" && (
            <>
              <Input
                label="Nama Kriteria"
                name="nama"
                required
                value={formKriteria.nama}
                onChange={(e) => setFormKriteria({ ...formKriteria, nama: e.target.value })}
                placeholder="Misal: Capping"
                data-next="krit-batas"
              />
              <Input
                id="krit-batas"
                label="Standar Batas Lulus (Default: 80)"
                name="batas_lulus"
                type="number"
                min={0}
                max={100}
                required
                value={formKriteria.batas_lulus}
                onChange={(e) => setFormKriteria({ ...formKriteria, batas_lulus: e.target.value })}
                placeholder="80"
                data-next="krit-urutan"
              />
              <Input
                id="krit-urutan"
                label="Nomor Urutan Tampilan"
                name="urutan"
                type="number"
                min={1}
                required
                value={formKriteria.urutan}
                onChange={(e) => setFormKriteria({ ...formKriteria, urutan: e.target.value })}
                placeholder="1"
                data-next="submit-btn"
              />
            </>
          )}

          {activeTab === "berkas" && (
            <>
              <Input
                label="Kode Berkas (Huruf kecil tanpa spasi, misal: ktp)"
                name="kode"
                required
                value={formBerkas.kode}
                onChange={(e) => setFormBerkas({ ...formBerkas, kode: e.target.value })}
                placeholder="ktp"
                data-next="berkas-nama"
              />
              <Input
                id="berkas-nama"
                label="Nama Berkas Dokumen"
                name="nama"
                required
                value={formBerkas.nama}
                onChange={(e) => setFormBerkas({ ...formBerkas, nama: e.target.value })}
                placeholder="Fotokopi KTP Asli"
                data-next="submit-btn"
              />
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="wajib-cb"
                  checked={formBerkas.wajib}
                  onChange={(e) => setFormBerkas({ ...formBerkas, wajib: e.target.checked })}
                  className="rounded border-[#374151] bg-[#0B0F17] text-[#DC2626] focus:ring-[#DC2626]"
                />
                <label htmlFor="wajib-cb" className="text-xs text-[#D1D5DB] cursor-pointer">
                  Wajib dilampirkan saat pendaftaran
                </label>
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end mt-3">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              id="submit-btn"
              type="submit"
              disabled={submitting}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
