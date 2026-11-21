import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireAuth } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { haversineDistance, isWithinGeofence, inspectGpsTelemetry } from "@/lib/geo";
import { getWIBTimeStr, todayStr, formatPresensiWIBTime } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireAuth();
    if (authError) return authError;

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const tanggal = searchParams.get("tanggal") || todayStr();
    const viewType = searchParams.get("view_type"); // 'all_pengurus'
    const status = searchParams.get("status");

    // Mode all_pengurus: Tampilkan seluruh pengurus aktif beserta status presensi pada tanggal tersebut
    if (viewType === "all_pengurus") {
      const { data: allPengurus, error: pengurusError } = await supabase
        .from("pengurus")
        .select("id, nip, nama_lengkap, jabatan, no_hp, email, is_active")
        .eq("is_active", true)
        .order("nip", { ascending: true });

      if (pengurusError) {
        return errorResponse("DATABASE_ERROR", "Gagal memuat data pengurus.", 500, pengurusError.message);
      }

      const { data: presensiList, error: presensiError } = await supabase
        .from("presensi_pengurus")
        .select("id, pengurus_id, tanggal, jam, status, jarak_meter, keterangan, created_by, created_at")
        .eq("tanggal", tanggal);

      if (presensiError) {
        return errorResponse("DATABASE_ERROR", "Gagal memuat log presensi pengurus.", 500, presensiError.message);
      }

      const presensiMap = new Map<string, (typeof presensiList)[number]>();
      presensiList?.forEach((p) => {
        presensiMap.set(p.pengurus_id, p);
      });

      const result = (allPengurus || []).map((p) => {
        const presensiRecord = presensiMap.get(p.id) || null;
        const formattedJam = presensiRecord
          ? formatPresensiWIBTime(presensiRecord.jam, presensiRecord.created_at, presensiRecord.status)
          : null;

        return {
          id: p.id,
          pengurus: p,
          presensi: presensiRecord
            ? {
                ...presensiRecord,
                jam: formattedJam || presensiRecord.jam,
              }
            : null,
          status: presensiRecord ? presensiRecord.status : ("Belum Absen" as const),
        };
      });

      const filteredResult = status
        ? result.filter((item) => (status === "Belum Absen" ? !item.presensi : item.status === status))
        : result;

      return successResponse(filteredResult);
    }

    // Default: query list presensi_pengurus
    let query = supabase
      .from("presensi_pengurus")
      .select("*, pengurus:pengurus(id, nip, nama_lengkap, jabatan)")
      .eq("tanggal", tanggal)
      .order("jam", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal memuat presensi pengurus.", 500, error.message);
    }

    return successResponse(data || []);
  } catch (err) {
    return errorResponse("INTERNAL_ERROR", "Terjadi kesalahan internal.", 500, err instanceof Error ? err.message : String(err));
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse: authError } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const today = todayStr();
    const supabase = await createClient();

    // 1. KASUS MANUAL OVERRIDE (SUPERADMIN)
    if (user?.role === "superadmin" && body.mode !== "gps") {
      const { pengurus_id, tanggal, status, keterangan } = body;
      if (!pengurus_id || !status) {
        return errorResponse("VALIDATION_ERROR", "pengurus_id dan status wajib disertakan.", 400);
      }

      const validStatuses = ["Hadir", "Izin", "Sakit", "Cuti", "Alpa", "Tugas Luar"];
      if (!validStatuses.includes(status)) {
        return errorResponse("INVALID_STATUS", `Status harus salah satu dari: ${validStatuses.join(", ")}.`, 400);
      }

      const targetDate = tanggal || today;

      // Cek apakah data presensi pengurus pada tanggal tersebut sudah ada
      const { data: existing } = await supabase
        .from("presensi_pengurus")
        .select("id")
        .eq("pengurus_id", pengurus_id)
        .eq("tanggal", targetDate)
        .maybeSingle();

      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from("presensi_pengurus")
          .update({
            status,
            keterangan: keterangan || null,
            created_by: "superadmin",
          })
          .eq("id", existing.id)
          .select("*, pengurus:pengurus(id, nip, nama_lengkap, jabatan)")
          .single();

        if (updateError) {
          return errorResponse("DATABASE_ERROR", "Gagal memperbarui presensi pengurus.", 500, updateError.message);
        }

        return successResponse({
          presensi: updated,
          message: `Presensi pengurus berhasil diperbarui menjadi ${status}.`,
        });
      } else {
        const timeStr = getWIBTimeStr();
        const { data: inserted, error: insertError } = await supabase
          .from("presensi_pengurus")
          .insert({
            pengurus_id,
            tanggal: targetDate,
            jam: timeStr,
            status,
            keterangan: keterangan || null,
            created_by: "superadmin",
          })
          .select("*, pengurus:pengurus(id, nip, nama_lengkap, jabatan)")
          .single();

        if (insertError) {
          return errorResponse("DATABASE_ERROR", "Gagal mencatat presensi pengurus.", 500, insertError.message);
        }

        return successResponse(
          {
            presensi: inserted,
            message: `Presensi pengurus berhasil dicatat sebagai ${status}.`,
          },
          undefined,
          201
        );
      }
    }

    // 2. KASUS PRESENSI MANDIRI VIA GPS GEOFENCING
    const { pengurus_id, lat, lng, telemetry } = body;
    if (!pengurus_id || typeof lat !== "number" || typeof lng !== "number") {
      return errorResponse("VALIDATION_ERROR", "pengurus_id, lat, dan lng wajib disertakan secara valid.", 400);
    }

    // Ambil master lokasi bengkel LPKS
    const { data: masterLokasi } = await supabase
      .from("master_lokasi")
      .select("lat, lng, radius_meter")
      .limit(1)
      .maybeSingle();

    const centerLat = masterLokasi?.lat ?? -7.69897507696962;
    const centerLon = masterLokasi?.lng ?? 109.010520861496;
    const maxRadius = masterLokasi?.radius_meter ?? 100;

    // Cek telemetri anti-fake GPS
    if (telemetry) {
      const telemetryCheck = inspectGpsTelemetry(telemetry);
      if (!telemetryCheck.valid) {
        return errorResponse("GPS_TELEMETRY_INVALID", telemetryCheck.message || "Telemetri GPS terdeteksi anomali.", 403);
      }
    }

    // Hitung jarak Haversine
    const jarak = Math.round(haversineDistance(lat, lng, centerLat, centerLon));
    const isInside = isWithinGeofence(lat, lng, centerLat, centerLon, maxRadius);

    if (!isInside) {
      return errorResponse(
        "OUT_OF_RADIUS",
        `Presensi ditolak. Anda berada ${jarak}m dari bengkel LPKS (Batas maksimal ${maxRadius}m).`,
        400,
        { jarak_meter: jarak, max_radius: maxRadius }
      );
    }

    // Cek apakah sudah pernah presensi hari ini
    const { data: existingToday } = await supabase
      .from("presensi_pengurus")
      .select("id, jam, status")
      .eq("pengurus_id", pengurus_id)
      .eq("tanggal", today)
      .maybeSingle();

    if (existingToday) {
      return errorResponse(
        "ALREADY_ATTENDED",
        `Pengurus sudah tercatat presensi hari ini (${existingToday.status}) pada pukul ${existingToday.jam}.`,
        409
      );
    }

    const timeStr = getWIBTimeStr();
    const { data: newPresensi, error: insertError } = await supabase
      .from("presensi_pengurus")
      .insert({
        pengurus_id,
        tanggal: today,
        jam: timeStr,
        lat,
        lng,
        jarak_meter: jarak,
        status: "Hadir",
        created_by: "mandiri",
      })
      .select("*, pengurus:pengurus(id, nip, nama_lengkap, jabatan)")
      .single();

    if (insertError) {
      return errorResponse("DATABASE_ERROR", "Gagal menyimpan presensi pengurus.", 500, insertError.message);
    }

    return successResponse(
      {
        presensi: newPresensi,
        jarak_meter: jarak,
        message: `Presensi Hadir berhasil dicatat pukul ${timeStr} (Jarak: ${jarak}m).`,
      },
      undefined,
      201
    );
  } catch (err) {
    return errorResponse("INTERNAL_ERROR", "Terjadi kesalahan internal.", 500, err instanceof Error ? err.message : String(err));
  }
}

