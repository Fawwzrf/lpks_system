import React, { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import {
  KeuanganClient,
  type SiswaKeuanganItem,
  type ProgramItem,
} from "./keuangan-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manajemen Keuangan — LPKS Sumbu Hidup",
  description:
    "Pelacakan pembayaran SPP, cicilan pelatihan, penerbitan kwitansi, dan rekap keuangan siswa.",
};

async function getInitialKeuanganData(): Promise<{
  items: SiswaKeuanganItem[];
  programs: ProgramItem[];
}> {
  try {
    const supabase = await createClient();

    // Query paralel master program & data siswa
    const [progRes, siswaRes] = await Promise.all([
      supabase
        .from("master_program")
        .select("id, kode_program, nama, biaya")
        .order("kode_program", { ascending: true }),
      supabase
        .from("siswa")
        .select(
          "id, nomor_induk, nama_lengkap, tgl_masuk, tgl_keluar, status_siswa, program_id, biaya_pelatihan, program:master_program(id, kode_program, nama, biaya)"
        )
        .neq("alamat_lengkap", "[DATA DIHAPUS]")
        .order("urutan_nomor", { ascending: true, nullsFirst: false })
        .order("nomor_induk", { ascending: true }),
    ]);

    const programs: ProgramItem[] = progRes.data || [];
    const siswaList = siswaRes.data || [];

    const siswaIds = siswaList.map((s) => s.id);
    const { data: txList } = await supabase
      .from("transaksi_keuangan")
      .select("id, siswa_id, nominal, tgl_bayar, metode, keterangan, penerima, created_at")
      .in(
        "siswa_id",
        siswaIds.length > 0 ? siswaIds : ["00000000-0000-0000-0000-000000000000"]
      )
      .order("tgl_bayar", { ascending: false });

    const txMap = new Map<string, typeof txList>();
    txList?.forEach((tx) => {
      if (!txMap.has(tx.siswa_id)) txMap.set(tx.siswa_id, []);
      txMap.get(tx.siswa_id)!.push(tx);
    });

    const items: SiswaKeuanganItem[] = siswaList.map((s) => {
      const program = s.program as unknown as {
        id: string;
        kode_program: string;
        nama: string;
        biaya: number;
      } | null;
      const programBiaya = Number(program?.biaya || 0);
      const totalBiaya =
        s.biaya_pelatihan !== null && s.biaya_pelatihan !== undefined
          ? Number(s.biaya_pelatihan)
          : programBiaya;
      const studentTx = txMap.get(s.id) || [];
      const totalTerbayar = studentTx.reduce(
        (acc, curr) => acc + Number(curr.nominal || 0),
        0
      );
      const sisaTagihan = Math.max(0, totalBiaya - totalTerbayar);
      const isLunas = totalBiaya > 0 && totalTerbayar >= totalBiaya;
      const persentase =
        totalBiaya > 0
          ? Math.min(100, Math.round((totalTerbayar / totalBiaya) * 100))
          : 0;
      const status: "Lunas" | "Cicilan" | "Belum Bayar" = isLunas
        ? "Lunas"
        : totalTerbayar > 0
        ? "Cicilan"
        : "Belum Bayar";

      return {
        id: s.id,
        nomor_induk: s.nomor_induk,
        nama_lengkap: s.nama_lengkap,
        status_siswa: (s.status_siswa || "aktif") as "aktif" | "alumni" | "out",
        tgl_masuk: s.tgl_masuk,
        tgl_keluar: s.tgl_keluar,
        program: program || undefined,
        biaya_pelatihan:
          s.biaya_pelatihan !== null && s.biaya_pelatihan !== undefined
            ? Number(s.biaya_pelatihan)
            : null,
        total_biaya: totalBiaya,
        total_terbayar: totalTerbayar,
        sisa_tagihan: sisaTagihan,
        is_lunas: isLunas,
        persentase: persentase,
        status: status,
        riwayat_transaksi: studentTx,
      };
    });

    return { items, programs };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("DYNAMIC_SERVER_USAGE")
    ) {
      throw error;
    }
    console.error("Gagal memuat data keuangan di Server Component:", error);
    return { items: [], programs: [] };
  }
}

export default async function KeuanganSuperadminPage() {
  const { items, programs } = await getInitialKeuanganData();

  return (
    <Suspense fallback={<TableSkeleton rows={10} columns={6} />}>
      <KeuanganClient initialItems={items} initialPrograms={programs} />
    </Suspense>
  );
}
