import React, { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { todayStr, formatPresensiWIBTime } from "@/lib/date-utils";
import {
  PresensiClient,
  type PresensiAllItem,
  type ProgramItem,
  type PresensiPengurusAllItem,
} from "./presensi-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rekap & Pemantauan Presensi — LPKS Sumbu Hidup",
  description:
    "Pemantauan absensi geofencing harian siswa aktif & pengurus/instruktur, entri manual status kehadiran, dan ekspor matriks presensi resmi.",
};

async function getInitialPresensiData(): Promise<{
  items: PresensiAllItem[];
  pengurusItems: PresensiPengurusAllItem[];
  programs: ProgramItem[];
  todayStr: string;
}> {
  const today = todayStr();
  try {
    const supabase = await createClient();

    // Query paralel master program, siswa aktif, presensi siswa, pengurus aktif & presensi pengurus hari ini
    const [progRes, siswaRes, presensiRes, pengurusRes, presensiPengurusRes] = await Promise.all([
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
        .eq("status_siswa", "aktif")
        .order("urutan_nomor", { ascending: true, nullsFirst: false })
        .order("nomor_induk", { ascending: true }),
      supabase
        .from("presensi")
        .select("id, siswa_id, tanggal, jam, status, jarak_meter, keterangan, created_by, created_at")
        .eq("tanggal", today),
      supabase
        .from("pengurus")
        .select("id, nip, nama_lengkap, jabatan, no_hp, email, is_active")
        .eq("is_active", true)
        .order("nip", { ascending: true }),
      supabase
        .from("presensi_pengurus")
        .select("id, pengurus_id, tanggal, jam, status, jarak_meter, keterangan, created_by, created_at")
        .eq("tanggal", today),
    ]);

    const programs: ProgramItem[] = progRes.data || [];
    const allSiswa = siswaRes.data || [];
    const presensiList = presensiRes.data || [];
    const allPengurus = pengurusRes.data || [];
    const presensiPengurusList = presensiPengurusRes.data || [];

    const presensiMap = new Map<string, (typeof presensiList)[number]>();
    presensiList.forEach((p) => {
      presensiMap.set(p.siswa_id, p);
    });

    const presensiPengurusMap = new Map<string, (typeof presensiPengurusList)[number]>();
    presensiPengurusList.forEach((p) => {
      presensiPengurusMap.set(p.pengurus_id, p);
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
              jam: formatPresensiWIBTime(presensiRecord.jam, presensiRecord.created_at, presensiRecord.status),
              jarak_meter: presensiRecord.jarak_meter,
              status: presensiRecord.status as "Hadir" | "Izin" | "Sakit" | "Alpa",
              created_by: presensiRecord.created_by,
              keterangan: presensiRecord.keterangan,
              created_at: presensiRecord.created_at,
            }
          : null,
        status: presensiRecord
          ? (presensiRecord.status as "Hadir" | "Izin" | "Sakit" | "Alpa")
          : "Belum Absen",
      };
    });

    const pengurusItems: PresensiPengurusAllItem[] = allPengurus.map((p) => {
      const pr = presensiPengurusMap.get(p.id) || null;
      return {
        id: p.id,
        pengurus: p,
        presensi: pr
          ? {
              id: pr.id,
              pengurus_id: pr.pengurus_id,
              tanggal: pr.tanggal,
              jam: formatPresensiWIBTime(pr.jam, pr.created_at, pr.status),
              jarak_meter: pr.jarak_meter,
              status: pr.status,
              created_by: pr.created_by,
              keterangan: pr.keterangan,
              created_at: pr.created_at,
            }
          : null,
        status: pr ? pr.status : "Belum Absen",
      };
    });

    return { items, pengurusItems, programs, todayStr: today };
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
    return { items: [], pengurusItems: [], programs: [], todayStr: today };
  }
}

async function PresensiContent() {
  const { items, pengurusItems, programs, todayStr } = await getInitialPresensiData();
  return (
    <PresensiClient
      initialItems={items}
      initialPengurusItems={pengurusItems}
      initialPrograms={programs}
      initialDate={todayStr}
    />
  );
}

export default function PresensiAdminPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={10} columns={6} />}>
      <PresensiContent />
    </Suspense>
  );
}
