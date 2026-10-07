import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PUT /api/v1/siswa/[id]/credentials — admin ubah atau buatkan username/password siswa
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

    // Ambil data siswa
    const { data: siswa, error: fetchError } = await supabase
      .from("siswa")
      .select("id, auth_id, username, nama_lengkap, nomor_induk")
      .eq("id", id)
      .single();

    if (fetchError || !siswa) {
      return errorResponse("NOT_FOUND", "Siswa tidak ditemukan.", 404);
    }

    const cleanUsername =
      typeof username === "string"
        ? username.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "")
        : null;

    if (cleanUsername) {
      if (cleanUsername.length < 3) {
        return errorResponse("VALIDATION_ERROR", "Username minimal 3 karakter.", 400);
      }
      const { data: dup } = await supabase
        .from("siswa")
        .select("id")
        .eq("username", cleanUsername)
        .neq("id", id)
        .maybeSingle();
      if (dup) {
        return errorResponse("DUPLICATE_USERNAME", "Username sudah digunakan siswa lain.", 409);
      }
    }

    // Jika siswa BELUM memiliki akun auth, buatkan akun baru (Aktivasi Akun)
    if (!siswa.auth_id) {
      const finalUsername = cleanUsername || siswa.username || `siswa@${id.slice(0, 4)}`;
      const finalPassword = password || finalUsername;
      const finalEmail = `${finalUsername.replace(/@/g, "")}@lpks.id`;

      const { data: createdAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: finalEmail,
        password: finalPassword,
        email_confirm: true,
        user_metadata: { role: "siswa", nama: siswa.nama_lengkap || finalUsername },
      });

      if (createError || !createdAuth?.user) {
        return errorResponse(
          "AUTH_CREATE_FAILED",
          `Gagal membuat akun login siswa: ${createError?.message || "Unknown error"}`,
          500
        );
      }

      await supabase.from("siswa").update({
        auth_id: createdAuth.user.id,
        username: finalUsername,
        is_password_default: true,
      }).eq("id", id);

      return successResponse({ message: "Akun login siswa berhasil dibuat dan diaktifkan!" });
    }

    // Jika siswa SUDAH memiliki akun auth, perbarui kredensial
    const authUpdate: { email?: string; password?: string } = {};
    if (cleanUsername) {
      authUpdate.email = `${cleanUsername.replace(/@/g, "")}@lpks.id`;
      await supabase.from("siswa").update({ username: cleanUsername }).eq("id", id);
    }

    if (password) {
      authUpdate.password = password;
      await supabase.from("siswa").update({ is_password_default: true }).eq("id", id);
    }

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
