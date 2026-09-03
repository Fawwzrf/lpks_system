import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin, requireStudentOwnerOrAdmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

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
      "tempat_lahir",
      "tgl_lahir",
      "alamat_lengkap",
      "nama_ayah",
      "nama_ibu",
      "no_hp",
      "email",
      "pendidikan_terakhir",
      "nisn",
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

    const { data, error } = await supabase
      .from("siswa")
      .update(updates)
      .eq("id", id)
      .select("*, program:master_program(*)")
      .single();

    if (error) {
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

    // Mekanisme Soft-delete & Anonimisasi Sesuai UU PDP No. 27/2022
    // Data akademik tetap ada, tetapi identitas sensitif dianonimkan
    const { data, error } = await supabase
      .from("siswa")
      .update({
        nik: `ANON-${id.substring(0, 8)}`,
        no_hp: "0000000000",
        alamat_lengkap: "[DATA DIHAPUS]",
        tgl_keluar: new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, nomor_induk, nama_lengkap, tgl_keluar")
      .single();

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal melakukan anonimisasi data siswa.", 500, error.message);
    }

    return successResponse({
      siswa: data,
      message: "Data pribadi siswa berhasil dianonimisasi dan berstatus non-aktif (soft-delete).",
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
