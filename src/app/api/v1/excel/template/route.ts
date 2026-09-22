import { NextRequest, NextResponse } from "next/server";
import { errorResponse, requireSuperadmin } from "@/lib/api-response";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const modul = request.nextUrl.searchParams.get("modul") || "siswa";
    const filename = `Template_Import_${modul.toUpperCase()}.xlsx`;

    // Special case: arsip_alumni uses ExcelJS for styled grouped headers
    if (modul === "arsip_alumni") {
      const arrayBuffer = await buildArsipAlumniTemplate();
      return new NextResponse(new Uint8Array(arrayBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // All other modules — plain XLSX via xlsx library
    let headers: string[] = [];
    let sampleRow: Record<string, string | number> = {};

    switch (modul) {
      case "siswa":
        headers = [
          "No", "No. Induk", "Nama", "NIK", "Tempat Lahir", "Tanggal Lahir",
          "Alamat", "Nama Ayah", "Nama Ibu", "No. HP", "Email", "Pend. Terakhir",
          "NISN", "Program", "Tgl. Masuk", "Tgl. Keluar",
        ];
        sampleRow = {
          "No": 1, "No. Induk": "01.0001", "Nama": "Budi Santoso",
          "NIK": "3201234567890001", "Tempat Lahir": "Bandung",
          "Tanggal Lahir": "2002-05-15", "Alamat": "Jl. Industri Pengelasan No. 12",
          "Nama Ayah": "Budi Santoso Sr.", "Nama Ibu": "Siti Rahayu",
          "No. HP": "081234567890", "Email": "contoh.siswa@gmail.com",
          "Pend. Terakhir": "SMK Teknik Mesin", "NISN": "0023456789",
          "Program": "01", "Tgl. Masuk": "2026-09-01", "Tgl. Keluar": "",
        };
        break;

      case "penilaian":
        headers = ["nomor_induk", "tanggal", "kriteria", "nilai", "catatan"];
        sampleRow = {
          nomor_induk: "01.0001", tanggal: "2026-09-03",
          kriteria: "Root", nilai: 85, catatan: "Penetrasi sangat baik",
        };
        break;

      case "keuangan":
        headers = ["nomor_induk", "tgl_bayar", "nominal", "metode", "keterangan"];
        sampleRow = {
          nomor_induk: "01.0001", tgl_bayar: "2026-09-03",
          nominal: 3500000, metode: "Transfer Bank", keterangan: "Pembayaran Cicilan 1",
        };
        break;

      case "presensi":
        headers = ["nomor_induk", "tanggal", "status", "keterangan"];
        sampleRow = {
          nomor_induk: "01.1033", tanggal: "2026-09-01",
          status: "Hadir", keterangan: "Pilihan status: Hadir, Izin, Sakit, Alpa",
        };
        break;

      default:
        return errorResponse(
          "INVALID_MODUL",
          "Modul template tidak didukung. Pilihan: siswa, penilaian, keuangan, presensi, arsip_alumni.",
          400
        );
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

// ─── Styled arsip_alumni template ──────────────────────────────────────────────

async function buildArsipAlumniTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "LPKS System";
  wb.created = new Date();

  const ws = wb.addWorksheet("Template", {
    pageSetup: { fitToPage: true, fitToWidth: 1, orientation: "landscape" },
    views: [{ state: "frozen", xSplit: 0, ySplit: 3 }],
  });

  // ── Color palette ──────────────────────────────────────────────────────────
  const C = {
    // Header groups
    siswaHeader:  { argb: "FF1E3A5F" }, // dark navy
    keuHeader:    { argb: "FF1A4731" }, // dark green
    sertHeader:   { argb: "FF4A2C0A" }, // dark brown-amber
    // Sub-header rows
    siswaSub:     { argb: "FFD6E4F7" }, // light blue
    keuSub:       { argb: "FFD1F0E3" }, // light green
    sertSub:      { argb: "FFFFF3CD" }, // light amber
    // Alternating data rows
    rowAlt:       { argb: "FFF8F9FA" },
    rowBase:      { argb: "FFFFFFFF" },
    // No column
    noHeader:     { argb: "FF2C3E50" },
    // Fonts
    white:        { argb: "FFFFFFFF" },
    dark:         { argb: "FF1A1A1A" },
    hint:         { argb: "FF6C757D" },
  } as const;

  // ── Column definitions ─────────────────────────────────────────────────────
  // group: "no" | "siswa" | "keu" | "sert"
  const cols = [
    { key: "no",        header: "No",              width: 5,   group: "no" },
    // DATA SISWA (11 kolom → span A2:K2)
    { key: "no_induk",  header: "No. Induk",        width: 12,  group: "siswa" },
    { key: "nama",      header: "Nama",              width: 26,  group: "siswa" },
    { key: "nik",       header: "NIK",               width: 20,  group: "siswa" },
    { key: "tmp_lahir", header: "Tempat Lahir",      width: 16,  group: "siswa" },
    { key: "tgl_lahir", header: "Tanggal Lahir",     width: 14,  group: "siswa" },
    { key: "alamat",    header: "Alamat",             width: 36,  group: "siswa" },
    { key: "no_hp",     header: "No. HP",             width: 16,  group: "siswa" },
    { key: "pend",      header: "Pend. Terakhir",    width: 16,  group: "siswa" },
    { key: "program",   header: "Program",            width: 22,  group: "siswa" },
    { key: "email",     header: "Email",              width: 26,  group: "siswa" },
    { key: "tgl_masuk", header: "Tgl. Masuk",        width: 14,  group: "siswa" },
    { key: "durasi",    header: "Durasi (hari)",     width: 14,  group: "siswa" },
    // KEUANGAN (16 kolom → span …)
    { key: "biaya",     header: "Biaya Pelatihan",   width: 18,  group: "keu" },
    { key: "skema",     header: "Skema Pembayaran",  width: 18,  group: "keu" },
    { key: "tgl_p1",    header: "Tgl. Pembayaran 1", width: 16,  group: "keu" },
    { key: "nom_1",     header: "Nominal 1",          width: 14,  group: "keu" },
    { key: "tgl_p2",    header: "Tgl. Pembayaran 2", width: 16,  group: "keu" },
    { key: "nom_2",     header: "Nominal 2",          width: 14,  group: "keu" },
    { key: "tgl_p3",    header: "Tgl. Pembayaran 3", width: 16,  group: "keu" },
    { key: "nom_3",     header: "Nominal 3",          width: 14,  group: "keu" },
    { key: "tgl_p4",    header: "Tgl. Pembayaran 4", width: 16,  group: "keu" },
    { key: "nom_4",     header: "Nominal 4",          width: 14,  group: "keu" },
    { key: "tgl_p5",    header: "Tgl. Pembayaran 5", width: 16,  group: "keu" },
    { key: "nom_5",     header: "Nominal 5",          width: 14,  group: "keu" },
    { key: "tgl_p6",    header: "Tgl. Pembayaran 6", width: 16,  group: "keu" },
    { key: "nom_6",     header: "Nominal 6",          width: 14,  group: "keu" },
    { key: "ket",       header: "Ket",                width: 16,  group: "keu" },
    // SERTIFIKAT
    { key: "no_sert",   header: "No. Sertifikat",    width: 34,  group: "sert" },
  ] as const;

  // Set column widths
  ws.columns = cols.map(c => ({ key: c.key, width: c.width }));

  // ── Row 1: Group header (merged cells) ────────────────────────────────────
  // Find column ranges per group
  const groupRange = (g: string) => {
    const indices = cols.reduce<number[]>((acc, c, i) => {
      if (c.group === g) acc.push(i + 1); // 1-indexed
      return acc;
    }, []);
    return { start: indices[0], end: indices[indices.length - 1] };
  };

  const noR    = groupRange("no");
  const siswaR = groupRange("siswa");
  const keuR   = groupRange("keu");
  const sertR  = groupRange("sert");

  const row1 = ws.getRow(1);
  row1.height = 28;

  const colLetter = (n: number) => {
    let s = "";
    while (n > 0) { s = String.fromCharCode(((n - 1) % 26) + 65) + s; n = Math.floor((n - 1) / 26); }
    return s;
  };

  // "No" cell
  ws.mergeCells(`${colLetter(noR.start)}1:${colLetter(noR.end)}1`);
  const noCell = row1.getCell(noR.start);
  noCell.value = "No";
  styleHeaderCell(noCell, C.noHeader, C.white);

  // "DATA SISWA"
  ws.mergeCells(`${colLetter(siswaR.start)}1:${colLetter(siswaR.end)}1`);
  const siswaCell = row1.getCell(siswaR.start);
  siswaCell.value = "DATA SISWA";
  styleHeaderCell(siswaCell, C.siswaHeader, C.white);

  // "KEUANGAN"
  ws.mergeCells(`${colLetter(keuR.start)}1:${colLetter(keuR.end)}1`);
  const keuCell = row1.getCell(keuR.start);
  keuCell.value = "KEUANGAN";
  styleHeaderCell(keuCell, C.keuHeader, C.white);

  // "SERTIFIKAT"
  ws.mergeCells(`${colLetter(sertR.start)}1:${colLetter(sertR.end)}1`);
  const sertCell = row1.getCell(sertR.start);
  sertCell.value = "SERTIFIKAT";
  styleHeaderCell(sertCell, C.sertHeader, C.white);

  // ── Row 2: Sub-column headers ──────────────────────────────────────────────
  const row2 = ws.getRow(2);
  row2.height = 32;
  cols.forEach((c, i) => {
    const cell = row2.getCell(i + 1);
    cell.value = c.header;
    const bgColor = c.group === "siswa" ? C.siswaSub
      : c.group === "keu" ? C.keuSub
      : c.group === "sert" ? C.sertSub
      : { argb: "FFD5D8DC" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: bgColor };
    cell.font = { bold: true, size: 10, color: C.dark };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = ALL_BORDER;
  });

  // ── Row 3: Hint/option row ─────────────────────────────────────────────────
  const row3 = ws.getRow(3);
  row3.height = 22;
  const hints: Record<string, string> = {
    no:        "Otomatis",
    no_induk:  "Cth: 01.0927",
    nama:      "Nama lengkap",
    nik:       "16 digit (atau kosong)",
    tmp_lahir: "Kota/Kab",
    tgl_lahir: "YYYY-MM-DD",
    alamat:    "Alamat lengkap",
    no_hp:     "08xx-xxxx-xxxx",
    pend:      "SD/SMP/SMA/SMK/dll",
    program:   "GTAW / SMAW 4G / dll",
    email:     "email@gmail.com",
    tgl_masuk: "YYYY-MM-DD",
    durasi:    "Hari (cth: 51)",
    biaya:     "Nominal (atau 2500000(sertifikat))",
    skema:     "Lunas / Cicil",
    tgl_p1:    "YYYY-MM-DD",
    nom_1:     "Nominal angka",
    tgl_p2:    "YYYY-MM-DD",
    nom_2:     "Nominal angka",
    tgl_p3:    "", tgl_p4: "", tgl_p5: "", tgl_p6: "",
    nom_3:     "", nom_4: "", nom_5: "", nom_6: "",
    ket:       "Lunas / Belum Lunas / Out",
    no_sert:   "Cth: 041/STF/LPKS-SH/VI/2025",
  };
  cols.forEach((c, i) => {
    const cell = row3.getCell(i + 1);
    cell.value = hints[c.key] ?? "";
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4F8" } };
    cell.font = { italic: true, size: 9, color: C.hint };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = ALL_BORDER;
  });

  // ── Sample data rows (rows 4–7) ───────────────────────────────────────────
  const samples = [
    {
      no: 1, no_induk: "02.0927", nama: "Aziz Tedi Purwanto",
      nik: "3301030411020005", tmp_lahir: "Cilacap", tgl_lahir: "2002-11-04",
      alamat: "Jl. Pantai Laut No. 39 RT 005 RW 005, Welahan Wetan, Adipala, Cilacap",
      no_hp: "085600477933", pend: "MTS", program: "GTAW",
      email: "atedi135@gmail.com", tgl_masuk: "2025-04-28", durasi: 51,
      biaya: 8500000, skema: "Cicil",
      tgl_p1: "2025-04-26", nom_1: 4250000,
      tgl_p2: "2025-06-03", nom_2: 4250000,
      tgl_p3: "", nom_3: "", tgl_p4: "", nom_4: "",
      tgl_p5: "", nom_5: "", tgl_p6: "", nom_6: "",
      ket: "Lunas", no_sert: "041 / STF / LPKS - SH / VI / 2025",
    },
    {
      no: 2, no_induk: "01.0940", nama: "Banar Riyanto",
      nik: "3301212407810004", tmp_lahir: "Cilacap", tgl_lahir: "1981-07-24",
      alamat: "Desa Limbangan, Kec. Wanareja, Kab. Cilacap, Jawa Tengah",
      no_hp: "081234567890", pend: "SMA", program: "SMAW 6G",
      email: "banar.riyanto@gmail.com", tgl_masuk: "2017-05-01", durasi: 51,
      biaya: "2500000(sertifikat)", skema: "Lunas",
      tgl_p1: "2017-05-01", nom_1: 2500000,
      tgl_p2: "", nom_2: "", tgl_p3: "", nom_3: "",
      tgl_p4: "", nom_4: "", tgl_p5: "", nom_5: "", tgl_p6: "", nom_6: "",
      ket: "Lunas", no_sert: "037 / STF / LPKS - SH / VII / 2017",
    },
    {
      no: 3, no_induk: "03.0929", nama: "Niko Yudiantoro",
      nik: "3301010502040003", tmp_lahir: "Cilacap", tgl_lahir: "2004-02-05",
      alamat: "Dusun Wungureja RT 003 RW 008, Kaliwungu, Kedungreja, Cilacap",
      no_hp: "088200765371", pend: "SMK", program: "Kombinasi",
      email: "nikoyudiantoro8@gmail.com", tgl_masuk: "2025-05-12", durasi: 98,
      biaya: 13000000, skema: "Cicil",
      tgl_p1: "2025-05-08", nom_1: 5500000,
      tgl_p2: "2025-09-22", nom_2: 6500000,
      tgl_p3: "2026-01-22", nom_3: 1000000,
      tgl_p4: "", nom_4: "", tgl_p5: "", nom_5: "", tgl_p6: "", nom_6: "",
      ket: "Lunas", no_sert: "053 / STF / LPKS - SH / VIII / 2025",
    },
    {
      no: 4, no_induk: "03.0929", nama: "Niko Yudiantoro",
      nik: "3301010502040003", tmp_lahir: "Cilacap", tgl_lahir: "2004-02-05",
      alamat: "Dusun Wungureja RT 003 RW 008, Kaliwungu, Kedungreja, Cilacap",
      no_hp: "088200765371", pend: "SMK", program: "SMAW 6G (Banper)",
      email: "nikoyudiantoro8@gmail.com", tgl_masuk: "2025-10-28", durasi: 51,
      biaya: 14000000, skema: "Lunas",
      tgl_p1: "2025-10-22", nom_1: 14000000,
      tgl_p2: "", nom_2: "", tgl_p3: "", nom_3: "",
      tgl_p4: "", nom_4: "", tgl_p5: "", nom_5: "", tgl_p6: "", nom_6: "",
      ket: "Lunas", no_sert: "",
    },
  ];

  samples.forEach((s, idx) => {
    const rowNum = idx + 4;
    const row = ws.getRow(rowNum);
    row.height = 20;
    const bg = idx % 2 === 0 ? C.rowBase : C.rowAlt;
    cols.forEach((c, ci) => {
      const cell = row.getCell(ci + 1);
      const val = (s as Record<string, unknown>)[c.key];
      cell.value = val !== undefined && val !== "" ? val as ExcelJS.CellValue : null;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: bg };
      cell.font = { size: 10, color: C.dark };
      cell.alignment = { vertical: "middle", wrapText: false };
      cell.border = ALL_BORDER;
      // Format dates
      if (c.key.startsWith("tgl_") && cell.value) {
        cell.numFmt = "YYYY-MM-DD";
      }
      // Format currency
      if (c.key.startsWith("nom_") || c.key === "biaya") {
        if (typeof cell.value === "number") cell.numFmt = "#,##0";
      }
    });
  });

  // ── Keterangan sheet (helper) ──────────────────────────────────────────────
  const wsKet = wb.addWorksheet("Keterangan");
  wsKet.columns = [{ width: 22 }, { width: 40 }];
  const ketData = [
    ["KOLOM", "PENJELASAN / OPSI NILAI"],
    ["Program", "Nama program: SMAW 4G, SMAW 6G, GTAW, FCAW, FCAW/GMAW 3G, SMAW 6G/FCAW 4G, Kombinasi"],
    ["Program (Banper)", "Tambah ' (Banper)' di belakang nama program. Cth: SMAW 6G (Banper). No. Induk boleh sama dengan program reguler."],
    ["Durasi (hari)", "Jumlah hari pelatihan. tgl_keluar = tgl_masuk + durasi."],
    ["Biaya Pelatihan", "Masukkan angka nominal (cth: 8500000). Untuk alumni sertifikat saja (tanpa pelatihan), tambahkan '(sertifikat)' di belakang angka. Cth: 2500000(sertifikat)."],
    ["Skema Pembayaran", "Lunas / Cicil"],
    ["Tgl. Pembayaran", "Format YYYY-MM-DD. Kosongkan jika tidak ada."],
    ["Nominal", "Angka tanpa titik/koma. Kosongkan jika tidak ada."],
    ["Ket", "Lunas / Belum Lunas / Out"],
    ["No. Sertifikat", "Format: 041 / STF / LPKS - SH / VI / 2025. Kosongkan jika belum ada."],
    ["No. Induk Duplikat", "Boleh ada no. induk sama selama nama program berbeda (kasus Banper)."],
  ];
  ketData.forEach((row, i) => {
    const r = wsKet.addRow(row);
    r.height = 20;
    if (i === 0) {
      r.font = { bold: true, color: { argb: "FFFFFFFF" } };
      r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    } else {
      r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? "FFF8F9FA" : "FFFFFFFF" } };
    }
    r.eachCell(cell => { cell.border = ALL_BORDER; cell.alignment = { wrapText: true, vertical: "middle" }; });
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

const ALL_BORDER: Partial<ExcelJS.Borders> = {
  top:    { style: "thin", color: { argb: "FFBDC3C7" } },
  left:   { style: "thin", color: { argb: "FFBDC3C7" } },
  bottom: { style: "thin", color: { argb: "FFBDC3C7" } },
  right:  { style: "thin", color: { argb: "FFBDC3C7" } },
};

function styleHeaderCell(
  cell: ExcelJS.Cell,
  bgColor: { argb: string },
  fontColor: { argb: string }
) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: bgColor };
  cell.font = { bold: true, size: 12, color: fontColor };
  cell.alignment = { vertical: "middle", horizontal: "center" };
  cell.border = ALL_BORDER;
}
