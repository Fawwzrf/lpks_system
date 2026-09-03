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
    const { data: summaries, error } = await supabase
      .from("ai_ringkasan")
      .select("*")
      .eq("siswa_id", siswa_id)
      .order("tgl_generate", { ascending: false });

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal mengambil riwayat ringkasan AI.", 500, error.message);
    }

    return successResponse(summaries || []);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memuat data ringkasan AI.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
