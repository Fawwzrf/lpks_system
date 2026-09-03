import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireAuth } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse: authError } = await requireAuth();
    if (authError) return authError;

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    let siswaId = searchParams.get("siswa_id");

    // Jika user adalah siswa, paksa hanya melihat nilainya sendiri
    if (user?.role === "siswa") {
      const { data: selfSiswa } = await supabase
        .from("siswa")
        .select("id")
        .eq("auth_id", user.id)
        .single();
      if (!selfSiswa) {
        return errorResponse("STUDENT_NOT_FOUND", "Data siswa tidak ditemukan.", 404);
      }
      siswaId = selfSiswa.id;
    }

    if (!siswaId) {
      return errorResponse("MISSING_PARAM", "Parameter siswa_id wajib disertakan.", 400);
    }

    // 1. Ambil seluruh master kriteria
    const { data: masterKriteria } = await supabase
      .from("master_kriteria")
      .select("id, nama_kriteria, batas_lulus, urutan")
      .order("urutan", { ascending: true });

    // 2. Ambil riwayat penilaian harian siswa
    const { data: riwayatNilai, error } = await supabase
      .from("penilaian_harian")
      .select("id, tanggal, nilai, created_by, catatan, kriteria:master_kriteria(id, nama_kriteria, batas_lulus)")
      .eq("siswa_id", siswaId)
      .order("tanggal", { ascending: true });

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal memuat riwayat penilaian.", 500, error.message);
    }

    // 3. Format data untuk tren grafik Recharts (kelompokkan per tanggal)
    const groupedByDate: Record<string, Record<string, number | string>> = {};
    const maxPerKriteria: Record<string, number> = {};

    riwayatNilai?.forEach((item) => {
      const tgl = item.tanggal;
      const kriteriaNama = ((item.kriteria as unknown) as { nama_kriteria: string })?.nama_kriteria?.toLowerCase() || "unknown";

      if (!groupedByDate[tgl]) {
        groupedByDate[tgl] = { tanggal: tgl };
      }
      groupedByDate[tgl][kriteriaNama] = item.nilai;

      if (!maxPerKriteria[kriteriaNama] || item.nilai > maxPerKriteria[kriteriaNama]) {
        maxPerKriteria[kriteriaNama] = item.nilai;
      }
    });

    const grafikTren = Object.values(groupedByDate).sort(
      (a, b) => new Date(String(a.tanggal)).getTime() - new Date(String(b.tanggal)).getTime()
    );

    // 4. Hitung status kelayakan ujian (apakah nilai tertinggi tiap kriteria >= batas_lulus (80))
    const statusKelayakan: Record<string, { nama: string; nilai_tertinggi: number; lulus: boolean }> = {};
    let totalKriteriaLulus = 0;
    const totalKriteriaCount = masterKriteria?.length || 5;

    masterKriteria?.forEach((k) => {
      const key = k.nama_kriteria.toLowerCase();
      const highest = maxPerKriteria[key] || 0;
      const isLulus = highest >= k.batas_lulus;
      if (isLulus) totalKriteriaLulus++;

      statusKelayakan[key] = {
        nama: k.nama_kriteria,
        nilai_tertinggi: highest,
        lulus: isLulus,
      };
    });

    const siapUjian = totalKriteriaLulus === totalKriteriaCount && totalKriteriaCount > 0;

    return successResponse({
      siswa_id: siswaId,
      grafik_tren: grafikTren,
      status_kelayakan: statusKelayakan,
      ringkasan_kelayakan: {
        total_kriteria: totalKriteriaCount,
        kriteria_terpenuhi: totalKriteriaLulus,
        siap_ujian: siapUjian,
      },
      riwayat_mentah: riwayatNilai || [],
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memproses data penilaian.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse: authError } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { tanggal, penilaian } = body;
    let { siswa_id } = body;

    const supabase = await createClient();

    // Jika siswa yang submit, pastikan siswa_id miliknya sendiri
    if (user?.role === "siswa") {
      const { data: selfSiswa } = await supabase
        .from("siswa")
        .select("id")
        .eq("auth_id", user.id)
        .single();
      if (!selfSiswa) {
        return errorResponse("STUDENT_NOT_FOUND", "Data siswa tidak ditemukan.", 404);
      }
      siswa_id = selfSiswa.id;
    }

    if (!siswa_id || !Array.isArray(penilaian) || penilaian.length === 0) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Siswa dan daftar penilaian minimal 1 kriteria wajib diisi.",
        400
      );
    }

    const tglPenilaian = tanggal || new Date().toISOString().split("T")[0];
    const createdBy = user?.role === "superadmin" ? "superadmin" : "siswa";

    // Validasi nilai 0 - 100
    const recordsToInsert = [];
    for (const p of penilaian) {
      const val = parseInt(p.nilai, 10);
      if (isNaN(val) || val < 0 || val > 100) {
        return errorResponse(
          "INVALID_SCORE",
          `Nilai harus berupa angka di antara 0 dan 100.`,
          400
        );
      }
      recordsToInsert.push({
        siswa_id,
        kriteria_id: p.kriteria_id,
        tanggal: tglPenilaian,
        nilai: val,
        created_by: createdBy,
        catatan: p.catatan || null,
      });
    }

    const { data, error } = await supabase
      .from("penilaian_harian")
      .insert(recordsToInsert)
      .select();

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal menyimpan penilaian.", 500, error.message);
    }

    return successResponse(
      {
        recorded_count: data?.length || 0,
        created_by: createdBy,
        message: `${data?.length} nilai praktek harian berhasil disimpan.`,
      },
      undefined,
      201
    );
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memproses input penilaian.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
