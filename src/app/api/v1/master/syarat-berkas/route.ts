import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin, requireAuth } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { errorResponse: authError } = await requireAuth();
    if (authError) return authError;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("master_syarat_berkas")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal mengambil syarat berkas.", 500, error.message);
    }

    return successResponse(data);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memuat syarat berkas.",
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
    const { kode_berkas, nama_berkas, wajib } = body;

    if (!kode_berkas || !nama_berkas) {
      return errorResponse("VALIDATION_ERROR", "Kode dan nama berkas wajib diisi.", 400);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("master_syarat_berkas")
      .insert({
        kode_berkas: String(kode_berkas).trim(),
        nama_berkas: String(nama_berkas).trim(),
        wajib: wajib ?? true,
      })
      .select()
      .single();

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal menambahkan syarat berkas.", 500, error.message);
    }

    return successResponse(data, undefined, 201);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal membuat syarat berkas baru.",
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
    const { error } = await supabase.from("master_syarat_berkas").delete().eq("id", id);

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal menghapus syarat berkas.", 500, error.message);
    }

    return successResponse({ deleted_id: id });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal menghapus data syarat berkas.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

