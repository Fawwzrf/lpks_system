import { NextRequest, NextResponse } from "next/server";
import { errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const modul = request.nextUrl.searchParams.get("modul") || "siswa";
    const supabase = await createClient();

    let exportRows: Record<string, unknown>[] = [];
    const filename = `Ekspor_${modul.toUpperCase()}_${new Date().toISOString().split("T")[0]}.xlsx`;

    if (modul === "siswa") {
      const { data: siswaList } = await supabase
        .from("siswa")
        .select("*, program:master_program(id, kode_program, nama, biaya)")
        .order("nomor_induk", { ascending: true });

      exportRows =
        siswaList?.map((s, idx) => ({
          "No": idx + 1,
          "No. Induk": s.nomor_induk,
          "Nama": s.nama_lengkap,
          "NIK": s.nik,
          "Tempat Lahir": s.tempat_lahir || "-",
          "Tanggal Lahir": s.tgl_lahir || "-",
          "Alamat": s.alamat_lengkap || "-",
          "Nama Ayah": s.nama_ayah || "-",
          "Nama Ibu": s.nama_ibu || "-",
          "No. HP": s.no_hp || "-",
          "Email": s.email,
          "Pend. Terakhir": s.pendidikan_terakhir || "-",
          "NISN": s.nisn || "-",
          "Program": ((s.program as any)?.nama) || "-",
          "Tgl. Masuk": s.tgl_masuk,
          "Tgl. Keluar": s.tgl_keluar || "-",
          "Username": s.username || "-",
          "Password": s.is_password_default ? (s.username || "-") : "(Telah Diubah Mandiri)"
        })) || [];
    } else if (modul === "keuangan") {
      const { data: txList } = await supabase
        .from("transaksi_keuangan")
        .select("*, siswa:siswa(nomor_induk, nama_lengkap, program:master_program(nama))")
        .order("tgl_bayar", { ascending: false });

      exportRows =
        txList?.map((tx) => ({
          "Tanggal Bayar": tx.tgl_bayar,
          "Nomor Induk": ((tx.siswa as unknown) as { nomor_induk: string })?.nomor_induk || "-",
          "Nama Siswa": ((tx.siswa as unknown) as { nama_lengkap: string })?.nama_lengkap || "-",
          Program: ((((tx.siswa as unknown) as { program: { nama: string } })?.program)?.nama) || "-",
          "Nominal (Rp)": Number(tx.nominal),
          Metode: tx.metode,
          Keterangan: tx.keterangan || "-",
          Penerima: tx.penerima,
        })) || [];
    } else {
      return errorResponse("INVALID_MODUL", "Modul ekspor tidak didukung. Pilihan: siswa, keuangan.", 400);
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal mengekspor data ke Excel.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
