import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin, requireAuth } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { errorResponse: authError } = await requireAuth();
    if (authError) return authError;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("master_lokasi")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      return errorResponse("DATABASE_ERROR", "Gagal mengambil lokasi LPKS.", 500, error.message);
    }

    return successResponse(
      data || {
        nama_titik: "Bengkel Las LPKS Sumbu Hidup",
        lat: -6.917464,
        lng: 107.619122,
        radius_meter: 100,
        is_active: true,
      }
    );
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memuat data lokasi LPKS.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json();
    const { nama_titik, lat, lng, radius_meter } = body;

    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    const numRadius = parseInt(radius_meter || 100, 10);

    if (isNaN(numLat) || isNaN(numLng) || isNaN(numRadius) || numRadius <= 0) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Latitude, longitude, dan radius valid (> 0) wajib diisi.",
        400
      );
    }

    const supabase = await createClient();

    // Dapatkan data lokasi aktif
    const { data: existing } = await supabase
      .from("master_lokasi")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .single();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from("master_lokasi")
        .update({
          nama_titik: nama_titik || "Bengkel Las LPKS Sumbu Hidup",
          lat: numLat,
          lng: numLng,
          radius_meter: numRadius,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from("master_lokasi")
        .insert({
          nama_titik: nama_titik || "Bengkel Las LPKS Sumbu Hidup",
          lat: numLat,
          lng: numLng,
          radius_meter: numRadius,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return successResponse({
      lokasi: result,
      message: `Titik GPS LPKS dan radius toleransi (${numRadius}m) berhasil diperbarui.`,
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memperbarui konfigurasi titik lokasi LPKS.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
