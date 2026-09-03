import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireAuth, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const tanggal = searchParams.get("tanggal") || new Date().toISOString().split("T")[0];
    const siswaId = searchParams.get("siswa_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("presensi")
      .select("*, siswa:siswa(id, nomor_induk, nama_lengkap, program:master_program(nama))")
      .eq("tanggal", tanggal);

    if (siswaId) query = query.eq("siswa_id", siswaId);
    if (status) query = query.eq("status", status);

    query = query.order("jam", { ascending: false });

    const { data, error } = await query;

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal memuat log presensi.", 500, error.message);
    }

    return successResponse(data, { tanggal });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memuat rekap presensi.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse: authError } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { lat, lng } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return errorResponse(
        "INVALID_COORDINATES",
        "Koordinat GPS (lat dan lng) wajib disertakan dalam format numerik.",
        400
      );
    }

    const supabase = await createClient();

    // 1. Dapatkan profil siswa berdasarkan auth user aktif
    const { data: siswa } = await supabase
      .from("siswa")
      .select("id, nama_lengkap, nomor_induk")
      .eq("auth_id", user?.id)
      .single();

    if (!siswa) {
      return errorResponse(
        "STUDENT_NOT_FOUND",
        "Data siswa Anda tidak ditemukan atau belum terhubung.",
        404
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // 2. Proteksi Rate Limit Percobaan Presensi (L2: Max 3x per hari per siswa)
    const { data: attemptRecord } = await supabase
      .from("presensi_attempts")
      .select("id, attempt_count")
      .eq("siswa_id", siswa.id)
      .eq("tanggal", todayStr)
      .single();

    if (attemptRecord && attemptRecord.attempt_count >= 3) {
      return errorResponse(
        "RATE_LIMIT_EXCEEDED",
        "Batas percobaan presensi hari ini telah habis (maksimal 3 kali). Silakan hubungi admin.",
        429
      );
    }

    // Catat/update attempt count
    if (attemptRecord) {
      await supabase
        .from("presensi_attempts")
        .update({
          attempt_count: attemptRecord.attempt_count + 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", attemptRecord.id);
    } else {
      await supabase.from("presensi_attempts").insert({
        siswa_id: siswa.id,
        tanggal: todayStr,
        attempt_count: 1,
      });
    }

    // 3. Cek apakah sudah berhasil presensi hari ini (Anti-Double Entry)
    const { data: existingPresensi } = await supabase
      .from("presensi")
      .select("id, jam, status")
      .eq("siswa_id", siswa.id)
      .eq("tanggal", todayStr)
      .single();

    if (existingPresensi) {
      return errorResponse(
        "ALREADY_CHECKED_IN",
        `Anda sudah tercatat melakukan presensi hari ini pukul ${existingPresensi.jam} dengan status ${existingPresensi.status}.`,
        409
      );
    }

    // 4. Ambil titik lokasi master LPKS & radius toleransi
    const { data: lokasiLpks } = await supabase
      .from("master_lokasi")
      .select("lat, lng, radius_meter")
      .eq("is_active", true)
      .limit(1)
      .single();

    const targetLat = lokasiLpks?.lat ?? -6.917464;
    const targetLng = lokasiLpks?.lng ?? 107.619122;
    const maxRadius = lokasiLpks?.radius_meter ?? 100;

    // 5. Kalkulasi Jarak Haversine di Sisi Server (L1: Server-Side Validation)
    const { data: jarakMeter, error: rpcError } = await supabase.rpc(
      "calculate_haversine_distance",
      {
        lat1: lat,
        lon1: lng,
        lat2: targetLat,
        lon2: targetLng,
      }
    );

    if (rpcError) {
      return errorResponse(
        "CALCULATION_ERROR",
        "Gagal memvalidasi jarak geofencing.",
        500,
        rpcError.message
      );
    }

    const calculatedDistance = typeof jarakMeter === "number" ? jarakMeter : 999999;

    // Validasi radius: harus <= 100 meter
    if (calculatedDistance > maxRadius) {
      return errorResponse(
        "OUT_OF_GEOFENCE_RADIUS",
        `Presensi ditolak: Anda terdeteksi berada ${calculatedDistance} meter dari LPKS (batas toleransi maksimal ${maxRadius} meter).`,
        400,
        { jarak_meter: calculatedDistance, max_radius: maxRadius }
      );
    }

    // 6. Simpan Kehadiran
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0]; // "07:45:12"

    const { data: presensiResult, error: insertError } = await supabase
      .from("presensi")
      .insert({
        siswa_id: siswa.id,
        tanggal: todayStr,
        jam: timeStr,
        lat,
        lng,
        jarak_meter: calculatedDistance,
        status: "Hadir",
        created_by: "siswa",
      })
      .select()
      .single();

    if (insertError) {
      return errorResponse("DATABASE_ERROR", "Gagal menyimpan presensi.", 500, insertError.message);
    }

    return successResponse(
      {
        ...presensiResult,
        message: `Presensi berhasil dicatat. Jarak Anda: ${calculatedDistance} meter dari LPKS.`,
      },
      undefined,
      201
    );
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Terjadi kesalahan saat memproses presensi.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
