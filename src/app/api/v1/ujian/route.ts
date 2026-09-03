import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json();
    const { siswa_id, tgl_ujian, teori, root, hotpass, filler, capping, gerinda, catatan_penguji } = body;

    if (!siswa_id) {
      return errorResponse("VALIDATION_ERROR", "siswa_id wajib diisi.", 400);
    }

    const scores = {
      teori: parseInt(teori ?? 0, 10),
      root: parseInt(root ?? 0, 10),
      hotpass: parseInt(hotpass ?? 0, 10),
      filler: parseInt(filler ?? 0, 10),
      capping: parseInt(capping ?? 0, 10),
      gerinda: parseInt(gerinda ?? 0, 10),
    };

    // Validasi nilai 0 - 100
    for (const [key, val] of Object.entries(scores)) {
      if (isNaN(val) || val < 0 || val > 100) {
        return errorResponse(
          "INVALID_SCORE",
          `Nilai ${key} harus berada pada rentang 0 hingga 100.`,
          400
        );
      }
    }

    const supabase = await createClient();

    // Upsert ujian (1 siswa = 1 record ujian akhir, di-update jika remedi)
    const { data: ujianData, error } = await supabase
      .from("ujian")
      .upsert(
        {
          siswa_id,
          tgl_ujian: tgl_ujian || new Date().toISOString().split("T")[0],
          ...scores,
          catatan_penguji: catatan_penguji || null,
        },
        { onConflict: "siswa_id" }
      )
      .select("*, siswa:siswa(id, nama_lengkap, nomor_induk)")
      .single();

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal menyimpan hasil ujian.", 500, error.message);
    }

    const lulus = ujianData.is_lulus;

    return successResponse(
      {
        ujian: ujianData,
        is_lulus: lulus,
        message: lulus
          ? "Selamat! Siswa DINYATAKAN LULUS Ujian Internal (Seluruh nilai >= 80)."
          : "Nilai ujian tercatat. Siswa BELUM LULUS (Minimal nilai 80 untuk setiap kriteria).",
      },
      undefined,
      201
    );
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memproses nilai ujian.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
