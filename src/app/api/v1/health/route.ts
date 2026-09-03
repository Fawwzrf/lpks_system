import { successResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("master_program").select("id").limit(1);

    if (error) {
      return errorResponse(
        "DATABASE_UNAVAILABLE",
        "Layanan basis data tidak dapat dijangkau.",
        503,
        error.message
      );
    }

    return successResponse({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: "LPKS System Backend API v1",
    });
  } catch (err) {
    return errorResponse(
      "SERVER_ERROR",
      "Pemeriksaan kesehatan sistem gagal.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
