import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateStudentUsername, generateStudentPassword } from "@/lib/gate-checks";

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
    const today = new Date().toISOString().split("T")[0];
    if (status === "aktif") {
      query = query.not("nik", "like", "ANON-%").or(`tgl_keluar.is.null,tgl_keluar.gte.${today}`);
    } else if (status === "alumni") {
      query = query.or(`nik.like.ANON-%,tgl_keluar.lt.${today}`);
    }

    if (programId) {
      query = query.eq("program_id", programId);
    }

    if (search) {
      query = query.or(
        `nama_lengkap.ilike.%${search}%,nomor_induk.ilike.%${search}%,nik.ilike.%${search}%,username.ilike.%${search}%`
      );
    }

    // Sort berdasar 4 digit nomor urut belakang (urutan_nomor), abaikan kode program
    const { data, count, error } = await query
      .order("urutan_nomor", { ascending: true, nullsFirst: false })
      .order("nomor_induk", { ascending: true })
      .range(offset, offset + limit - 1)
      .then(async (res) => {
        // Re-sort client-side by numeric part to ensure correct order
        if (res.data) {
          const getUrutan = (noInduk?: string | null) => {
            if (!noInduk) return 999999;
            if (noInduk.includes("—") || noInduk.includes("-")) return 1110.5; // Askuri di antara 1110 dan 1111
            const parts = noInduk.split(".");
            const lastPart = parts.length > 1 ? parts.slice(1).join(".") : parts[0];
            const num = parseInt(lastPart.replace(/\D/g, ""), 10);
            return isNaN(num) ? 999999 : num;
          };
          res.data.sort((a, b) => getUrutan(a.nomor_induk) - getUrutan(b.nomor_induk));
        }
        return res;
      });

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

    // 2. Generate username format "namadepan@urutan_no_induk" (contoh: "budi@0005")
    const urutan = String(generatedNoInduk).split(".")[1] || "0001";
    const username = generateStudentUsername(nama_lengkap, urutan);

    // Validasi akun agar tidak duplikat (cek username dan NIK)
    const { data: existingUser } = await supabase
      .from("siswa")
      .select("id, username, nik")
      .or(`username.eq.${username},nik.eq.${cleanNik}`)
      .maybeSingle();

    if (existingUser) {
      const field = existingUser.username === username ? "Username" : "NIK";
      return errorResponse(
        "DUPLICATE_ACCOUNT",
        `${field} tersebut sudah terdaftar dalam sistem. Pendaftaran ditolak untuk mencegah duplikasi akun.`,
        409
      );
    }

    // Password default disamakan dengan username
    const generatedPassword = generateStudentPassword(username);
    // Supabase Auth email internal: username tanpa '@' + @lpks.id
    const authEmail = `${username.replace("@", "")}@lpks.id`;

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

    // Hitung tanggal keluar otomatis jika belum ditentukan
    const finalTglMasuk = tgl_masuk || new Date().toISOString().split("T")[0];
    let finalTglKeluar = body.tgl_keluar || null;
    if (!finalTglKeluar && program_id) {
      const { data: prog } = await supabase
        .from("master_program")
        .select("estimasi_durasi_hari")
        .eq("id", program_id)
        .maybeSingle();
      if (prog?.estimasi_durasi_hari) {
        const d = new Date(finalTglMasuk);
        d.setDate(d.getDate() + Number(prog.estimasi_durasi_hari));
        finalTglKeluar = d.toISOString().split("T")[0];
      }
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
        tgl_masuk: finalTglMasuk,
        tgl_keluar: finalTglKeluar,
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
