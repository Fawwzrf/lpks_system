import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

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
        `nama_lengkap.ilike.%${search}%,nomor_induk.ilike.%${search}%,nik.ilike.%${search}%`
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

    // 2. Simpan record siswa baru
    const { data: newSiswa, error: insertError } = await supabase
      .from("siswa")
      .insert({
        program_id,
        nomor_induk: generatedNoInduk,
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
      })
      .select("*, program:master_program(id, kode_program, nama, biaya)")
      .single();

    if (insertError) {
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
