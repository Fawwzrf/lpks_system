"use client";

import React, { useState } from "react";
import { Plus, Download, Wallet, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table } from "@/components/ui/table";
import { handleEnterToNextField } from "@/lib/form-utils";

const DEMO_TRANSAKSI = [
  { id: 1, nama: "Budi Santoso",  tanggal: "2025-08-30", jumlah: 1500000, total: 3500000, sisa: 2000000, status: "cicil" },
  { id: 2, nama: "Sari Dewi",     tanggal: "2025-08-15", jumlah: 3500000, total: 3500000, sisa: 0,       status: "lunas" },
  { id: 3, nama: "Rina Marlina",  tanggal: "2025-09-01", jumlah: 500000,  total: 3500000, sisa: 3000000, status: "cicil" },
];

const STATUS_CONFIG = {
  lunas: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Lunas",  color: "text-[#10B981]" },
  cicil: { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Cicilan", color: "text-[#F59E0B]" },
  belum: { icon: <XCircle className="h-3.5 w-3.5" />, label: "Belum",  color: "text-[#F43F5E]" },
};

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
}

export default function KeuanganPage() {
  const [modalOpen, setModalOpen] = useState(false);

  const columns = [
    { key: "nama",    header: "Nama Siswa" },
    { key: "tanggal", header: "Tgl. Bayar", render: (r: typeof DEMO_TRANSAKSI[number]) => <span className="font-mono text-[11px]">{r.tanggal}</span> },
    { key: "jumlah",  header: "Jumlah Bayar", render: (r: typeof DEMO_TRANSAKSI[number]) => <span className="text-[#10B981] font-medium">{formatRp(r.jumlah)}</span> },
    { key: "sisa",    header: "Sisa Tagihan",  render: (r: typeof DEMO_TRANSAKSI[number]) => <span className={r.sisa > 0 ? "text-[#F59E0B]" : "text-[#10B981]"}>{r.sisa === 0 ? "Lunas" : formatRp(r.sisa)}</span> },
    {
      key: "status", header: "Status",
      render: (r: typeof DEMO_TRANSAKSI[number]) => {
        const cfg = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG];
        return (
          <span className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Keuangan</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Pencatatan transaksi pembayaran siswa.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export Excel
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Catat Pembayaran
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4 flex items-center gap-3">
          <Wallet className="h-5 w-5 text-[#10B981]" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Total Masuk</p>
            <p className="text-sm font-bold text-[#F9FAFB]">{formatRp(DEMO_TRANSAKSI.reduce((a, r) => a + r.jumlah, 0))}</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-[#10B981]" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Lunas</p>
            <p className="text-sm font-bold text-[#F9FAFB]">{DEMO_TRANSAKSI.filter((r) => r.status === "lunas").length} siswa</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-[#F59E0B]" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Masih Cicil</p>
            <p className="text-sm font-bold text-[#F9FAFB]">{DEMO_TRANSAKSI.filter((r) => r.status === "cicil").length} siswa</p>
          </div>
        </div>
      </div>

      <Table columns={columns} data={DEMO_TRANSAKSI} />

      {/* Modal Input Pembayaran */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Catat Pembayaran"
        description="Masukkan detail transaksi pembayaran siswa."
      >
        <form
          data-form-container
          onKeyDown={handleEnterToNextField}
          className="flex flex-col gap-4"
          onSubmit={(e) => { e.preventDefault(); setModalOpen(false); }}
        >
          <Select label="Nama Siswa" name="siswa_id" required data-next="jumlah">
            <option value="">Pilih siswa...</option>
            {DEMO_TRANSAKSI.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
          </Select>
          <Input label="Jumlah Pembayaran (Rp)" name="jumlah" type="number" min={0} required placeholder="1500000" data-next="catatan" />
          <Input label="Catatan (opsional)" name="catatan" placeholder="Cicilan ke-2" data-next="submit" />
          <div className="flex gap-2 justify-end mt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button id="submit" type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
