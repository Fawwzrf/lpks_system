import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const siswaId = searchParams.get("siswa_id");

    let query = supabase
      .from("transaksi_keuangan")
      .select("*, siswa:siswa(id, nomor_induk, nama_lengkap, program:master_program(nama, biaya))")
      .order("tgl_bayar", { ascending: false });

    if (siswaId) {
      query = query.eq("siswa_id", siswaId);
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal memuat daftar transaksi keuangan.", 500, error.message);
    }

    return successResponse(data);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memuat data keuangan.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json();
    const { siswa_id, nominal, tgl_bayar, metode, keterangan } = body;

    const numNominal = parseFloat(nominal);
    if (!siswa_id || isNaN(numNominal) || numNominal <= 0) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Siswa dan nominal pembayaran yang valid (> 0) wajib diisi.",
        400
      );
    }

    const supabase = await createClient();

    // 1. Dapatkan informasi biaya program siswa
    const { data: siswa, error: siswaError } = await supabase
      .from("siswa")
      .select("id, nama_lengkap, program:master_program(nama, biaya)")
      .eq("id", siswa_id)
      .single();

    if (siswaError || !siswa) {
      return errorResponse("NOT_FOUND", "Data siswa tidak ditemukan.", 404);
    }

    const totalBiaya = Number(((siswa.program as unknown) as { biaya: number })?.biaya) || 0;

    // 2. Simpan transaksi baru
    const { data: newTx, error: txError } = await supabase
      .from("transaksi_keuangan")
      .insert({
        siswa_id,
        nominal: numNominal,
        tgl_bayar: tgl_bayar || new Date().toISOString().split("T")[0],
        metode: metode || "Tunai",
        keterangan: keterangan || null,
        penerima: user?.user_metadata?.nama || "Superadmin",
      })
      .select()
      .single();

    if (txError) {
      return errorResponse("DATABASE_ERROR", "Gagal menyimpan transaksi pembayaran.", 500, txError.message);
    }

    // 3. Hitung akumulasi pembayaran
    const { data: allTx } = await supabase
      .from("transaksi_keuangan")
      .select("nominal")
      .eq("siswa_id", siswa_id);

    const totalTerbayar = allTx?.reduce((acc, curr) => acc + Number(curr.nominal), 0) || 0;
    const sisaTagihan = Math.max(0, totalBiaya - totalTerbayar);
    const isLunas = sisaTagihan === 0;

    return successResponse(
      {
        transaksi: newTx,
        status_keuangan: {
          total_biaya: totalBiaya,
          total_terbayar: totalTerbayar,
          sisa_tagihan: sisaTagihan,
          status: isLunas ? "Lunas" : "Cicil",
          is_lunas: isLunas,
        },
        message: `Pembayaran sebesar Rp ${numNominal.toLocaleString("id-ID")} berhasil dicatat. Status: ${isLunas ? "LUNAS" : "CICIL"}.`,
      },
      undefined,
      201
    );
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memproses pencatatan transaksi pembayaran.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
