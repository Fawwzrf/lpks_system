import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const supabase = await createClient();
    const activeOnly = request.nextUrl.searchParams.get("active_only") === "true";

    let query = supabase
      .from("pengurus")
      .select("*")
      .order("nip", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal memuat data pengurus.", 500, error.message);
    }

    return successResponse(data || []);
  } catch (err) {
    return errorResponse("INTERNAL_ERROR", "Terjadi kesalahan internal.", 500, err instanceof Error ? err.message : String(err));
  }
}

export async function POST(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json();
    const { nip, nama_lengkap, jabatan, no_hp, email } = body || {};

    if (!nip || !nama_lengkap || !jabatan) {
      return errorResponse("VALIDATION_ERROR", "NIP, Nama Lengkap, dan Jabatan wajib diisi.", 400);
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("pengurus")
      .insert({
        nip: String(nip).trim(),
        nama_lengkap: String(nama_lengkap).trim(),
        jabatan: String(jabatan).trim(),
        no_hp: no_hp ? String(no_hp).trim() : null,
        email: email ? String(email).trim() : null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return errorResponse("DUPLICATE_NIP", `NIP '${nip}' sudah digunakan oleh pengurus lain.`, 409);
      }
      return errorResponse("DATABASE_ERROR", "Gagal menyimpan pengurus baru.", 500, error.message);
    }

    return successResponse(data, { message: "Data pengurus berhasil ditambahkan." }, 201);
  } catch (err) {
    return errorResponse("INTERNAL_ERROR", "Terjadi kesalahan internal.", 500, err instanceof Error ? err.message : String(err));
  }
}
