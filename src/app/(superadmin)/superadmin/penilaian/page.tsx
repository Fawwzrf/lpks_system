import React, { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import {
  PenilaianClient,
  type SiswaPenilaianItem,
  type ProgramItem,
  type KriteriaItem,
} from "./penilaian-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Penilaian Praktek Pengelasan — LPKS Sumbu Hidup",
  description:
    "Monitoring penilaian harian praktek 5 kriteria pengelasan, grafik tren kompetensi, dan kelayakan ujian siswa.",
};

async function getInitialPenilaianData(): Promise<{
  items: SiswaPenilaianItem[];
  programs: ProgramItem[];
  kriteriaList: KriteriaItem[];
}> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    // Query paralel master program, master kriteria & siswa aktif
    const [progRes, kritRes, siswaRes] = await Promise.all([
      supabase
        .from("master_program")
        .select("id, kode_program, nama")
        .order("kode_program", { ascending: true }),
      supabase
        .from("master_kriteria")
        .select("id, nama_kriteria, batas_lulus, urutan")
        .order("urutan", { ascending: true }),
      supabase
        .from("siswa")
        .select(
          "id, nomor_induk, nama_lengkap, tgl_masuk, tgl_keluar, program_id, program:master_program(id, kode_program, nama)"
        )
        .not("nik", "like", "ANON-%")
        .neq("alamat_lengkap", "[DATA DIHAPUS]")
        .or(`tgl_keluar.is.null,tgl_keluar.gte.${today}`)
        .order("urutan_nomor", { ascending: true, nullsFirst: false })
        .order("nomor_induk", { ascending: true }),
    ]);

    const programs: ProgramItem[] = progRes.data || [];
    const kriteriaList: KriteriaItem[] = kritRes.data || [];
    const siswaList = siswaRes.data || [];
    const siswaIds = siswaList.map((s) => s.id);
    const totalKriteriaCount = kriteriaList.length || 5;

    // Ambil seluruh riwayat penilaian siswa aktif
    const { data: allNilai } = await supabase
      .from("penilaian_harian")
      .select("id, siswa_id, tanggal, nilai, kriteria_id")
      .in(
        "siswa_id",
        siswaIds.length > 0 ? siswaIds : ["00000000-0000-0000-0000-000000000000"]
      )
      .order("tanggal", { ascending: true });

    // Group per siswa_id
    const nilaiMap = new Map<string, NonNullable<typeof allNilai>>();
    allNilai?.forEach((n) => {
      if (!nilaiMap.has(n.siswa_id)) nilaiMap.set(n.siswa_id, []);
      nilaiMap.get(n.siswa_id)!.push(n);
    });

    const items: SiswaPenilaianItem[] = siswaList.map((s) => {
      const studentScores = nilaiMap.get(s.id) || [];
      const uniqueDates = new Set<string>();
      let sumScore = 0;
      let highestScore = 0;
      let latestDate: string | null = null;
      const maxPerKriteria = new Map<string, number>();

      studentScores.forEach((row) => {
        uniqueDates.add(row.tanggal);
        const score = Number(row.nilai || 0);
        sumScore += score;
        if (score > highestScore) highestScore = score;
        if (!latestDate || row.tanggal > latestDate) latestDate = row.tanggal;

        const currMax = maxPerKriteria.get(row.kriteria_id) || 0;
        if (score > currMax) maxPerKriteria.set(row.kriteria_id, score);
      });

      const totalHari = uniqueDates.size;
      const rataRata =
        studentScores.length > 0
          ? Math.round((sumScore / studentScores.length) * 10) / 10
          : 0;

      let kriteriaLulusCount = 0;
      kriteriaList.forEach((k) => {
        const maxK = maxPerKriteria.get(k.id) || 0;
        if (maxK >= k.batas_lulus) kriteriaLulusCount++;
      });

      const siapUjian =
        kriteriaLulusCount === totalKriteriaCount && totalKriteriaCount > 0;
      let status: "Siap Ujian" | "Dalam Bimbingan" | "Belum Dinilai" =
        "Belum Dinilai";
      if (studentScores.length > 0) {
        status = siapUjian ? "Siap Ujian" : "Dalam Bimbingan";
      }

      return {
        id: s.id,
        nomor_induk: s.nomor_induk,
        nama_lengkap: s.nama_lengkap,
        tgl_masuk: s.tgl_masuk,
        tgl_keluar: s.tgl_keluar,
        program: s.program as unknown as {
          id: string;
          kode_program: string;
          nama: string;
        } | undefined,
        total_hari: totalHari,
        total_penilaian: studentScores.length,
        rata_rata: rataRata,
        nilai_tertinggi: highestScore,
        kriteria_kompeten: kriteriaLulusCount,
        total_kriteria: totalKriteriaCount,
        siap_ujian: siapUjian,
        status,
        terakhir_dinilai: latestDate,
      };
    });

    return { items, programs, kriteriaList };
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
    console.error("Gagal memuat data penilaian di Server Component:", error);
    return { items: [], programs: [], kriteriaList: [] };
  }
}

export default async function PenilaianSuperadminPage() {
  const { items, programs, kriteriaList } = await getInitialPenilaianData();

  return (
    <Suspense fallback={<TableSkeleton rows={10} columns={6} />}>
      <PenilaianClient
        initialItems={items}
        initialPrograms={programs}
        initialKriteria={kriteriaList}
      />
    </Suspense>
  );
}
