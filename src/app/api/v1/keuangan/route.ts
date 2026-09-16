import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get("view");
    const siswaId = searchParams.get("siswa_id");
    const programId = searchParams.get("program_id");

    // Mode tampilan rekap siswa aktif (seperti presensi)
    if (view === "students" || view === "all_students") {
      const today = new Date().toISOString().split("T")[0];
      let siswaQuery = supabase
        .from("siswa")
        .select("id, nomor_induk, nama_lengkap, tgl_masuk, tgl_keluar, status_siswa, program_id, program:master_program(id, kode_program, nama, biaya)")
        .not("nik", "like", "ANON-%")
        .neq("alamat_lengkap", "[DATA DIHAPUS]")
        .or(`status_siswa.eq.aktif,status_siswa.eq.out,tgl_keluar.is.null,tgl_keluar.gte.${today}`)
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
      const { data: txList, error: txError } = await supabase
        .from("transaksi_keuangan")
        .select("id, siswa_id, nominal, tgl_bayar, metode, keterangan, penerima, created_at")
        .in("siswa_id", siswaIds.length > 0 ? siswaIds : ["00000000-0000-0000-0000-000000000000"])
        .order("tgl_bayar", { ascending: false });

      if (txError) {
        return errorResponse("DATABASE_ERROR", "Gagal memuat transaksi keuangan.", 500, txError.message);
      }

      const txMap = new Map<string, typeof txList>();
      txList?.forEach((tx) => {
        if (!txMap.has(tx.siswa_id)) txMap.set(tx.siswa_id, []);
        txMap.get(tx.siswa_id)!.push(tx);
      });

      const result = (siswaList || []).map((s) => {
        const program = (s.program as unknown) as { id: string; kode_program: string; nama: string; biaya: number } | null;
        const totalBiaya = Number(program?.biaya || 0);
        const studentTx = txMap.get(s.id) || [];
        const totalTerbayar = studentTx.reduce((acc, curr) => acc + Number(curr.nominal || 0), 0);
        const sisaTagihan = Math.max(0, totalBiaya - totalTerbayar);
        const isLunas = totalBiaya > 0 && totalTerbayar >= totalBiaya;
        const persentase = totalBiaya > 0 ? Math.min(100, Math.round((totalTerbayar / totalBiaya) * 100)) : 0;
        const status = isLunas ? "Lunas" : (totalTerbayar > 0 ? "Cicilan" : "Belum Bayar");

        return {
          id: s.id,
          nomor_induk: s.nomor_induk,
          nama_lengkap: s.nama_lengkap,
          status_siswa: s.status_siswa || "aktif",
          tgl_masuk: s.tgl_masuk,
          tgl_keluar: s.tgl_keluar,
          program: program,
          total_biaya: totalBiaya,
          total_terbayar: totalTerbayar,
          sisa_tagihan: sisaTagihan,
          is_lunas: isLunas,
          persentase: persentase,
          status: status,
          riwayat_transaksi: studentTx,
        };
      });

      return successResponse(result);
    }

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
