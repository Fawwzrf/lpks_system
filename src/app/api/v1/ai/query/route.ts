import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json();
    const { pertanyaan, query } = body || {};
    const inputQuestion = (pertanyaan || query || "") as string;

    if (!inputQuestion || typeof inputQuestion !== "string" || inputQuestion.trim().length === 0) {
      return errorResponse("VALIDATION_ERROR", "Pertanyaan wajib diisi.", 400);
    }

    const supabase = await createClient();

    // 1. Kumpulkan ringkasan data kontekstual dari database (RAG Context Injection)
    // Ambil data siswa aktif
    const { data: siswaList } = await supabase
      .from("siswa")
      .select("id, nomor_induk, nama_lengkap, tgl_masuk, tgl_keluar, program:master_program(nama)")
      .limit(50);

    // Ambil rekap penilaian terbaru
    const { data: nilaiTerbaru } = await supabase
      .from("penilaian_harian")
      .select("nilai, tanggal, created_by, siswa:siswa(nomor_induk, nama_lengkap), kriteria:master_kriteria(nama_kriteria)")
      .order("tanggal", { ascending: false })
      .limit(50);

    // Ambil data ujian
    const { data: ujianList } = await supabase
      .from("ujian")
      .select("teori, root, hotpass, filler, capping, gerinda, is_lulus, siswa:siswa(nomor_induk, nama_lengkap)");

    // 2. Format konteks terstruktur untuk Gemini
    const contextData = {
      daftar_siswa: siswaList?.map((s) => ({
        nomor_induk: s.nomor_induk,
        nama: s.nama_lengkap,
        program: ((s.program as unknown) as { nama: string })?.nama,
        status: s.tgl_keluar ? "Alumni" : "Aktif",
      })),
      sampel_nilai_terbaru: nilaiTerbaru?.map((n) => ({
        siswa: ((n.siswa as unknown) as { nama_lengkap: string })?.nama_lengkap,
        nomor_induk: ((n.siswa as unknown) as { nomor_induk: string })?.nomor_induk,
        kriteria: ((n.kriteria as unknown) as { nama_kriteria: string })?.nama_kriteria,
        nilai: n.nilai,
        tanggal: n.tanggal,
      })),
      ujian_kelulusan: ujianList?.map((u) => ({
        siswa: ((u.siswa as unknown) as { nama_lengkap: string })?.nama_lengkap,
        lulus: u.is_lulus,
        nilai: {
          teori: u.teori,
          root: u.root,
          hotpass: u.hotpass,
          filler: u.filler,
          capping: u.capping,
          gerinda: u.gerinda,
        },
      })),
    };

    // 3. Panggil Google Gemini Flash API dengan fallback aman
    try {
      const ai = getGeminiClient();

      const prompt = `Anda adalah Asisten Analitik AI LPKS Pengelasan Sumbu Hidup.
Tugas Anda adalah menjawab pertanyaan instruktur/admin berdasarkan data kontekstual sistem di bawah ini secara ringkas, faktual, akurat, dan profesional dalam Bahasa Indonesia.

KONTEKS DATA SISTEM SAAT INI:
${JSON.stringify(contextData, null, 2)}

PERTANYAAN INSTRUKTUR/ADMIN:
"${inputQuestion}"

PANDUAN JAWABAN:
- Jika data tersedia, sebutkan nama siswa dan nomor induknya secara jelas.
- Jika kriteria yang ditanyakan berkaitan dengan nilai di bawah 80, sebutkan kriteria spesifiknya.
- Berikan rekomendasi tindakan praktek jika relevan (misalnya: perlu latihan ulang gerinda atau root pass).
- Jangan berhalusinasi di luar data yang diberikan.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const jawaban = response.text || "Tidak ada respon teks yang dihasilkan oleh asisten AI.";

      return successResponse({
        pertanyaan: inputQuestion,
        jawaban,
        answer: jawaban,
        fallback: false,
      });
    } catch (aiErr) {
      // Graceful Fallback jika API Key belum di-set atau kuota habis
      const fallbackMsg =
        "Layanan asisten AI sedang dalam batas kuota atau kunci API belum dikonfigurasi. Anda tetap dapat melihat ringkasan statistik langsung melalui tabel Data Siswa & Transkrip Nilai.";
      return successResponse({
        pertanyaan: inputQuestion,
        jawaban: fallbackMsg,
        answer: fallbackMsg,
        fallback: true,
        error_detail: aiErr instanceof Error ? aiErr.message : String(aiErr),
      });
    }
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memproses analitik AI.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
