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

    // Jika tidak ada siswa_id dan user adalah superadmin, kembalikan daftar seluruh siswa aktif beserta agregat penilaian
    if (!siswaId) {
      const today = new Date().toISOString().split("T")[0];
      const programId = searchParams.get("program_id");

      let siswaQuery = supabase
        .from("siswa")
        .select("id, nomor_induk, nama_lengkap, tgl_masuk, tgl_keluar, program_id, program:master_program(id, kode_program, nama)")
        .not("nik", "like", "ANON-%")
        .neq("alamat_lengkap", "[DATA DIHAPUS]")
        .or(`tgl_keluar.is.null,tgl_keluar.gte.${today}`)
        .order("urutan_nomor", { ascending: true, nullsFirst: false })
        .order("nomor_induk", { ascending: true });

      if (programId) {
        siswaQuery = siswaQuery.eq("program_id", programId);
      }

      const { data: siswaList, error: siswaError } = await siswaQuery;
      if (siswaError) {
        return errorResponse("DATABASE_ERROR", "Gagal memuat data siswa aktif.", 500, siswaError.message);
      }

      const siswaIds = (siswaList || []).map((s) => s.id);

      // Ambil seluruh master kriteria
      const { data: masterKriteria } = await supabase
        .from("master_kriteria")
        .select("id, nama_kriteria, batas_lulus, urutan")
        .order("urutan", { ascending: true });

      const totalKriteriaCount = masterKriteria?.length || 5;

      // Ambil seluruh riwayat penilaian siswa aktif
      const { data: allNilai, error: nilaiError } = await supabase
        .from("penilaian_harian")
        .select("id, siswa_id, tanggal, nilai, kriteria_id")
        .in("siswa_id", siswaIds.length > 0 ? siswaIds : ["00000000-0000-0000-0000-000000000000"])
        .order("tanggal", { ascending: true });

      if (nilaiError) {
        return errorResponse("DATABASE_ERROR", "Gagal memuat riwayat penilaian siswa.", 500, nilaiError.message);
      }

      // Group per siswa_id
      const nilaiMap = new Map<string, typeof allNilai>();
      allNilai?.forEach((n) => {
        if (!nilaiMap.has(n.siswa_id)) nilaiMap.set(n.siswa_id, []);
        nilaiMap.get(n.siswa_id)!.push(n);
      });

      const studentResults = (siswaList || []).map((s) => {
        const studentScores = nilaiMap.get(s.id) || [];
        const uniqueDates = new Set<string>();
        let sumScore = 0;
        let highestScore = 0;
        let latestDate: string | null = null;
        const maxPerKriteria = new Map<string, number>();

        studentScores.forEach((row) => {
          uniqueDates.add(row.tanggal);
          const score = Number(row.nilai || 0);
          sumScore += score;
          if (score > highestScore) highestScore = score;
          if (!latestDate || row.tanggal > latestDate) latestDate = row.tanggal;

          const currMax = maxPerKriteria.get(row.kriteria_id) || 0;
          if (score > currMax) maxPerKriteria.set(row.kriteria_id, score);
        });

        const totalHari = uniqueDates.size;
        const rataRata = studentScores.length > 0 ? Math.round((sumScore / studentScores.length) * 10) / 10 : 0;

        let kriteriaLulusCount = 0;
        masterKriteria?.forEach((k) => {
          const maxK = maxPerKriteria.get(k.id) || 0;
          if (maxK >= k.batas_lulus) kriteriaLulusCount++;
        });

        const siapUjian = kriteriaLulusCount === totalKriteriaCount && totalKriteriaCount > 0;
        let status: "Siap Ujian" | "Dalam Bimbingan" | "Belum Dinilai" = "Belum Dinilai";
        if (studentScores.length > 0) {
          status = siapUjian ? "Siap Ujian" : "Dalam Bimbingan";
        }

        return {
          id: s.id,
          nomor_induk: s.nomor_induk,
          nama_lengkap: s.nama_lengkap,
          tgl_masuk: s.tgl_masuk,
          tgl_keluar: s.tgl_keluar,
          program: s.program,
          total_hari: totalHari,
          total_penilaian: studentScores.length,
          rata_rata: rataRata,
          nilai_tertinggi: highestScore,
          kriteria_kompeten: kriteriaLulusCount,
          total_kriteria: totalKriteriaCount,
          siap_ujian: siapUjian,
          status,
          terakhir_dinilai: latestDate,
        };
      });

      return successResponse(studentResults);
    }

    // MODE DETAIL TRANSKRIP SISWA (Bila ada siswa_id)
    // 0. Ambil profil siswa
    const { data: studentInfo } = await supabase
      .from("siswa")
      .select("id, nomor_induk, nama_lengkap, tgl_masuk, tgl_keluar, program:master_program(id, kode_program, nama)")
      .eq("id", siswaId)
      .single();

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
      siswa: studentInfo || null,
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
