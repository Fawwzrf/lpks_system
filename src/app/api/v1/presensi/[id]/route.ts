import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json();
    const { status, keterangan } = body;

    const validStatuses = ["Hadir", "Izin", "Sakit", "Alpa"];
    if (!status || !validStatuses.includes(status)) {
      return errorResponse(
        "INVALID_STATUS",
        `Status harus salah satu dari: ${validStatuses.join(", ")}.`,
        400
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("presensi")
      .update({
        status,
        keterangan: keterangan || null,
        created_by: "superadmin", // Tercatat sebagai override admin
      })
      .eq("id", id)
      .select("*, siswa:siswa(id, nama_lengkap, nomor_induk)")
      .single();

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal memperbarui status presensi.", 500, error.message);
    }

    return successResponse({
      presensi: data,
      message: `Status presensi berhasil diubah menjadi ${status}.`,
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memproses override presensi.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
