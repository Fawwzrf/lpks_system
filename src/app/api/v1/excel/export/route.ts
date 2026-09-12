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
        .not("nik", "like", "ANON-%")
        .order("urutan_nomor", { ascending: true, nullsFirst: false })
        .order("nomor_induk", { ascending: true });

      // Pastikan data yang dihapus (alamat [DATA DIHAPUS] atau NIK anonim) tidak diekspor
      const activeSiswaList = siswaList?.filter(
        (s) => !s.nik?.startsWith("ANON-") && s.alamat_lengkap !== "[DATA DIHAPUS]"
      ) || [];

      exportRows =
        activeSiswaList.map((s, idx) => {
          const emailRaw = String(s.email || "").trim();
          // Kosongkan email yang dibuat otomatis oleh sistem (@lpks.id), hanya ekspor email riil
          const isAutoEmail = !emailRaw || emailRaw.toLowerCase().includes("@lpks.id");
          const displayEmail = isAutoEmail ? "" : emailRaw;

          return {
            "No": idx + 1,
            "No. Induk": s.nomor_induk || "-",
            "Nama": s.nama_lengkap || "-",
            "NIK": s.nik || "-",
            "Tempat Lahir": s.tempat_lahir || "-",
            "Tanggal Lahir": s.tgl_lahir || "-",
            "Alamat": s.alamat_lengkap || "-",
            "Nama Ayah": s.nama_ayah || "-",
            "Nama Ibu": s.nama_ibu || "-",
            "No. HP": s.no_hp || "-",
            "Email": displayEmail,
            "Pend. Terakhir": s.pendidikan_terakhir || "-",
            "NISN": s.nisn || "-",
            "Program": ((s.program as any)?.nama) || "-",
            "Tgl. Masuk": s.tgl_masuk || "-",
            "Tgl. Keluar": s.tgl_keluar || "-",
            "Username": s.username || "-",
            "Password": s.is_password_default ? (s.username || "-") : "(Telah Diubah Mandiri)"
          };
        }) || [];
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
    } else if (modul === "presensi") {
      const searchParams = request.nextUrl.searchParams;
      const paramBulan = searchParams.get("bulan"); // 1-12
      const paramTahun = searchParams.get("tahun"); // e.g. 2026
      const paramStartDate = searchParams.get("start_date");
      const paramEndDate = searchParams.get("end_date");
      const paramProgramId = searchParams.get("program_id");

      const now = new Date();
      let dates: string[] = [];
      let periodeLabel = "";
      let monthName = "";

      const NAMA_BULAN = [
        "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
        "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
      ];

      if (paramStartDate && paramEndDate) {
        const start = new Date(paramStartDate);
        const end = new Date(paramEndDate);
        const cur = new Date(start);
        while (cur <= end) {
          dates.push(cur.toISOString().split("T")[0]);
          cur.setDate(cur.getDate() + 1);
        }
        periodeLabel = `${paramStartDate} s/d ${paramEndDate}`;
        monthName = NAMA_BULAN[start.getMonth()] + " " + start.getFullYear();
      } else {
        const bulan = paramBulan ? parseInt(paramBulan, 10) : now.getMonth() + 1;
        const tahun = paramTahun ? parseInt(paramTahun, 10) : now.getFullYear();
        const daysInMonth = new Date(tahun, bulan, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const dStr = String(d).padStart(2, "0");
          const mStr = String(bulan).padStart(2, "0");
          dates.push(`${tahun}-${mStr}-${dStr}`);
        }
        monthName = `${NAMA_BULAN[bulan - 1]} ${tahun}`;
        periodeLabel = monthName;
      }

      // Ambil daftar siswa aktif (belum lulus)
      let siswaQuery = supabase
        .from("siswa")
        .select("id, nomor_induk, nama_lengkap, tgl_masuk, tgl_keluar, program:master_program(id, kode_program, nama)")
        .not("nik", "like", "ANON-%")
        .neq("alamat_lengkap", "[DATA DIHAPUS]")
        .or(`tgl_keluar.is.null,tgl_keluar.gte.${dates[0]}`)
        .order("urutan_nomor", { ascending: true, nullsFirst: false })
        .order("nomor_induk", { ascending: true });

      if (paramProgramId) {
        siswaQuery = siswaQuery.eq("program_id", paramProgramId);
      }

      const { data: siswaList } = await siswaQuery;

      // Ambil semua presensi dalam rentang tanggal
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      const { data: presensiList } = await supabase
        .from("presensi")
        .select("siswa_id, tanggal, status")
        .gte("tanggal", startDate)
        .lte("tanggal", endDate);

      // Petakan presensi: `${siswa_id}_${tanggal}` => status
      const presensiMap = new Map<string, string>();
      presensiList?.forEach((p) => {
        presensiMap.set(`${p.siswa_id}_${p.tanggal}`, p.status);
      });

      // Susun AOA (Array of Arrays) untuk format resmi LPKS Sumbu Hidup
      const totalCols = 3 + dates.length + 5; // No. Induk, Nama, Program + Tanggal + H, I, S, A, %
      const aoa: (string | number)[][] = [];

      // Baris Kop Surat (Kanan Atas)
      const headerRow1 = new Array(totalCols).fill("");
      headerRow1[totalCols - 1] = "DAFTAR HADIR SISWA";
      aoa.push(headerRow1);

      const headerRow2 = new Array(totalCols).fill("");
      headerRow2[totalCols - 1] = `PERIODE: ${periodeLabel}`;
      aoa.push(headerRow2);

      const headerRow3 = new Array(totalCols).fill("");
      headerRow3[totalCols - 1] = "LKP PENGELASAN SUMBU HIDUP CILACAP";
      aoa.push(headerRow3);

      aoa.push(new Array(totalCols).fill("")); // Baris kosong pemisah

      // Baris Header Tabel Bagian 1
      const tableHeader1: (string | number)[] = ["NO. INDUK", "NAMA SISWA", "PROGRAM"];
      for (let i = 0; i < dates.length; i++) {
        tableHeader1.push(i === 0 ? monthName : "");
      }
      tableHeader1.push("REKAPITULASI", "", "", "", "");
      aoa.push(tableHeader1);

      // Baris Header Tabel Bagian 2 (Nomor Tanggal & Kode Rekap)
      const tableHeader2: (string | number)[] = ["", "", ""];
      dates.forEach((d) => {
        const dayNum = parseInt(d.split("-")[2], 10);
        tableHeader2.push(dayNum);
      });
      tableHeader2.push("H", "I", "S", "A", "%");
      aoa.push(tableHeader2);

      // Baris Data Siswa
      siswaList?.forEach((s) => {
        let hCount = 0;
        let iCount = 0;
        let sCount = 0;
        let aCount = 0;

        const row: (string | number)[] = [
          s.nomor_induk || "-",
          s.nama_lengkap || "-",
          ((s.program as any)?.nama) || "-",
        ];

        dates.forEach((d) => {
          const status = presensiMap.get(`${s.id}_${d}`);
          if (status === "Hadir") {
            row.push("H");
            hCount++;
          } else if (status === "Izin") {
            row.push("I");
            iCount++;
          } else if (status === "Sakit") {
            row.push("S");
            sCount++;
          } else if (status === "Alpa") {
            row.push("A");
            aCount++;
          } else {
            row.push("");
          }
        });

        const totalMeetings = hCount + iCount + sCount + aCount;
        const pct = totalMeetings > 0 ? `${Math.round((hCount / totalMeetings) * 100)}%` : "-";

        row.push(hCount, iCount, sCount, aCount, pct);
        aoa.push(row);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(aoa);

      // Pengaturan Cell Merges
      worksheet["!merges"] = [
        // Header Kop kanan atas
        { s: { r: 0, c: totalCols - 6 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: totalCols - 6 }, e: { r: 1, c: totalCols - 1 } },
        { s: { r: 2, c: totalCols - 6 }, e: { r: 2, c: totalCols - 1 } },
        // Kolom tetap NO. INDUK, NAMA SISWA, PROGRAM (merge vertikal baris 4 dan 5)
        { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
        { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },
        { s: { r: 4, c: 2 }, e: { r: 5, c: 2 } },
        // Periode Bulan (merge horizontal seluruh kolom tanggal)
        { s: { r: 4, c: 3 }, e: { r: 4, c: 3 + dates.length - 1 } },
        // Rekapitulasi (merge horizontal kolom rekap)
        { s: { r: 4, c: 3 + dates.length }, e: { r: 4, c: 3 + dates.length + 4 } },
      ];

      // Pengaturan Lebar Kolom
      const colWidths: { wch: number }[] = [
        { wch: 12 }, // No. Induk
        { wch: 28 }, // Nama Siswa
        { wch: 22 }, // Program
      ];
      for (let i = 0; i < dates.length; i++) {
        colWidths.push({ wch: 4 }); // Tanggal
      }
      colWidths.push({ wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 7 }); // H, I, S, A, %
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Hadir");

      const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      const filenamePresensi = `Daftar_Hadir_${periodeLabel.replace(/[\s\/:]+/g, "_")}.xlsx`;

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filenamePresensi}"`,
        },
      });
    } else {
      return errorResponse("INVALID_MODUL", "Modul ekspor tidak didukung. Pilihan: siswa, keuangan, presensi.", 400);
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
