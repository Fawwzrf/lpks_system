import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin, requireAuth } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { errorResponse: authError } = await requireAuth();
    if (authError) return authError;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("master_program")
      .select("*")
      .order("kode_program", { ascending: true });

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal mengambil daftar program.", 500, error.message);
    }

    return successResponse(data);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memproses data program.",
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
    const { kode_program, nama, biaya, estimasi_durasi_hari } = body;

    if (!kode_program || !nama || biaya === undefined) {
      return errorResponse("VALIDATION_ERROR", "Kode program, nama, dan biaya wajib diisi.", 400);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("master_program")
      .insert({
        kode_program: String(kode_program).trim(),
        nama: String(nama).trim(),
        biaya: parseFloat(biaya),
        estimasi_durasi_hari: parseInt(estimasi_durasi_hari || 30, 10),
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return errorResponse("DUPLICATE_CODE", "Kode program sudah digunakan.", 409);
      }
      return errorResponse("DATABASE_ERROR", "Gagal menambahkan program.", 500, error.message);
    }

    return successResponse(data, undefined, 201);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal membuat program pelatihan baru.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return errorResponse("VALIDATION_ERROR", "Parameter id wajib disertakan.", 400);
    }

    const supabase = await createClient();
    const { error } = await supabase.from("master_program").delete().eq("id", id);

    if (error) {
      if (error.code === "23503") {
        return errorResponse("FK_CONSTRAINT", "Program tidak dapat dihapus karena masih digunakan oleh data siswa.", 409);
      }
      return errorResponse("DATABASE_ERROR", "Gagal menghapus program.", 500, error.message);
    }

    return successResponse({ deleted_id: id });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal menghapus data program.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

