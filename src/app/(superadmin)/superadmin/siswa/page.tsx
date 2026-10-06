import React, { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { SiswaClient, type SiswaItem, type ProgramItem } from "./siswa-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Data Siswa — LPKS Sumbu Hidup",
  description: "Direktori data seluruh siswa pelatihan pengelasan dan manajemen akun login.",
};

async function getInitialSiswaData(): Promise<{
  siswa: SiswaItem[];
  total: number;
  programs: ProgramItem[];
}> {
  try {
    const supabase = await createClient();

    // Query paralel master program & 15 data siswa aktif pertama
    const [progRes, siswaRes] = await Promise.all([
      supabase
        .from("master_program")
        .select("id, kode_program, nama, biaya, estimasi_durasi_hari")
        .order("kode_program", { ascending: true }),
      supabase
        .from("siswa")
        .select("*, program:master_program(id, kode_program, nama, biaya)", { count: "exact" })
        .neq("alamat_lengkap", "[DATA DIHAPUS]")
        .eq("status_siswa", "aktif")
        .order("urutan_nomor", { ascending: true, nullsFirst: false })
        .order("nomor_induk", { ascending: true })
        .range(0, 14),
    ]);

    const programs: ProgramItem[] = progRes.data || [];
    const siswa: SiswaItem[] = siswaRes.data || [];
    const total = siswaRes.count || 0;

    // Sorting numerik nomor urut belakang
    const getUrutan = (noInduk?: string | null) => {
      if (!noInduk) return 999999;
      if (noInduk.includes("—") || noInduk.includes("-")) return 1110.5;
      const parts = noInduk.split(".");
      const lastPart = parts.length > 1 ? parts.slice(1).join(".") : parts[0];
      const num = parseInt(lastPart.replace(/\D/g, ""), 10);
      return isNaN(num) ? 999999 : num;
    };
    siswa.sort((a, b) => getUrutan(a.nomor_induk) - getUrutan(b.nomor_induk));

    return { siswa, total, programs };
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
    console.error("Gagal melakukan SSR prefetch data siswa:", error);
    // Fallback gracefully to empty state (client-side will hydrate)
    return { siswa: [], total: 0, programs: [] };
  }
}

async function SiswaContent() {
  const { siswa, total, programs } = await getInitialSiswaData();

  return (
    <SiswaClient
      initialSiswa={siswa}
      initialTotal={total}
      initialPrograms={programs}
    />
  );
}

export default function SiswaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="h-6 w-32 bg-[#1F2937] rounded animate-pulse" />
              <div className="h-4 w-64 bg-[#1F2937] rounded mt-2 animate-pulse" />
            </div>
          </div>
          <TableSkeleton rows={8} columns={6} />
        </div>
      }
    >
      <SiswaContent />
    </Suspense>
  );
}
