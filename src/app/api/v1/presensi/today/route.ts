import { successResponse, errorResponse, requireAuth } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { user, errorResponse: authError } = await requireAuth();
    if (authError) return authError;

    const supabase = await createClient();

    // Dapatkan data siswa aktif
    const { data: siswa } = await supabase
      .from("siswa")
      .select("id")
      .eq("auth_id", user?.id)
      .single();

    if (!siswa) {
      return errorResponse("STUDENT_NOT_FOUND", "Data siswa tidak ditemukan.", 404);
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const { data: presensi } = await supabase
      .from("presensi")
      .select("*")
      .eq("siswa_id", siswa.id)
      .eq("tanggal", todayStr)
      .single();

    // Cek juga sisa kuota percobaan attempt
    const { data: attempt } = await supabase
      .from("presensi_attempts")
      .select("attempt_count")
      .eq("siswa_id", siswa.id)
      .eq("tanggal", todayStr)
      .single();

    const usedAttempts = attempt?.attempt_count || 0;
    const remainingAttempts = Math.max(0, 3 - usedAttempts);

    return successResponse({
      sudah_absen: !!presensi,
      presensi: presensi || null,
      sisa_percobaan_hari_ini: remainingAttempts,
      tanggal: todayStr,
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal mengecek status presensi hari ini.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
