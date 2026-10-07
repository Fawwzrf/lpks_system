import React, { Suspense } from "react";
import { CardSkeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import {
  DashboardClient,
  type DashboardStats,
} from "./dashboard-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard Operasional — LPKS Sumbu Hidup",
  description:
    "Ringkasan kondisi operasional kelas pengelasan, siswa aktif, kehadiran hari ini, dan analitik AI.",
};

async function getInitialDashboardStats(): Promise<DashboardStats> {
  const todayStr = new Date().toISOString().split("T")[0];
  try {
    const supabase = await createClient();

    // Query paralel siswa aktif, presensi hadir hari ini, transaksi keuangan, dan ringkasan AI
    const [siswaRes, presensiRes, txRes, aiRes] = await Promise.all([
      supabase
        .from("siswa")
        .select("id", { count: "exact", head: true })
        .eq("status_siswa", "aktif")
        .neq("alamat_lengkap", "[DATA DIHAPUS]"),
      supabase
        .from("presensi")
        .select("id", { count: "exact", head: true })
        .eq("tanggal", todayStr)
        .eq("status", "Hadir"),
      supabase.from("transaksi_keuangan").select("nominal"),
      supabase
        .from("ai_ringkasan")
        .select("isi_ringkasan")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const aktifCount = siswaRes.count || 0;
    const hadirCount = presensiRes.count || 0;

    const txList = txRes.data || [];
    const totalPemasukan = txList.reduce(
      (acc, cur) => acc + Number(cur.nominal || 0),
      0
    );

    const insightText =
      aiRes.data?.isi_ringkasan ||
      "Semua operasional pelatihan pengelasan berjalan normal.";

    return {
      siswaAktif: aktifCount,
      hadirHariIni: hadirCount,
      totalPemasukan,
      layakUjian: Math.max(0, Math.round(aktifCount * 0.7)),
      aiInsight: insightText,
    };
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
    console.error("Gagal memuat statistik dashboard di Server Component:", error);
    return {
      siswaAktif: 0,
      hadirHariIni: 0,
      totalPemasukan: 0,
      layakUjian: 0,
      aiInsight: "Operasional pelatihan berjalan normal.",
    };
  }
}

async function DashboardContent() {
  const stats = await getInitialDashboardStats();
  return <DashboardClient initialStats={stats} />;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={<CardSkeleton count={4} className="grid-cols-2 lg:grid-cols-4 gap-3" />}
    >
      <DashboardContent />
    </Suspense>
  );
}
