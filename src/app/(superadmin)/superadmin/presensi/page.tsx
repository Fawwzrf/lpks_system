import React, { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import {
  PresensiClient,
  type PresensiAllItem,
  type ProgramItem,
} from "./presensi-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rekap & Pemantauan Presensi — LPKS Sumbu Hidup",
  description:
    "Pemantauan absensi geofencing harian siswa aktif, entri manual status kehadiran, dan ekspor matriks presensi resmi.",
};

async function getInitialPresensiData(): Promise<{
  items: PresensiAllItem[];
  programs: ProgramItem[];
  todayStr: string;
}> {
  const todayStr = new Date().toISOString().split("T")[0];
  try {
    const supabase = await createClient();

    // Query paralel master program, siswa aktif & presensi hari ini
    const [progRes, siswaRes, presensiRes] = await Promise.all([
      supabase
        .from("master_program")
        .select("id, kode_program, nama")
        .order("kode_program", { ascending: true }),
      supabase
        .from("siswa")
        .select(
          "id, nomor_induk, nama_lengkap, program_id, program:master_program(id, kode_program, nama)"
        )
        .not("nik", "like", "ANON-%")
        .neq("alamat_lengkap", "[DATA DIHAPUS]")
        .or(`tgl_keluar.is.null,tgl_keluar.gte.${todayStr}`)
        .order("urutan_nomor", { ascending: true, nullsFirst: false })
        .order("nomor_induk", { ascending: true }),
      supabase
        .from("presensi")
        .select("id, siswa_id, tanggal, jam, status, jarak_meter, keterangan, created_by")
        .eq("tanggal", todayStr),
    ]);

    const programs: ProgramItem[] = progRes.data || [];
    const allSiswa = siswaRes.data || [];
    const presensiList = presensiRes.data || [];

    const presensiMap = new Map<string, (typeof presensiList)[number]>();
    presensiList.forEach((p) => {
      presensiMap.set(p.siswa_id, p);
    });

    const items: PresensiAllItem[] = allSiswa.map((s) => {
      const presensiRecord = presensiMap.get(s.id) || null;
      return {
        id: s.id,
        siswa: {
          id: s.id,
          nomor_induk: s.nomor_induk,
          nama_lengkap: s.nama_lengkap,
          program_id: s.program_id,
          program: s.program as unknown as {
            id: string;
            kode_program: string;
            nama: string;
          } | undefined,
        },
        presensi: presensiRecord
          ? {
              id: presensiRecord.id,
              siswa_id: presensiRecord.siswa_id,
              tanggal: presensiRecord.tanggal,
              jam: presensiRecord.jam,
              jarak_meter: presensiRecord.jarak_meter,
              status: presensiRecord.status as "Hadir" | "Izin" | "Sakit" | "Alpa",
              created_by: presensiRecord.created_by,
              keterangan: presensiRecord.keterangan,
            }
          : null,
        status: presensiRecord
          ? (presensiRecord.status as "Hadir" | "Izin" | "Sakit" | "Alpa")
          : "Belum Absen",
      };
    });

    return { items, programs, todayStr };
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
    console.error("Gagal memuat data presensi di Server Component:", error);
    return { items: [], programs: [], todayStr };
  }
}

export default async function PresensiAdminPage() {
  const { items, programs, todayStr } = await getInitialPresensiData();

  return (
    <Suspense fallback={<TableSkeleton rows={10} columns={6} />}>
      <PresensiClient
        initialItems={items}
        initialPrograms={programs}
        initialDate={todayStr}
      />
    </Suspense>
  );
}
