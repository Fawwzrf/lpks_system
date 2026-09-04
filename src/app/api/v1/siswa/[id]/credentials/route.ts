import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PUT /api/v1/siswa/[id]/credentials — admin ubah username/password siswa
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const { username, password } = body;

    if (!username && !password) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Minimal salah satu field (username atau password) harus diisi.",
        400
      );
    }
    if (password && password.length < 6) {
      return errorResponse("VALIDATION_ERROR", "Password baru minimal 6 karakter.", 400);
    }

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    // Ambil auth_id siswa
    const { data: siswa, error: fetchError } = await supabase
      .from("siswa")
      .select("id, auth_id, username")
      .eq("id", id)
      .single();

    if (fetchError || !siswa) {
      return errorResponse("NOT_FOUND", "Siswa tidak ditemukan.", 404);
    }
    if (!siswa.auth_id) {
      return errorResponse("NO_AUTH", "Siswa belum memiliki akun login.", 400);
    }

    // Build update payload untuk Supabase Auth
    const authUpdate: { email?: string; password?: string } = {};
    if (username) {
      // Validasi username: hanya alphanumeric
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanUsername.length < 3) {
        return errorResponse("VALIDATION_ERROR", "Username minimal 3 karakter.", 400);
      }
      // Cek duplikat username (kecuali milik siswa ini sendiri)
      const { data: dup } = await supabase
        .from("siswa")
        .select("id")
        .eq("username", cleanUsername)
        .neq("id", id)
        .maybeSingle();
      if (dup) {
        return errorResponse("DUPLICATE_USERNAME", "Username sudah digunakan siswa lain.", 409);
      }
      authUpdate.email = `${cleanUsername}@lpks.id`;

      // Update username di tabel siswa
      await supabase.from("siswa").update({ username: cleanUsername }).eq("id", id);
    }

    if (password) {
      authUpdate.password = password;
      // Jika admin set ulang password, tandai kembali sebagai default
      await supabase.from("siswa").update({ is_password_default: true }).eq("id", id);
    }

    // Update Supabase Auth user
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      siswa.auth_id,
      authUpdate
    );

    if (updateError) {
      return errorResponse(
        "AUTH_UPDATE_FAILED",
        "Gagal memperbarui akun login siswa.",
        500,
        updateError.message
      );
    }

    return successResponse({ message: "Kredensial siswa berhasil diperbarui." });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Terjadi kesalahan saat memperbarui kredensial.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
