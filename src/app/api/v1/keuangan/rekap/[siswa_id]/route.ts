import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireStudentOwnerOrAdmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ siswa_id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { siswa_id } = await params;
    const { errorResponse: authError } = await requireStudentOwnerOrAdmin(siswa_id);
    if (authError) return authError;

    const supabase = await createClient();

    // 1. Ambil data siswa dan biaya program
    const { data: siswa, error: siswaError } = await supabase
      .from("siswa")
      .select("id, nama_lengkap, nomor_induk, program:master_program(nama, biaya)")
      .eq("id", siswa_id)
      .single();

    if (siswaError || !siswa) {
      return errorResponse("NOT_FOUND", "Data siswa tidak ditemukan.", 404);
    }

    const totalBiaya = Number(((siswa.program as unknown) as { biaya: number })?.biaya) || 0;

    // 2. Ambil seluruh riwayat transaksi
    const { data: transaksi, error: txError } = await supabase
      .from("transaksi_keuangan")
      .select("*")
      .eq("siswa_id", siswa_id)
      .order("tgl_bayar", { ascending: false });

    if (txError) {
      return errorResponse("DATABASE_ERROR", "Gagal memuat transaksi siswa.", 500, txError.message);
    }

    const totalTerbayar = transaksi?.reduce((acc, curr) => acc + Number(curr.nominal), 0) || 0;
    const sisaTagihan = Math.max(0, totalBiaya - totalTerbayar);
    const isLunas = sisaTagihan === 0 && totalBiaya > 0;

    return successResponse({
      siswa_id,
      nama_siswa: siswa.nama_lengkap,
      nomor_induk: siswa.nomor_induk,
      nama_program: ((siswa.program as unknown) as { nama: string })?.nama,
      total_biaya: totalBiaya,
      total_terbayar: totalTerbayar,
      sisa_tagihan: sisaTagihan,
      status: isLunas ? "Lunas" : "Cicil",
      is_lunas: isLunas,
      riwayat_transaksi: transaksi || [],
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal menghitung rekapitulasi keuangan siswa.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
