import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveLoginCandidateEmails } from "@/lib/gate-checks";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return errorResponse("VALIDATION_ERROR", "Identifier dan kata sandi wajib diisi.", 400);
    }

    const trimmed = String(identifier).trim();
    const lower = trimmed.toLowerCase();
    const supabase = await createClient();

    // 1. Kumpulkan seluruh kandidat email yang mungkin terdaftar di Supabase Auth
    const candidateEmails = resolveLoginCandidateEmails(identifier);

    // 2. Jika ada Admin Client, lakukan pencocokan cerdas via Database
    let studentRecord: {
      id: string;
      auth_id: string | null;
      nama_lengkap: string;
      username: string | null;
      nomor_induk: string | null;
      email: string | null;
      is_password_default: boolean;
    } | null = null;

    try {
      const supabaseAdmin = createAdminClient();
      const { data: matched } = await supabaseAdmin
        .from("siswa")
        .select("id, auth_id, nama_lengkap, username, nomor_induk, email, is_password_default")
        .or(`username.ilike.${lower},nomor_induk.ilike.${trimmed},email.ilike.${lower},nik.eq.${trimmed}`)
        .limit(1)
        .maybeSingle();

      if (matched) {
        studentRecord = matched;

        // Jika siswa memiliki auth_id, prioritaskan email auth aslinya
        if (matched.auth_id) {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(matched.auth_id);
          if (authUser?.user?.email) {
            candidateEmails.unshift(authUser.user.email);
          }
        } else if (matched.email) {
          candidateEmails.unshift(matched.email);
        }
      }
    } catch {
      // Lanjut ke percobaan kandidat email jika admin client tidak tersedia
    }

    // Pastikan daftar kandidat email unik
    const uniqueEmailsToTry = Array.from(new Set(candidateEmails));

    // 3. Autentikasi dengan Supabase Auth
    let authenticatedUser: any = null;

    for (const email of uniqueEmailsToTry) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.user) {
        authenticatedUser = data.user;
        break;
      }
    }

    // 4. Jika login gagal
    if (!authenticatedUser) {
      if (studentRecord && !studentRecord.auth_id) {
        return errorResponse(
          "ACCOUNT_NOT_ACTIVATED",
          `Akun untuk siswa ${studentRecord.nama_lengkap} (${studentRecord.username || studentRecord.nomor_induk}) belum diaktifkan oleh admin. Silakan hubungi admin LPKS untuk mengaktifkan akun di menu Data Siswa.`,
          401
        );
      }

      if (studentRecord) {
        return errorResponse(
          "INVALID_CREDENTIALS",
          `Kata sandi yang Anda masukkan salah untuk akun ${studentRecord.username || studentRecord.nama_lengkap}. Periksa kembali huruf besar/kecil atau hubungi admin jika lupa kata sandi.`,
          401
        );
      }

      return errorResponse(
        "INVALID_CREDENTIALS",
        "Username/email atau kata sandi yang Anda masukkan salah. Pastikan format username sudah sesuai.",
        401
      );
    }

    // 5. Autentikasi Berhasil
    const role = authenticatedUser.user_metadata?.role || "siswa";
    const nama = authenticatedUser.user_metadata?.nama || authenticatedUser.email?.split("@")[0];

    let siswaId = null;
    let isPasswordDefault = false;
    let username = null;

    if (role === "siswa") {
      const { data: siswa } = await supabase
        .from("siswa")
        .select("id, is_password_default, username")
        .eq("auth_id", authenticatedUser.id)
        .limit(1)
        .maybeSingle();

      siswaId = siswa?.id || studentRecord?.id || null;
      isPasswordDefault = siswa?.is_password_default ?? studentRecord?.is_password_default ?? false;
      username = siswa?.username || studentRecord?.username || null;
    }

    return successResponse({
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
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
