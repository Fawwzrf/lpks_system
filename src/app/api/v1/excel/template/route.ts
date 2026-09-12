import { NextRequest, NextResponse } from "next/server";
import { errorResponse, requireSuperadmin } from "@/lib/api-response";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const modul = request.nextUrl.searchParams.get("modul") || "siswa";

    let headers: string[] = [];
    let sampleRow: Record<string, string | number> = {};
    const filename = `Template_Import_${modul.toUpperCase()}.xlsx`;

    switch (modul) {
      case "siswa":
        headers = [
          "No",
          "No. Induk",
          "Nama",
          "NIK",
          "Tempat Lahir",
          "Tanggal Lahir",
          "Alamat",
          "Nama Ayah",
          "Nama Ibu",
          "No. HP",
          "Email",
          "Pend. Terakhir",
          "NISN",
          "Program",
          "Tgl. Masuk",
          "Tgl. Keluar"
        ];
        sampleRow = {
          "No": 1,
          "No. Induk": "01.0001",
          "Nama": "Budi Santoso",
          "NIK": "3201234567890001",
          "Tempat Lahir": "Bandung",
          "Tanggal Lahir": "2002-05-15",
          "Alamat": "Jl. Industri Pengelasan No. 12",
          "Nama Ayah": "Budi Santoso Sr.",
          "Nama Ibu": "Siti Rahayu",
          "No. HP": "081234567890",
          "Email": "contoh.siswa@gmail.com",
          "Pend. Terakhir": "SMK Teknik Mesin",
          "NISN": "0023456789",
          "Program": "01",
          "Tgl. Masuk": "2026-09-01",
          "Tgl. Keluar": ""
        };
        break;

      case "penilaian":
        headers = ["nomor_induk", "tanggal", "kriteria", "nilai", "catatan"];
        sampleRow = {
          nomor_induk: "01.0001",
          tanggal: "2026-09-03",
          kriteria: "Root",
          nilai: 85,
          catatan: "Penetrasi sangat baik",
        };
        break;

      case "keuangan":
        headers = ["nomor_induk", "tgl_bayar", "nominal", "metode", "keterangan"];
        sampleRow = {
          nomor_induk: "01.0001",
          tgl_bayar: "2026-09-03",
          nominal: 3500000,
          metode: "Transfer Bank",
          keterangan: "Pembayaran Cicilan 1",
        };
        break;

      case "presensi":
        headers = ["nomor_induk", "tanggal", "status", "keterangan"];
        sampleRow = {
          nomor_induk: "01.1033",
          tanggal: "2026-09-01",
          status: "Hadir",
          keterangan: "Presensi reguler (Pilihan status: Hadir, Izin, Sakit, Alpa)",
        };
        break;

      default:
        return errorResponse("INVALID_MODUL", "Modul template tidak didukung. Pilihan: siswa, penilaian, keuangan, presensi.", 400);
    }

    const worksheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

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
      "Gagal menghasilkan file template Excel.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
