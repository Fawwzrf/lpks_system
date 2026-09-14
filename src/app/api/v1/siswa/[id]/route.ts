import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin, requireStudentOwnerOrAdmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { errorResponse: authError } = await requireStudentOwnerOrAdmin(id);
    if (authError) return authError;

    const supabase = await createClient();
    const { data: siswa, error } = await supabase
      .from("siswa")
      .select("*, program:master_program(id, kode_program, nama, biaya, estimasi_durasi_hari)")
      .eq("id", id)
      .single();

    if (error || !siswa) {
      return errorResponse("NOT_FOUND", "Data siswa tidak ditemukan.", 404);
    }

    return successResponse(siswa);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memuat profil siswa.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json();
    const supabase = await createClient();

    // Field yang diizinkan untuk di-update
    const allowedFields = [
      "nama_lengkap",
      "nik",
      "tempat_lahir",
      "tgl_lahir",
      "alamat_lengkap",
      "nama_ayah",
      "nama_ibu",
      "no_hp",
      "email",
      "pendidikan_terakhir",
      "nisn",
      "tgl_masuk",
      "tgl_keluar",
      "checklist_berkas",
    ];

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Validasi & update nomor_induk jika disertakan
    if (body.nomor_induk && String(body.nomor_induk).trim()) {
      const cleanNomorInduk = String(body.nomor_induk).trim();
      const { data: duplicate } = await supabase
        .from("siswa")
        .select("id, nama_lengkap")
        .eq("nomor_induk", cleanNomorInduk)
        .neq("id", id)
        .maybeSingle();

      if (duplicate) {
        return errorResponse(
          "DUPLICATE_NOMOR_INDUK",
          `Nomor induk ${cleanNomorInduk} sudah digunakan oleh ${duplicate.nama_lengkap}. Silakan pilih nomor urut lain.`,
          409
        );
      }

      updates.nomor_induk = cleanNomorInduk;
      const parts = cleanNomorInduk.split(".");
      const noUrutStr = parts.length > 1 ? parts.slice(1).join(".") : parts[0];
      const num = parseInt(noUrutStr.replace(/\D/g, ""), 10);
      updates.urutan_nomor = isNaN(num) ? null : num;
    }

    const { data, error } = await supabase
      .from("siswa")
      .update(updates)
      .eq("id", id)
      .select("*, program:master_program(*)")
      .single();

    if (error) {
      if (error.code === "23505" && error.message?.includes("nomor_induk")) {
        return errorResponse(
          "DUPLICATE_NOMOR_INDUK",
          "Nomor induk tersebut sudah terdaftar dalam sistem. Silakan pilih nomor urut lain.",
          409
        );
      }
      return errorResponse("DATABASE_ERROR", "Gagal memperbarui data siswa.", 500, error.message);
    }

    return successResponse(data);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memproses pembaharuan data siswa.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    // 1. Ambil data siswa untuk nomor_induk dan auth_id
    const { data: siswa } = await supabase
      .from("siswa")
      .select("id, nomor_induk, auth_id, nama_lengkap")
      .eq("id", id)
      .maybeSingle();

    if (!siswa) {
      return errorResponse("NOT_FOUND", "Data siswa tidak ditemukan.", 404);
    }

    // 2. Hapus relasi restrict jika ada (transaksi_keuangan dan presensi_attempts)
    await supabase.from("transaksi_keuangan").delete().eq("siswa_id", id);
    await supabase.from("presensi_attempts").delete().eq("siswa_id", id);

    // 3. Hapus data siswa dari database (cascade akan menghapus presensi, penilaian_harian, ujian, ai_ringkasan)
    const { error: deleteError } = await supabase
      .from("siswa")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return errorResponse("DATABASE_ERROR", "Gagal menghapus data siswa.", 500, deleteError.message);
    }

    // 4. Hapus akun auth jika terdaftar
    if (siswa.auth_id) {
      await supabaseAdmin.auth.admin.deleteUser(siswa.auth_id).catch(() => {});
    }

    return successResponse({
      id,
      nomor_induk: siswa.nomor_induk,
      message: `Data siswa ${siswa.nama_lengkap} (${siswa.nomor_induk}) berhasil dihapus. Nomor induk kini dapat digunakan kembali.`,
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal menghapus data siswa.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
