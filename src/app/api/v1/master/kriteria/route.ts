import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin, requireAuth } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { errorResponse: authError } = await requireAuth();
    if (authError) return authError;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("master_kriteria")
      .select("*")
      .order("urutan", { ascending: true });

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal mengambil kriteria penilaian.", 500, error.message);
    }

    return successResponse(data);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memuat kriteria penilaian.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json();
    const { nama_kriteria, batas_lulus, urutan } = body;

    if (!nama_kriteria) {
      return errorResponse("VALIDATION_ERROR", "Nama kriteria wajib diisi.", 400);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("master_kriteria")
      .insert({
        nama_kriteria: String(nama_kriteria).trim(),
        batas_lulus: parseInt(batas_lulus || 80, 10),
        urutan: parseInt(urutan || 1, 10),
      })
      .select()
      .single();

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal menambahkan kriteria.", 500, error.message);
    }

    return successResponse(data, undefined, 201);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal membuat kriteria baru.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
