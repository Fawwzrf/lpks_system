import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireStudentOwnerOrAdmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ siswa_id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { siswa_id } = await params;
    const { errorResponse: authError } = await requireStudentOwnerOrAdmin(siswa_id);
    if (authError) return authError;

    const supabase = await createClient();
    const { data: ujian, error } = await supabase
      .from("ujian")
      .select("*, siswa:siswa(id, nama_lengkap, nomor_induk, program:master_program(nama))")
      .eq("siswa_id", siswa_id)
      .single();

    if (error || !ujian) {
      return errorResponse("NOT_FOUND", "Data hasil ujian belum tersedia untuk siswa ini.", 404);
    }

    return successResponse(ujian);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memuat hasil ujian.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
