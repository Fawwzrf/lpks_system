import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

// POST /api/v1/auth/change-password — siswa ganti kata sandi sendiri
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verifikasi session aktif
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    if (sessionError || !user) {
      return errorResponse("UNAUTHORIZED", "Sesi tidak valid. Silakan login ulang.", 401);
    }

    // Hanya siswa yang boleh pakai endpoint ini
    if (user.user_metadata?.role !== "siswa") {
      return errorResponse("FORBIDDEN", "Endpoint ini hanya untuk siswa.", 403);
    }

    const body = await request.json();
    const { password_baru } = body;

    if (!password_baru || typeof password_baru !== "string") {
      return errorResponse("VALIDATION_ERROR", "Password baru wajib diisi.", 400);
    }
    if (password_baru.length < 6) {
      return errorResponse("VALIDATION_ERROR", "Password baru minimal 6 karakter.", 400);
    }

    // Update password via Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: password_baru,
    });

    if (updateError) {
      return errorResponse(
        "PASSWORD_UPDATE_FAILED",
        "Gagal mengubah kata sandi.",
        500,
        updateError.message
      );
    }

    // Tandai is_password_default = false
    await supabase
      .from("siswa")
      .update({ is_password_default: false })
      .eq("auth_id", user.id);

    return successResponse({ message: "Kata sandi berhasil diubah." });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Terjadi kesalahan saat mengubah kata sandi.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
