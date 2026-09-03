"use client";

import React, { useState } from "react";
import { Plus, Trash2, Edit2, MapPin, Layers, CheckSquare, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { handleEnterToNextField } from "@/lib/form-utils";

type Tab = "program" | "kriteria" | "berkas" | "lokasi";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "program",  label: "Program Pelatihan", icon: Layers },
  { id: "kriteria", label: "Kriteria Nilai",    icon: CheckSquare },
  { id: "berkas",   label: "Syarat Berkas",     icon: Settings },
  { id: "lokasi",   label: "Lokasi GPS",        icon: MapPin },
];

const DEMO_DATA: Record<Tab, { id: number; nama: string; keterangan?: string }[]> = {
  program:  [{ id: 1, nama: "Pengelasan SMAW", keterangan: "Stick welding dasar - lanjutan" }, { id: 2, nama: "Pengelasan MIG/MAG" }],
  kriteria: [{ id: 1, nama: "Persiapan" }, { id: 2, nama: "Proses" }, { id: 3, nama: "K3" }, { id: 4, nama: "Kerapihan" }, { id: 5, nama: "Hasil Akhir" }],
  berkas:   [{ id: 1, nama: "Fotokopi KTP" }, { id: 2, nama: "Pas Foto 3×4" }, { id: 3, nama: "Ijazah Terakhir" }],
  lokasi:   [{ id: 1, nama: "Bengkel Utama", keterangan: "-6.2088, 106.8456 — radius 100m" }],
};

export default function MasterPage() {
  const [activeTab, setActiveTab] = useState<Tab>("program");
  const [modalOpen, setModalOpen] = useState(false);
  const data = DEMO_DATA[activeTab];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Master Data Dinamis</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Konfigurasi data referensi sistem.</p>
      </div>

      {/* Tab Nav */}
      <div className="flex flex-wrap gap-1 bg-[#111827] border border-[#1F2937] rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${activeTab === id ? "bg-[#DC2626] text-white" : "text-[#9CA3AF] hover:text-[#D1D5DB]"}`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-[#1F2937] bg-[#111827] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F2937]">
          <span className="text-xs font-semibold text-[#F9FAFB]">{TABS.find((t) => t.id === activeTab)?.label}</span>
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Tambah
          </Button>
        </div>

        {/* List */}
        <ul className="divide-y divide-[#1F2937]" aria-label={`Daftar ${activeTab}`}>
          {data.length === 0 ? (
            <li className="px-5 py-8 text-center text-xs text-[#6B7280]">Belum ada data.</li>
          ) : (
            data.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#1F2937]/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#D1D5DB] truncate">{item.nama}</p>
                  {item.keterangan && (
                    <p className="text-[11px] text-[#6B7280] truncate mt-0.5">{item.keterangan}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button className="h-7 w-7 rounded-lg hover:bg-[#1F2937] text-[#6B7280] hover:text-[#F9FAFB] flex items-center justify-center transition-colors" aria-label={`Edit ${item.nama}`}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button className="h-7 w-7 rounded-lg hover:bg-[#F43F5E]/10 text-[#6B7280] hover:text-[#F43F5E] flex items-center justify-center transition-colors" aria-label={`Hapus ${item.nama}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* GPS Info Card */}
      {activeTab === "lokasi" && (
        <div className="rounded-xl border border-[#38BDF8]/25 bg-[#38BDF8]/8 p-4 text-xs text-[#9CA3AF] leading-relaxed">
          <MapPin className="h-4 w-4 text-[#38BDF8] mb-2" aria-hidden="true" />
          Titik lokasi digunakan sebagai pusat geofencing. Siswa hanya dapat melakukan presensi jika berada dalam radius yang ditentukan. Koordinat dalam format desimal (latitude, longitude).
        </div>
      )}

      {/* Add Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Tambah ${TABS.find((t) => t.id === activeTab)?.label}`}>
        <form
          data-form-container
          onKeyDown={handleEnterToNextField}
          className="flex flex-col gap-4"
          onSubmit={(e) => { e.preventDefault(); setModalOpen(false); }}
        >
          <Input label="Nama" name="nama" required placeholder="Masukkan nama..." data-next={activeTab === "lokasi" ? "lat" : "keterangan"} />
          {activeTab === "lokasi" ? (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Latitude"  name="lat"    type="number" step="any" placeholder="-6.2088"   data-next="lng" />
              <Input label="Longitude" name="lng"    type="number" step="any" placeholder="106.8456"  data-next="radius" />
              <Input label="Radius (m)" name="radius" type="number" min={10} placeholder="100"       className="col-span-2" data-next="submit" />
            </div>
          ) : (
            <Input label="Keterangan (opsional)" name="keterangan" placeholder="Deskripsi singkat..." data-next="submit" />
          )}
          <div className="flex gap-2 justify-end mt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button id="submit" type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
