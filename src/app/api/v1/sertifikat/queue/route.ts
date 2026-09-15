import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { toRomanMonth, formatIndoDate, formatDDMMYYYY } from "@/lib/date-utils";

// GET: Ambil daftar siswa di antrean atau riwayat percetakan sertifikat
export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "antrean"; // 'antrean' | 'dicetak' | 'semua'

    let query = supabase
      .from("sertifikat")
      .select(`
        id,
        siswa_id,
        status,
        no_sertifikat,
        urutan_cetak,
        tgl_antrean,
        tgl_cetak,
        created_at,
        updated_at,
        siswa:siswa(
          id,
          nomor_induk,
          nama_lengkap,
          nik,
          tempat_lahir,
          tgl_lahir,
          alamat_lengkap,
          no_hp,
          tgl_masuk,
          tgl_keluar,
          program:master_program(id, kode_program, nama, biaya, estimasi_durasi_hari)
        )
      `);

    if (status !== "semua") {
      query = query.eq("status", status);
    }

    const { data: queueList, error } = await query;
    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal mengambil data antrean sertifikat.", 500, error.message);
    }

    // Ambil data ujian untuk verifikasi nilai
    const siswaIds = (queueList || []).map((item) => item.siswa_id);
    let ujianMap = new Map<string, any>();
    if (siswaIds.length > 0) {
      const { data: ujianList } = await supabase
        .from("ujian")
        .select("*")
        .in("siswa_id", siswaIds);
      ujianMap = new Map((ujianList || []).map((u) => [u.siswa_id, u]));
    }

    // Transform data dan urutkan berdasarkan pendaftar terbaru (tgl_masuk DESC)
    const items = (queueList || [])
      .map((item) => {
        const s = (item.siswa as unknown) as {
          id: string;
          nomor_induk: string;
          nama_lengkap: string;
          nik: string;
          tempat_lahir?: string;
          tgl_lahir?: string;
          alamat_lengkap?: string;
          no_hp?: string;
          tgl_masuk: string;
          tgl_keluar?: string;
          program?: {
            id: string;
            kode_program: string;
            nama: string;
            biaya: number;
            estimasi_durasi_hari: number;
          };
        } | null;

        if (!s) return null;

        // Hitung tanggal to & date of issue
        let toDateStr = s.tgl_keluar;
        if (!toDateStr && s.tgl_masuk) {
          const startDate = new Date(s.tgl_masuk);
          const durasi = s.program?.estimasi_durasi_hari || 30;
          startDate.setDate(startDate.getDate() + durasi);
          toDateStr = startDate.toISOString().split("T")[0];
        }

        const toDate = toDateStr ? new Date(toDateStr) : new Date();
        const certMonthRoman = toRomanMonth(toDate.getMonth() + 1);
        const certYear = toDate.getFullYear();
        const autoNoSertifikat = `STF / LPKS -  SH / ${certMonthRoman} / ${certYear}`;

        const placeAndDob = s.tempat_lahir
          ? `${s.tempat_lahir}, ${formatIndoDate(s.tgl_lahir)}`
          : formatIndoDate(s.tgl_lahir);

        let cleanProgram = s.program?.nama || "Umum";
        if (cleanProgram.toLowerCase().includes("kombinasi") || cleanProgram.toLowerCase().includes("gtaw + smaw")) {
          cleanProgram = "Kombinasi";
        }

        return {
          id: item.id,
          siswa_id: item.siswa_id,
          status: item.status,
          no_sertifikat: item.no_sertifikat || autoNoSertifikat,
          tgl_antrean: item.tgl_antrean,
          tgl_cetak: item.tgl_cetak,
          urutan_cetak: item.urutan_cetak,
          siswa: {
            id: s.id,
            nomor_induk: s.nomor_induk,
            nama_lengkap: s.nama_lengkap,
            nik: s.nik,
            tempat_lahir: s.tempat_lahir,
            tgl_lahir: s.tgl_lahir,
            alamat_lengkap: s.alamat_lengkap,
            no_hp: s.no_hp,
            tgl_masuk: s.tgl_masuk,
            tgl_keluar: s.tgl_keluar,
            program: s.program,
          },
          ujian: ujianMap.get(item.siswa_id) || null,
          formatted: {
            place_and_dob: placeAndDob,
            program_name: cleanProgram,
            starting_from: formatDDMMYYYY(s.tgl_masuk),
            to: formatDDMMYYYY(toDateStr),
            date_of_issue: `Cilacap, ${formatIndoDate(toDateStr)}`,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Sort by tgl_masuk DESC (siswa mendaftar paling baru di urutan teratas)
    items.sort((a, b) => {
      const timeA = a.siswa.tgl_masuk ? new Date(a.siswa.tgl_masuk).getTime() : 0;
      const timeB = b.siswa.tgl_masuk ? new Date(b.siswa.tgl_masuk).getTime() : 0;
      return timeB - timeA;
    });

    return successResponse(items, { total: items.length });
  } catch (err) {
    return errorResponse("INTERNAL_ERROR", "Terjadi kesalahan server pada antrean sertifikat.", 500, err instanceof Error ? err.message : String(err));
  }
}

// POST: Tambahkan siswa ke antrean percetakan (atau masukkan kembali jika sebelumnya dicetak)
export async function POST(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));
    const { siswa_id } = body;

    if (!siswa_id) {
      return errorResponse("VALIDATION_ERROR", "ID Siswa wajib disertakan.", 400);
    }

    // 1. Verifikasi data siswa
    const { data: siswa, error: siswaErr } = await supabase
      .from("siswa")
      .select("id, nama_lengkap, nomor_induk, program:master_program(nama)")
      .eq("id", siswa_id)
      .single();

    if (siswaErr || !siswa) {
      return errorResponse("NOT_FOUND", "Data siswa tidak ditemukan.", 404);
    }

    // 2. Verifikasi kelulusan ujian internal
    const { data: ujian } = await supabase
      .from("ujian")
      .select("is_lulus")
      .eq("siswa_id", siswa_id)
      .maybeSingle();

    if (!ujian || !ujian.is_lulus) {
      return errorResponse(
        "PRECONDITION_FAILED",
        `Siswa ${siswa.nama_lengkap} belum memenuhi syarat kelulusan ujian internal.`,
        422
      );
    }

    // 3. Upsert ke tabel sertifikat: set status = 'antrean'
    const now = new Date().toISOString();
    const { data: sertifikat, error: upsertErr } = await supabase
      .from("sertifikat")
      .upsert(
        {
          siswa_id,
          status: "antrean",
          tgl_antrean: now,
          updated_at: now,
        },
        { onConflict: "siswa_id" }
      )
      .select()
      .single();

    if (upsertErr) {
      return errorResponse("DATABASE_ERROR", "Gagal menambahkan ke antrean percetakan.", 500, upsertErr.message);
    }

    return successResponse(
      sertifikat,
      { message: `Siswa ${siswa.nama_lengkap} berhasil ditambahkan ke antrean percetakan sertifikat.` },
      201
    );
  } catch (err) {
    return errorResponse("INTERNAL_ERROR", "Terjadi kesalahan server saat menambahkan antrean.", 500, err instanceof Error ? err.message : String(err));
  }
}

// DELETE: Keluarkan siswa dari antrean percetakan
export async function DELETE(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const siswa_id = searchParams.get("siswa_id");

    if (!siswa_id) {
      return errorResponse("VALIDATION_ERROR", "Parameter siswa_id wajib disertakan.", 400);
    }

    const { error } = await supabase
      .from("sertifikat")
      .delete()
      .eq("siswa_id", siswa_id);

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal menghapus dari antrean percetakan.", 500, error.message);
    }

    return successResponse(null, { message: "Siswa berhasil dikeluarkan dari antrean percetakan." });
  } catch (err) {
    return errorResponse("INTERNAL_ERROR", "Terjadi kesalahan server saat menghapus dari antrean.", 500, err instanceof Error ? err.message : String(err));
  }
}
