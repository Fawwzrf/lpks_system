import { successResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return errorResponse("LOGOUT_FAILED", "Gagal mengeluarkan sesi.", 500, error.message);
    }

    return successResponse({
      message: "Berhasil keluar dari sistem.",
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Terjadi kesalahan saat memproses logout.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
