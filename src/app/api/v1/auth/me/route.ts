import { successResponse, requireAuth, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { user, errorResponse: authError } = await requireAuth();
    if (authError) {
      return authError;
    }

    const supabase = await createClient();
    let siswaProfile = null;

    if (user?.role === "siswa") {
      const { data } = await supabase
        .from("siswa")
        .select("*, program:master_program(id, kode_program, nama, biaya)")
        .eq("auth_id", user.id)
        .single();
      siswaProfile = data;
    }

    return successResponse({
      user: {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        nama: user?.user_metadata?.nama,
        siswa: siswaProfile,
      },
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal mengambil informasi profil pengguna.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
