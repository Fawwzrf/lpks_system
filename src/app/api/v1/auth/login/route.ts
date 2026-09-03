import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("VALIDATION_ERROR", "Email dan kata sandi wajib diisi.", 400);
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      return errorResponse(
        "INVALID_CREDENTIALS",
        "Email atau kata sandi yang Anda masukkan salah.",
        401
      );
    }

    const role = data.user.user_metadata?.role || "siswa";
    const nama = data.user.user_metadata?.nama || data.user.email?.split("@")[0];

    // Jika role siswa, ambil data siswa terkait
    let siswaId = null;
    if (role === "siswa") {
      const { data: siswa } = await supabase
        .from("siswa")
        .select("id")
        .eq("auth_id", data.user.id)
        .single();
      siswaId = siswa?.id || null;
    }

    return successResponse({
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
        nama,
        siswa_id: siswaId,
      },
      message: "Login berhasil.",
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Terjadi kesalahan saat memproses login.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
