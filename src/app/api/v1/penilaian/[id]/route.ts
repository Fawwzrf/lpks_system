import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json();
    const { nilai, catatan } = body;

    const val = parseInt(nilai, 10);
    if (isNaN(val) || val < 0 || val > 100) {
      return errorResponse("INVALID_SCORE", "Nilai harus di antara 0 dan 100.", 400);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("penilaian_harian")
      .update({
        nilai: val,
        catatan: catatan || null,
        created_by: "superadmin", // ditandai sebagai koreksi admin
      })
      .eq("id", id)
      .select("*, kriteria:master_kriteria(*)")
      .single();

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal memperbarui nilai.", 500, error.message);
    }

    return successResponse({
      penilaian: data,
      message: "Nilai berhasil diperbarui oleh Superadmin.",
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memperbarui penilaian.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const supabase = await createClient();
    const { error } = await supabase.from("penilaian_harian").delete().eq("id", id);

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal menghapus nilai.", 500, error.message);
    }

    return successResponse({
      message: "Data penilaian berhasil dihapus.",
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal menghapus penilaian.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
