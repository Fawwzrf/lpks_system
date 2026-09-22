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
    const { nominal, tgl_bayar, metode, keterangan } = body;

    const numNominal = parseFloat(nominal);
    if (isNaN(numNominal) || numNominal <= 0) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Nominal pembayaran yang valid (> 0) wajib diisi.",
        400
      );
    }

    const supabase = await createClient();

    // 1. Cek apakah transaksi ada
    const { data: existingTx, error: findError } = await supabase
      .from("transaksi_keuangan")
      .select("id, siswa_id")
      .eq("id", id)
      .maybeSingle();

    if (findError || !existingTx) {
      return errorResponse("NOT_FOUND", "Transaksi pembayaran tidak ditemukan.", 404);
    }

    // 2. Update data transaksi
    const updatePayload: Record<string, unknown> = {
      nominal: numNominal,
      tgl_bayar: tgl_bayar || new Date().toISOString().split("T")[0],
      metode: metode || "Tunai",
      keterangan: keterangan !== undefined ? (keterangan ? String(keterangan).trim() : null) : null,
    };

    const { data: updatedTx, error: updateError } = await supabase
      .from("transaksi_keuangan")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return errorResponse(
        "DATABASE_ERROR",
        "Gagal memperbarui transaksi pembayaran.",
        500,
        updateError.message
      );
    }

    // 3. Ambil ulang biaya program siswa untuk menghitung status terupdate
    const { data: siswa } = await supabase
      .from("siswa")
      .select("id, biaya_pelatihan, program:master_program(biaya)")
      .eq("id", existingTx.siswa_id)
      .single();

    const programBiaya = Number(((siswa?.program as unknown) as { biaya: number })?.biaya) || 0;
    const totalBiaya = siswa?.biaya_pelatihan !== null && siswa?.biaya_pelatihan !== undefined
      ? Number(siswa.biaya_pelatihan)
      : programBiaya;

    const { data: allTx } = await supabase
      .from("transaksi_keuangan")
      .select("nominal")
      .eq("siswa_id", existingTx.siswa_id);

    const totalTerbayar = allTx?.reduce((acc, curr) => acc + Number(curr.nominal), 0) || 0;
    const sisaTagihan = Math.max(0, totalBiaya - totalTerbayar);
    const isLunas = sisaTagihan === 0 && totalBiaya > 0;

    return successResponse({
      transaksi: updatedTx,
      status_keuangan: {
        total_biaya: totalBiaya,
        total_terbayar: totalTerbayar,
        sisa_tagihan: sisaTagihan,
        status: isLunas ? "Lunas" : totalTerbayar > 0 ? "Cicilan" : "Belum Bayar",
        is_lunas: isLunas,
      },
      message: "Transaksi pembayaran berhasil diperbarui.",
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memproses pembaruan transaksi pembayaran.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const supabase = await createClient();

    // 1. Cek apakah transaksi ada
    const { data: existingTx, error: findError } = await supabase
      .from("transaksi_keuangan")
      .select("id, siswa_id")
      .eq("id", id)
      .maybeSingle();

    if (findError || !existingTx) {
      return errorResponse("NOT_FOUND", "Transaksi pembayaran tidak ditemukan.", 404);
    }

    // 2. Hapus transaksi
    const { error: deleteError } = await supabase
      .from("transaksi_keuangan")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return errorResponse(
        "DATABASE_ERROR",
        "Gagal menghapus transaksi pembayaran.",
        500,
        deleteError.message
      );
    }

    return successResponse({
      id,
      message: "Transaksi pembayaran berhasil dihapus.",
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal menghapus transaksi pembayaran.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
