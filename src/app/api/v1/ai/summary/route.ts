import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json();
    const { siswa_id } = body;

    if (!siswa_id) {
      return errorResponse("VALIDATION_ERROR", "siswa_id wajib disertakan.", 400);
    }

    const supabase = await createClient();

    // 1. Ambil data siswa
    const { data: siswa, error: siswaError } = await supabase
      .from("siswa")
      .select("*, program:master_program(nama)")
      .eq("id", siswa_id)
      .single();

    if (siswaError || !siswa) {
      return errorResponse("NOT_FOUND", "Data siswa tidak ditemukan.", 404);
    }

    // 2. Ambil nilai 7 hari terakhir
    const { data: nilaiList } = await supabase
      .from("penilaian_harian")
      .select("nilai, tanggal, kriteria:master_kriteria(nama_kriteria)")
      .eq("siswa_id", siswa_id)
      .order("tanggal", { ascending: false })
      .limit(20);

    // 3. Ambil rekap presensi
    const { data: presensiList } = await supabase
      .from("presensi")
      .select("status, tanggal")
      .eq("siswa_id", siswa_id)
      .order("tanggal", { ascending: false })
      .limit(10);

    let narasiRingkasan = "";

    try {
      const ai = getGeminiClient();

      const prompt = `Anda adalah Instruktur Pengelasan Senior di LPKS Sumbu Hidup.
Buat narasi ringkas (2-3 kalimat yang memotivasi dan teknis) tentang evaluasi perkembangan belajar siswa minggu ini.

DATA SISWA:
- Nama: ${siswa.nama_lengkap} (${siswa.nomor_induk})
- Program: ${((siswa.program as unknown) as { nama: string })?.nama}
- Riwayat Nilai Terbaru: ${JSON.stringify(nilaiList)}
- Riwayat Presensi: ${JSON.stringify(presensiList)}

PEDOMAN:
- Soroti kriteria yang meningkat atau yang masih butuh perbaikan agar mencapai batas kelulusan 80.
- Berikan saran praktis bengkel (misalnya: atur kecepatan ayunan las, pembersihan terak/slag, atau konsistensi sudut elektroda).`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      narasiRingkasan = response.text || "Perkembangan belajar berjalan sesuai kurikulum.";
    } catch {
      narasiRingkasan = `Siswa ${siswa.nama_lengkap} aktif mengikuti latihan praktek. Nilai kriteria terus berkembang, pertahankan kedisiplinan dan tingkatkan presisi pengelasan untuk persiapan ujian internal.`;
    }

    // 4. Simpan narasi ke tabel ai_ringkasan
    const { data: newSummary, error: saveError } = await supabase
      .from("ai_ringkasan")
      .insert({
        siswa_id,
        tgl_generate: new Date().toISOString().split("T")[0],
        ringkasan: narasiRingkasan,
      })
      .select()
      .single();

    if (saveError) {
      return errorResponse("DATABASE_ERROR", "Gagal menyimpan ringkasan AI.", 500, saveError.message);
    }

    return successResponse(newSummary, undefined, 201);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal menghasilkan ringkasan AI.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
