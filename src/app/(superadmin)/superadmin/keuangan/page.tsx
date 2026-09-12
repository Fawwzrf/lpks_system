"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Download, Wallet, CheckCircle2, AlertTriangle, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { handleEnterToNextField } from "@/lib/form-utils";

interface TransaksiRow {
  id: string;
  tgl_bayar: string;
  nominal: number;
  metode: string;
  keterangan?: string;
  penerima?: string;
  siswa?: {
    id: string;
    nama_lengkap: string;
    nomor_induk: string;
    program?: { nama: string; biaya: number };
  };
}

interface SiswaOption {
  id: string;
  nomor_induk: string;
  nama_lengkap: string;
}

export default function KeuanganPage() {
  const [transaksiList, setTransaksiList] = useState<TransaksiRow[]>([]);
  const [siswaOptions, setSiswaOptions] = useState<SiswaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resTx, resSiswa] = await Promise.allSettled([
        fetch("/api/v1/keuangan"),
        fetch("/api/v1/siswa?status=aktif&limit=100"),
      ]);

      if (resTx.status === "fulfilled" && resTx.value.ok) {
        const jsonTx = await resTx.value.json();
        setTransaksiList(jsonTx.data || []);
      }
      if (resSiswa.status === "fulfilled" && resSiswa.value.ok) {
        const jsonSiswa = await resSiswa.value.json();
        setSiswaOptions(jsonSiswa.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat data keuangan:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCatatPembayaran(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      siswa_id: formData.get("siswa_id") as string,
      nominal: parseFloat(formData.get("nominal") as string),
      metode: (formData.get("metode") as string) || "Tunai",
      keterangan: (formData.get("keterangan") as string) || "Pembayaran Angsuran",
      tgl_bayar: new Date().toISOString().split("T")[0],
    };

    try {
      const res = await fetch("/api/v1/keuangan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error?.message || "Gagal mencatat pembayaran.");
        return;
      }

      setModalOpen(false);
      await loadData();
    } catch {
      setErrorMsg("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  const totalMasuk = transaksiList.reduce((acc, r) => acc + Number(r.nominal || 0), 0);

  const columns = [
    {
      key: "nomor_induk",
      header: "No. Induk",
      render: (r: TransaksiRow) => (
        <span className="font-mono text-xs text-[#DC2626] font-bold">{r.siswa?.nomor_induk || "—"}</span>
      ),
    },
    {
      key: "nama",
      header: "Nama Siswa",
      render: (r: TransaksiRow) => (
        <div>
          <p className="text-xs font-semibold text-[#F9FAFB]">{r.siswa?.nama_lengkap || "Siswa"}</p>
          <p className="text-[10px] text-[#6B7280]">{r.siswa?.program?.nama || "Pelatihan"}</p>
        </div>
      ),
    },
    {
      key: "tanggal",
      header: "Tgl. Bayar",
      render: (r: TransaksiRow) => (
        <span className="font-mono text-[11px] text-[#D1D5DB]">{formatDateIndo(r.tgl_bayar)}</span>
      ),
    },
    {
      key: "jumlah",
      header: "Jumlah Bayar",
      render: (r: TransaksiRow) => (
        <span className="text-[#10B981] font-bold text-xs">{formatRupiah(Number(r.nominal))}</span>
      ),
    },
    {
      key: "metode",
      header: "Metode",
      render: (r: TransaksiRow) => (
        <span className="text-xs text-[#9CA3AF]">{r.metode || "Tunai"}</span>
      ),
    },
    {
      key: "keterangan",
      header: "Keterangan",
      render: (r: TransaksiRow) => (
        <span className="text-xs text-[#D1D5DB]">{r.keterangan || "—"}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Keuangan</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Pencatatan transaksi pembayaran dan verifikasi lunas pelatihan.</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/v1/excel/export?modul=keuangan"
            download
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#1F2937] bg-[#111827] hover:bg-[#1F2937] text-xs font-medium text-[#D1D5DB] transition-colors"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export Excel
          </a>
          <Button size="sm" onClick={() => { setModalOpen(true); setErrorMsg(null); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Catat Pembayaran
          </Button>
          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:text-white transition-colors"
            title="Segarkan data keuangan"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4 flex items-center gap-3">
          <Wallet className="h-5 w-5 text-[#10B981]" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Total Pembayaran Masuk</p>
            <p className="text-sm font-bold text-[#F9FAFB]">{loading ? "..." : formatRupiah(totalMasuk)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-[#10B981]" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Total Transaksi</p>
            <p className="text-sm font-bold text-[#F9FAFB]">{loading ? "..." : `${transaksiList.length} transaksi`}</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-[#F59E0B]" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Siswa Terdaftar</p>
            <p className="text-sm font-bold text-[#F9FAFB]">{siswaOptions.length} siswa aktif</p>
          </div>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={7} columns={7} />
      ) : (
        <Table columns={columns} data={transaksiList} emptyMessage="Belum ada transaksi pembayaran yang tercatat." />
      )}

      {/* Modal Input Pembayaran */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Catat Pembayaran Siswa"
        description="Masukkan data transaksi pembayaran angsuran atau pelunasan."
      >
        <form
          data-form-container
          onKeyDown={handleEnterToNextField}
          className="flex flex-col gap-4"
          onSubmit={handleCatatPembayaran}
        >
          {errorMsg && (
            <div className="rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/20 p-2.5 text-xs text-[#F43F5E] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Select label="Pilih Siswa" name="siswa_id" required data-next="nominal">
            <option value="">Pilih siswa...</option>
            {siswaOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nomor_induk} — {s.nama_lengkap}
              </option>
            ))}
          </Select>

          <Input
            label="Nominal Pembayaran (Rp)"
            name="nominal"
            type="number"
            min={10000}
            required
            placeholder="1500000"
            data-next="metode"
          />

          <Select label="Metode Pembayaran" name="metode" required data-next="keterangan">
            <option value="Tunai">Tunai / Cash</option>
            <option value="Transfer Bank">Transfer Bank</option>
            <option value="QRIS">QRIS</option>
          </Select>

          <Input
            label="Keterangan Transaksi"
            name="keterangan"
            placeholder="Cicilan ke-1 / Pelunasan Pelatihan"
            data-next="submit"
          />

          <div className="flex gap-2 justify-end mt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button id="submit" type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</> : "Simpan Pembayaran"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
