import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const supabase = await createClient();

    // 1. Ambil seluruh siswa aktif
    const { data: siswaList, error: siswaErr } = await supabase
      .from("siswa")
      .select("id, nomor_induk, nama_lengkap, tgl_masuk, tgl_keluar, program:master_program(id, nama, biaya)")
      .order("nomor_induk", { ascending: true });

    if (siswaErr) {
      return errorResponse("DATABASE_ERROR", "Gagal mengambil data siswa.", 500, siswaErr.message);
    }

    // 2. Ambil seluruh data ujian
    const { data: ujianList } = await supabase
      .from("ujian")
      .select("*");

    const ujianMap = new Map((ujianList || []).map((u) => [u.siswa_id, u]));

    // 3. Ambil seluruh data transaksi keuangan
    const { data: txList } = await supabase
      .from("transaksi_keuangan")
      .select("siswa_id, nominal");

    const txMap = new Map<string, number>();
    txList?.forEach((tx) => {
      txMap.set(tx.siswa_id, (txMap.get(tx.siswa_id) || 0) + Number(tx.nominal || 0));
    });

    // 4. Ambil master kriteria untuk evaluasi kelayakan nilai harian
    const { data: masterKriteria } = await supabase
      .from("master_kriteria")
      .select("id, nama_kriteria, batas_lulus");

    const totalKriteria = masterKriteria?.length || 5;

    // 5. Ambil nilai tertinggi per kriteria per siswa
    const { data: nilaiHarian } = await supabase
      .from("penilaian_harian")
      .select("siswa_id, kriteria_id, nilai");

    const studentKriteriaPass = new Map<string, Set<string>>();
    nilaiHarian?.forEach((nh) => {
      if (nh.nilai >= 80) {
        if (!studentKriteriaPass.has(nh.siswa_id)) {
          studentKriteriaPass.set(nh.siswa_id, new Set());
        }
        studentKriteriaPass.get(nh.siswa_id)!.add(nh.kriteria_id);
      }
    });

    const result = (siswaList || []).map((s) => {
      const u = ujianMap.get(s.id) || null;
      const program = (s.program as unknown) as { nama: string; biaya: number } | null;
      const totalBiaya = Number(program?.biaya || 0);
      const totalTerbayar = txMap.get(s.id) || 0;
      const isLunas = totalBiaya > 0 && totalTerbayar >= totalBiaya;
      const passedKriteriaCount = studentKriteriaPass.get(s.id)?.size || 0;
      const isNilaiHarianOk = passedKriteriaCount >= totalKriteria && totalKriteria > 0;

      return {
        id: s.id,
        nomor_induk: s.nomor_induk,
        nama_lengkap: s.nama_lengkap,
        program_nama: program?.nama || "Umum",
        total_biaya: totalBiaya,
        total_terbayar: totalTerbayar,
        is_lunas: isLunas,
        nilai_harian_ok: isNilaiHarianOk,
        ujian: u,
      };
    });

    return successResponse(result);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memproses data ujian.",
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
