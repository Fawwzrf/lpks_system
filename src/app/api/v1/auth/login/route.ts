import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;
    // identifier = email (untuk admin) ATAU username (untuk siswa)

    if (!identifier || !password) {
      return errorResponse("VALIDATION_ERROR", "Identifier dan kata sandi wajib diisi.", 400);
    }

    const supabase = await createClient();

    // Tentukan email yang dipakai untuk login:
    // - Jika mengandung '@' DAN domain setelahnya bukan 'lpks.id', asumsikan email langsung (admin)
    // - Jika siswa, normalisasi handle (menghapus sufiks @lpks.id jika sudah ada, menghapus simbol @ separator)
    const trimmed = identifier.trim().toLowerCase();
    const isAdminEmail = trimmed.includes("@") && !trimmed.endsWith("@lpks.id") && trimmed.split("@").length === 2 && trimmed.split("@")[1].includes(".");
    
    let studentHandle = trimmed;
    if (studentHandle.endsWith("@lpks.id")) {
      studentHandle = studentHandle.slice(0, -"@lpks.id".length);
    }
    studentHandle = studentHandle.replace(/@/g, "");

    const loginEmail = isAdminEmail ? identifier.trim() : `${studentHandle}@lpks.id`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error || !data.user) {
      return errorResponse(
        "INVALID_CREDENTIALS",
        "Username/email atau kata sandi yang Anda masukkan salah.",
        401
      );
    }

    const role = data.user.user_metadata?.role || "siswa";
    const nama = data.user.user_metadata?.nama || data.user.email?.split("@")[0];

    let siswaId = null;
    let isPasswordDefault = false;
    let username = null;

    if (role === "siswa") {
      const { data: siswa } = await supabase
        .from("siswa")
        .select("id, is_password_default, username")
        .eq("auth_id", data.user.id)
        .single();
      siswaId = siswa?.id || null;
      isPasswordDefault = siswa?.is_password_default ?? false;
      username = siswa?.username || null;
    }

    return successResponse({
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
        nama,
        siswa_id: siswaId,
        username,
        is_password_default: isPasswordDefault,
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
