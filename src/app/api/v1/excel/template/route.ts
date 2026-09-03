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
          "kode_program",
          "nama_lengkap",
          "nik",
          "email",
          "no_hp",
          "tempat_lahir",
          "tgl_lahir",
          "alamat_lengkap",
          "nama_ayah",
          "nama_ibu",
          "pendidikan_terakhir",
          "nisn",
          "tgl_masuk",
        ];
        sampleRow = {
          kode_program: "01",
          nama_lengkap: "Contoh Siswa Pratama",
          nik: "3201234567890001",
          email: "contoh.siswa@gmail.com",
          no_hp: "081234567890",
          tempat_lahir: "Bandung",
          tgl_lahir: "2002-05-15",
          alamat_lengkap: "Jl. Industri Pengelasan No. 12",
          nama_ayah: "Budi Santoso",
          nama_ibu: "Siti Rahayu",
          pendidikan_terakhir: "SMK Teknik Mesin",
          nisn: "0023456789",
          tgl_masuk: "2026-09-01",
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

      default:
        return errorResponse("INVALID_MODUL", "Modul template tidak didukung. Pilihan: siswa, penilaian, keuangan.", 400);
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
