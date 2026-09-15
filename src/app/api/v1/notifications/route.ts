import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    // 1. Hitung siswa di antrean percetakan
    const { count: queueCount } = await supabase
      .from("sertifikat")
      .select("*", { count: "exact", head: true })
      .eq("status", "antrean");

    // 2. Hitung siswa aktif
    const { data: siswaList } = await supabase
      .from("siswa")
      .select("id, tgl_masuk, tgl_keluar, program:master_program(biaya)")
      .not("nik", "like", "ANON-%")
      .neq("alamat_lengkap", "[DATA DIHAPUS]");

    const validSiswa = siswaList || [];
    const activeSiswa = validSiswa.filter(
      (s) => !s.tgl_keluar || s.tgl_keluar >= today
    );

    // 3. Hitung siswa yang baru mendaftar (dalam 7 hari terakhir)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
    const newRegistrations = validSiswa.filter(
      (s) => s.tgl_masuk && s.tgl_masuk >= sevenDaysAgoStr
    ).length;

    // 4. Hitung siswa siap ujian internal
    const { data: ujianList } = await supabase
      .from("ujian")
      .select("siswa_id, is_lulus");
    const lulusUjianSet = new Set(
      (ujianList || []).filter((u) => u.is_lulus).map((u) => u.siswa_id)
    );

    const { data: nilaiHarian } = await supabase
      .from("penilaian_harian")
      .select("siswa_id, kriteria_id, nilai");

    const studentKriteriaPass = new Map<string, Set<string>>();
    (nilaiHarian || []).forEach((nh) => {
      if (nh.nilai >= 80) {
        if (!studentKriteriaPass.has(nh.siswa_id)) {
          studentKriteriaPass.set(nh.siswa_id, new Set());
        }
        studentKriteriaPass.get(nh.siswa_id)!.add(nh.kriteria_id);
      }
    });

    let siapUjianCount = 0;
    activeSiswa.forEach((s) => {
      const passedCount = studentKriteriaPass.get(s.id)?.size || 0;
      const isLulus = lulusUjianSet.has(s.id);
      if (passedCount >= 5 && !isLulus) {
        siapUjianCount++;
      }
    });

    // 5. Susun daftar notifikasi dinamis
    const notifications = [];

    if ((queueCount || 0) > 0) {
      notifications.push({
        id: "antrean-sertifikat",
        title: "Antrean Percetakan Sertifikat",
        message: `${queueCount} siswa berada dalam antrean siap cetak ke percetakan.`,
        type: "success",
        link: "/superadmin/ujian",
        count: queueCount,
        created_at: "Hari ini",
      });
    }

    if (siapUjianCount > 0) {
      notifications.push({
        id: "siap-ujian",
        title: "Siswa Siap Ujian Internal",
        message: `${siapUjianCount} siswa telah memenuhi seluruh nilai harian dan siap diuji internal.`,
        type: "info",
        link: "/superadmin/ujian",
        count: siapUjianCount,
        created_at: "Hari ini",
      });
    }

    if (newRegistrations > 0) {
      notifications.push({
        id: "pendaftaran-baru",
        title: "Pendaftaran Siswa Baru",
        message: `${newRegistrations} pendaftar baru tercatat dalam 7 hari terakhir.`,
        type: "info",
        link: "/superadmin/siswa",
        count: newRegistrations,
        created_at: "Minggu ini",
      });
    }

    // Default system alert jika tidak ada notifikasi mendesak
    if (notifications.length === 0) {
      notifications.push({
        id: "sistem-normal",
        title: "Sistem Operasional Normal",
        message: "Tidak ada antrean atau tindakan mendesak yang tertunda.",
        type: "default",
        link: "/superadmin/dashboard",
        count: 0,
        created_at: "Saat ini",
      });
    }

    const totalAlerts = (queueCount || 0) + siapUjianCount;

    return successResponse(notifications, { total_unread: totalAlerts });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memuat notifikasi sistem.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
