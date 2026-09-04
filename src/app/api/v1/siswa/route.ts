import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get("status"); // 'aktif', 'alumni', atau null (semua)
    const programId = searchParams.get("program_id");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    let query = supabase
      .from("siswa")
      .select("*, program:master_program(id, kode_program, nama, biaya)", { count: "exact" });

    // Filter status aktif vs alumni
    if (status === "aktif") {
      query = query.is("tgl_keluar", null);
    } else if (status === "alumni") {
      query = query.not("tgl_keluar", "is", null);
    }

    if (programId) {
      query = query.eq("program_id", programId);
    }

    if (search) {
      query = query.or(
        `nama_lengkap.ilike.%${search}%,nomor_induk.ilike.%${search}%,nik.ilike.%${search}%,username.ilike.%${search}%`
      );
    }

    query = query.order("tgl_masuk", { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal mengambil daftar siswa.", 500, error.message);
    }

    return successResponse(data, {
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Terjadi kesalahan pada server saat memuat data siswa.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

// Generate username: namadepan (lowercase, alphanumeric) + 2 digit random (10-99)
function generateUsername(nama: string): string {
  const first = nama.trim().split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const digits = String(Math.floor(Math.random() * 90) + 10);
  return `${first}${digits}`;
}

// Generate password 8 karakter: campuran huruf besar, kecil, angka, diacak
function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const nums = "23456789";
  const chars = [
    upper[Math.floor(Math.random() * upper.length)],
    upper[Math.floor(Math.random() * upper.length)],
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    lower[Math.floor(Math.random() * lower.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    nums[Math.floor(Math.random() * nums.length)],
  ];
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export async function POST(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json();
    const {
      program_id,
      nama_lengkap,
      nik,
      tempat_lahir,
      tgl_lahir,
      alamat_lengkap,
      nama_ayah,
      nama_ibu,
      no_hp,
      email,
      pendidikan_terakhir,
      nisn,
      tgl_masuk,
      checklist_berkas,
    } = body;

    // Validasi Wajib
    if (!program_id || !nama_lengkap || !nik || !email) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Program, nama lengkap, NIK, dan email wajib diisi.",
        400
      );
    }

    // Validasi NIK tepat 16 digit angka
    const cleanNik = String(nik).trim();
    if (!/^\d{16}$/.test(cleanNik)) {
      return errorResponse(
        "INVALID_NIK",
        "NIK harus terdiri dari 16 digit angka valid.",
        400
      );
    }

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    // 1. Generate nomor induk berurutan secara atomik via RPC PostgreSQL
    const { data: generatedNoInduk, error: rpcError } = await supabase.rpc(
      "generate_nomor_induk",
      { p_program_id: program_id }
    );

    if (rpcError || !generatedNoInduk) {
      return errorResponse(
        "NOMOR_INDUK_FAILED",
        "Gagal membuat nomor induk otomatis untuk siswa.",
        500,
        rpcError?.message
      );
    }

    // 2. Generate username unik (retry hingga 5x jika collision)
    let username = generateUsername(nama_lengkap);
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } = await supabase
        .from("siswa")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (!existing) break;
      username = generateUsername(nama_lengkap);
    }

    const generatedPassword = generatePassword();
    // Supabase Auth email internal: username@lpks.id (tidak ditampilkan ke siswa)
    const authEmail = `${username}@lpks.id`;

    // 3. Buat Supabase Auth user
    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: generatedPassword,
      email_confirm: true, // langsung confirmed, tidak perlu verifikasi email
      user_metadata: { role: "siswa", nama: nama_lengkap.trim() },
    });

    if (authCreateError || !authData.user) {
      return errorResponse(
        "AUTH_CREATE_FAILED",
        "Gagal membuat akun login siswa.",
        500,
        authCreateError?.message
      );
    }

    // 4. Simpan record siswa baru
    const { data: newSiswa, error: insertError } = await supabase
      .from("siswa")
      .insert({
        auth_id: authData.user.id,
        program_id,
        nomor_induk: generatedNoInduk,
        username,
        nama_lengkap: nama_lengkap.trim(),
        nik: cleanNik,
        tempat_lahir: tempat_lahir?.trim() || null,
        tgl_lahir: tgl_lahir || null,
        alamat_lengkap: alamat_lengkap?.trim() || null,
        nama_ayah: nama_ayah?.trim() || null,
        nama_ibu: nama_ibu?.trim() || null,
        no_hp: no_hp?.trim() || null,
        email: email.trim().toLowerCase(),
        pendidikan_terakhir: pendidikan_terakhir?.trim() || null,
        nisn: nisn?.trim() || null,
        tgl_masuk: tgl_masuk || new Date().toISOString().split("T")[0],
        checklist_berkas: checklist_berkas || {},
        is_password_default: true,
      })
      .select("*, program:master_program(id, kode_program, nama, biaya)")
      .single();

    if (insertError) {
      // Rollback: hapus auth user jika insert siswa gagal
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      if (insertError.code === "23505") {
        return errorResponse(
          "DUPLICATE_DATA",
          "Email atau NIK sudah terdaftar pada sistem.",
          409
        );
      }
      return errorResponse(
        "DATABASE_ERROR",
        "Gagal menyimpan data pendaftaran siswa.",
        500,
        insertError.message
      );
    }

    return successResponse(
      {
        ...newSiswa,
        // generated_credentials hanya ada di response ini — TIDAK disimpan di DB
        generated_credentials: {
          username,
          password: generatedPassword,
          note: "Catat dan berikan ke siswa. Password tidak dapat ditampilkan ulang.",
        },
        message: `Siswa berhasil didaftarkan dengan Nomor Induk ${generatedNoInduk}.`,
      },
      undefined,
      201
    );
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Terjadi kesalahan saat memproses pendaftaran siswa.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
