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
      const type = request.nextUrl.searchParams.get("type");

      if (type === "rekap_siswa") {
        // Default Rekap Status Pembayaran Siswa Aktif
        const today = new Date().toISOString().split("T")[0];
        const { data: siswaList } = await supabase
          .from("siswa")
          .select("id, nomor_induk, nama_lengkap, program:master_program(nama, biaya)")
          .not("nik", "like", "ANON-%")
          .neq("alamat_lengkap", "[DATA DIHAPUS]")
          .or(`tgl_keluar.is.null,tgl_keluar.gte.${today}`)
          .order("urutan_nomor", { ascending: true, nullsFirst: false })
          .order("nomor_induk", { ascending: true });

        const siswaIds = (siswaList || []).map((s) => s.id);
        const { data: txList } = await supabase
          .from("transaksi_keuangan")
          .select("siswa_id, nominal")
          .in("siswa_id", siswaIds.length > 0 ? siswaIds : ["00000000-0000-0000-0000-000000000000"]);

        const txTotalMap = new Map<string, number>();
        txList?.forEach((tx) => {
          txTotalMap.set(tx.siswa_id, (txTotalMap.get(tx.siswa_id) || 0) + Number(tx.nominal || 0));
        });

        exportRows = (siswaList || []).map((s) => {
          const prog = (s.program as unknown) as { nama: string; biaya: number } | null;
          const biaya = Number(prog?.biaya || 0);
          const terbayar = txTotalMap.get(s.id) || 0;
          const sisa = Math.max(0, biaya - terbayar);
          const isLunas = biaya > 0 && terbayar >= biaya;

          return {
            "Nomor Induk": s.nomor_induk,
            "Nama Siswa": s.nama_lengkap,
            Program: prog?.nama || "-",
            "Biaya Pelatihan (Rp)": biaya,
            "Total Terbayar (Rp)": terbayar,
            "Sisa Tagihan (Rp)": sisa,
            "Persentase": biaya > 0 ? `${Math.min(100, Math.round((terbayar / biaya) * 100))}%` : "0%",
            Status: isLunas ? "Lunas" : (terbayar > 0 ? "Cicilan" : "Belum Bayar"),
          };
        });
      } else {
        // Format Rekap Kas Bulanan (sesuai buku kas fisik: No, Nama Siswa, Tanggal Pembayaran, Pembayaran Bulan Ini, Akumulasi Saldo, Jumlah Saldo Bulan Ini)
        const NAMA_BULAN = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        const now = new Date();
        const paramBulan = parseInt(request.nextUrl.searchParams.get("bulan") || String(now.getMonth() + 1), 10);
        const paramTahun = parseInt(request.nextUrl.searchParams.get("tahun") || String(now.getFullYear()), 10);
        const namaBulan = NAMA_BULAN[paramBulan - 1] || "Bulan";

        const mStr = String(paramBulan).padStart(2, "0");
        const startDate = `${paramTahun}-${mStr}-01`;
        const lastDay = new Date(paramTahun, paramBulan, 0).getDate();
        const endDate = `${paramTahun}-${mStr}-${String(lastDay).padStart(2, "0")}`;

        const { data: txList } = await supabase
          .from("transaksi_keuangan")
          .select("id, tgl_bayar, nominal, metode, keterangan, penerima, siswa:siswa(id, nomor_induk, nama_lengkap, program:master_program(nama))")
          .gte("tgl_bayar", startDate)
          .lte("tgl_bayar", endDate)
          .order("tgl_bayar", { ascending: true })
          .order("created_at", { ascending: true });

        const aoa: (string | number)[][] = [];

        // Header Kop
        aoa.push(["REKAPITULASI PENDAPATAN KEUANGAN BULANAN"]);
        aoa.push(["LPKS PENGELASAN SUMBU HIDUP CILACAP"]);
        aoa.push([`Bulan: ${namaBulan} ${paramTahun}`]);
        aoa.push([]); // Baris kosong pemisah

        // Baris Header Kolom Tabel
        aoa.push([
          "NO",
          "NAMA SISWA",
          "TANGGAL PEMBAYARAN",
          "NO. INDUK",
          "PROGRAM PELATIHAN",
          "METODE",
          "KETERANGAN",
          "PEMBAYARAN BULAN INI (RP)",
          "AKUMULASI SALDO (RP)"
        ]);

        let runningSaldo = 0;
        let totalBulanIni = 0;

        if (!txList || txList.length === 0) {
          aoa.push(["-", "Tidak ada transaksi pembayaran pada bulan ini", "-", "-", "-", "-", "-", 0, 0]);
        } else {
          txList.forEach((tx, idx) => {
            const nominal = Number(tx.nominal || 0);
            runningSaldo += nominal;
            totalBulanIni += nominal;

            const s = (tx.siswa as unknown) as { nomor_induk?: string; nama_lengkap?: string; program?: { nama?: string } } | null;
            const namaSiswa = s?.nama_lengkap || tx.keterangan || "-";
            const noInduk = s?.nomor_induk || "-";
            const program = s?.program?.nama || "-";

            // Format tanggal Indonesia: DD Bulan YYYY
            const parts = tx.tgl_bayar ? tx.tgl_bayar.split("-") : [];
            let tglFormatted = tx.tgl_bayar || "-";
            if (parts.length === 3) {
              const day = parseInt(parts[2], 10);
              const mon = NAMA_BULAN[parseInt(parts[1], 10) - 1] || parts[1];
              tglFormatted = `${day} ${mon} ${parts[0]}`;
            }

            aoa.push([
              idx + 1,
              namaSiswa,
              tglFormatted,
              noInduk,
              program,
              tx.metode || "Tunai",
              tx.keterangan || "Pembayaran Pelatihan",
              nominal,
              runningSaldo
            ]);
          });
        }

        // Baris Summary Total Paling Bawah
        const summaryRowIdx = aoa.length;
        aoa.push([
          "JUMLAH SALDO BULAN INI",
          "",
          "",
          "",
          "",
          "",
          "",
          totalBulanIni,
          runningSaldo
        ]);

        const worksheet = XLSX.utils.aoa_to_sheet(aoa);

        // Lebar Kolom
        worksheet["!cols"] = [
          { wch: 6 },  // NO
          { wch: 32 }, // NAMA SISWA
          { wch: 22 }, // TANGGAL PEMBAYARAN
          { wch: 14 }, // NO. INDUK
          { wch: 22 }, // PROGRAM PELATIHAN
          { wch: 16 }, // METODE
          { wch: 28 }, // KETERANGAN
          { wch: 28 }, // PEMBAYARAN BULAN INI (RP)
          { wch: 26 }, // AKUMULASI SALDO (RP)
        ];

        // Penggabungan Cell
        worksheet["!merges"] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
          // Merge summary label di baris terakhir (kolom 0 sampai 6)
          { s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: 6 } },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap ${namaBulan}`);

        const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        const filenameKeuangan = `Rekap_Keuangan_${namaBulan}_${paramTahun}.xlsx`;

        return new NextResponse(excelBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filenameKeuangan}"`,
          },
        });
      }
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
    } else if (modul === "penilaian") {
      const siswaId = request.nextUrl.searchParams.get("siswa_id");

      // CASE A: EKSPOR TRANSKRIP NILAI INDIVIDUAL SISWA
      if (siswaId) {
        // Ambil data siswa
        const { data: siswaData, error: sErr } = await supabase
          .from("siswa")
          .select("id, nomor_induk, nama_lengkap, tgl_masuk, tgl_keluar, program:master_program(nama)")
          .eq("id", siswaId)
          .single();

        if (sErr || !siswaData) {
          return errorResponse("STUDENT_NOT_FOUND", "Data siswa tidak ditemukan.", 404);
        }

        const progName = ((siswaData.program as unknown) as { nama: string })?.nama || "-";

        // Ambil master kriteria
        const { data: masterKriteria } = await supabase
          .from("master_kriteria")
          .select("id, nama_kriteria, batas_lulus, urutan")
          .order("urutan", { ascending: true });

        // Ambil riwayat penilaian harian
        const { data: riwayatNilai } = await supabase
          .from("penilaian_harian")
          .select("id, tanggal, nilai, created_by, catatan, kriteria:master_kriteria(id, nama_kriteria, batas_lulus)")
          .eq("siswa_id", siswaId)
          .order("tanggal", { ascending: true });

        // Hitung nilai tertinggi & rata-rata per kriteria
        const kriteriaStats = new Map<string, { max: number; sum: number; count: number }>();
        riwayatNilai?.forEach((r) => {
          const kId = (r.kriteria as unknown as { id: string })?.id;
          if (!kId) return;
          const current = kriteriaStats.get(kId) || { max: 0, sum: 0, count: 0 };
          const val = Number(r.nilai || 0);
          current.max = Math.max(current.max, val);
          current.sum += val;
          current.count += 1;
          kriteriaStats.set(kId, current);
        });

        const aoa: (string | number)[][] = [];
        // Kop Header
        aoa.push(["TRANSKRIP HASIL EVALUASI PENILAIAN PRAKTEK"]);
        aoa.push(["LPKS PENGELASAN SUMBU HIDUP CILACAP"]);
        aoa.push([]);
        aoa.push(["IDENTITAS SISWA", ""]);
        aoa.push(["Nomor Induk", siswaData.nomor_induk || "-"]);
        aoa.push(["Nama Siswa", siswaData.nama_lengkap || "-"]);
        aoa.push(["Program Pelatihan", progName]);
        aoa.push(["Periode Pelatihan", `${siswaData.tgl_masuk || "-"} s.d. ${siswaData.tgl_keluar || "-"}`]);
        aoa.push([]);

        // Bagian I: Ringkasan Kompetensi Kriteria
        aoa.push(["BAGIAN I: STATUS KOMPETENSI KRITERIA (STANDAR KKM: 80)"]);
        aoa.push(["NO", "KRITERIA PENILAIAN", "STANDAR KKM", "NILAI TERTINGGI", "RATA-RATA", "STATUS KELAYAKAN"]);

        let totalKompeten = 0;
        masterKriteria?.forEach((k, idx) => {
          const stats = kriteriaStats.get(k.id) || { max: 0, sum: 0, count: 0 };
          const isLulus = stats.max >= k.batas_lulus;
          if (isLulus) totalKompeten++;
          const avg = stats.count > 0 ? Math.round((stats.sum / stats.count) * 10) / 10 : 0;
          aoa.push([
            idx + 1,
            k.nama_kriteria,
            k.batas_lulus,
            stats.max,
            avg,
            isLulus ? "KOMPETEN" : "BELUM KOMPETEN"
          ]);
        });

        const totalKriteria = masterKriteria?.length || 5;
        const siapUjian = totalKompeten === totalKriteria && totalKriteria > 0;
        aoa.push(["STATUS KELAYAKAN UJIAN", "", "", "", "", siapUjian ? "SIAP UJIAN" : "DALAM BIMBINGAN"]);
        aoa.push([]);

        // Bagian II: Rincian Riwayat Penilaian Harian
        const startRiwayatRow = aoa.length;
        aoa.push(["BAGIAN II: RINCIAN RIWAYAT PENILAIAN HARIAN"]);
        aoa.push(["NO", "TANGGAL", "KRITERIA", "NILAI", "STATUS INPUT", "CATATAN INSTRUKTUR"]);

        if (!riwayatNilai || riwayatNilai.length === 0) {
          aoa.push(["-", "Belum ada riwayat penilaian harian yang tercatat", "-", "-", "-", "-"]);
        } else {
          riwayatNilai.forEach((r, idx) => {
            const kName = (r.kriteria as unknown as { nama_kriteria: string })?.nama_kriteria || "-";
            aoa.push([
              idx + 1,
              r.tanggal,
              kName,
              r.nilai,
              r.created_by === "superadmin" ? "Instruktur" : "Mandiri Siswa",
              r.catatan || "-"
            ]);
          });
        }

        const worksheet = XLSX.utils.aoa_to_sheet(aoa);
        worksheet["!cols"] = [
          { wch: 6 },  // No
          { wch: 28 }, // Kriteria / Tanggal
          { wch: 18 }, // Standar KKM / Kriteria
          { wch: 18 }, // Nilai Tertinggi / Nilai
          { wch: 18 }, // Rata-rata / Status Input
          { wch: 32 }, // Status Kelayakan / Catatan
        ];

        worksheet["!merges"] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
          { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
          { s: { r: 9, c: 0 }, e: { r: 9, c: 5 } },
          { s: { r: 16, c: 0 }, e: { r: 16, c: 4 } },
          { s: { r: startRiwayatRow, c: 0 }, e: { r: startRiwayatRow, c: 5 } },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Transkrip Nilai");

        const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        const cleanName = (siswaData.nama_lengkap || "Siswa").replace(/[\s\/:]+/g, "_");
        const cleanNo = (siswaData.nomor_induk || "00").replace(/[\s\/:]+/g, ".");
        const filenameTranskrip = `Transkrip_Nilai_${cleanNo}_${cleanName}.xlsx`;

        return new NextResponse(excelBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filenameTranskrip}"`,
          },
        });
      } else {
        // CASE B: EKSPOR REKAPITULASI PENILAIAN HARIAN SELURUH SISWA AKTIF
        const today = new Date().toISOString().split("T")[0];
        const programId = request.nextUrl.searchParams.get("program_id");

        let siswaQuery = supabase
          .from("siswa")
          .select("id, nomor_induk, nama_lengkap, tgl_masuk, tgl_keluar, program:master_program(nama)")
          .not("nik", "like", "ANON-%")
          .neq("alamat_lengkap", "[DATA DIHAPUS]")
          .or(`tgl_keluar.is.null,tgl_keluar.gte.${today}`)
          .order("urutan_nomor", { ascending: true, nullsFirst: false })
          .order("nomor_induk", { ascending: true });

        if (programId) {
          siswaQuery = siswaQuery.eq("program_id", programId);
        }

        const { data: siswaList } = await siswaQuery;
        const siswaIds = (siswaList || []).map((s) => s.id);

        const { data: masterKriteria } = await supabase
          .from("master_kriteria")
          .select("id, nama_kriteria, batas_lulus, urutan")
          .order("urutan", { ascending: true });

        const totalKriteriaCount = masterKriteria?.length || 5;

        const { data: allNilai } = await supabase
          .from("penilaian_harian")
          .select("siswa_id, tanggal, nilai, kriteria_id")
          .in("siswa_id", siswaIds.length > 0 ? siswaIds : ["00000000-0000-0000-0000-000000000000"]);

        const nilaiMap = new Map<string, typeof allNilai>();
        allNilai?.forEach((n) => {
          if (!nilaiMap.has(n.siswa_id)) nilaiMap.set(n.siswa_id, []);
          nilaiMap.get(n.siswa_id)!.push(n);
        });

        const aoa: (string | number)[][] = [];
        aoa.push(["REKAPITULASI PENILAIAN HARIAN PRAKTEK SISWA"]);
        aoa.push(["LPKS PENGELASAN SUMBU HIDUP CILACAP"]);
        aoa.push([`Tanggal Ekspor: ${today}`]);
        aoa.push([]);

        aoa.push([
          "NO",
          "NO. INDUK",
          "NAMA SISWA",
          "PROGRAM PELATIHAN",
          "TOTAL HARI DINILAI",
          "RATA-RATA NILAI",
          "NILAI TERTINGGI",
          "KRITERIA KOMPETEN",
          "STATUS UJIAN",
          "TERAKHIR DINILAI"
        ]);

        (siswaList || []).forEach((s, idx) => {
          const progName = ((s.program as unknown) as { nama: string })?.nama || "-";
          const studentScores = nilaiMap.get(s.id) || [];
          const uniqueDates = new Set<string>();
          let sumScore = 0;
          let highestScore = 0;
          let latestDate: string = "-";
          const maxPerKriteria = new Map<string, number>();

          studentScores.forEach((row) => {
            uniqueDates.add(row.tanggal);
            const score = Number(row.nilai || 0);
            sumScore += score;
            if (score > highestScore) highestScore = score;
            if (latestDate === "-" || row.tanggal > latestDate) latestDate = row.tanggal;

            const currMax = maxPerKriteria.get(row.kriteria_id) || 0;
            if (score > currMax) maxPerKriteria.set(row.kriteria_id, score);
          });

          const totalHari = uniqueDates.size;
          const rataRata = studentScores.length > 0 ? Math.round((sumScore / studentScores.length) * 10) / 10 : 0;

          let kriteriaLulusCount = 0;
          masterKriteria?.forEach((k) => {
            const maxK = maxPerKriteria.get(k.id) || 0;
            if (maxK >= k.batas_lulus) kriteriaLulusCount++;
          });

          const siapUjian = kriteriaLulusCount === totalKriteriaCount && totalKriteriaCount > 0;
          let statusStr = "Belum Dinilai";
          if (studentScores.length > 0) {
            statusStr = siapUjian ? "Siap Ujian" : "Dalam Bimbingan";
          }

          aoa.push([
            idx + 1,
            s.nomor_induk || "-",
            s.nama_lengkap || "-",
            progName,
            totalHari,
            rataRata,
            highestScore,
            `${kriteriaLulusCount}/${totalKriteriaCount}`,
            statusStr,
            latestDate
          ]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(aoa);
        worksheet["!cols"] = [
          { wch: 6 },  // NO
          { wch: 14 }, // NO. INDUK
          { wch: 30 }, // NAMA SISWA
          { wch: 22 }, // PROGRAM PELATIHAN
          { wch: 20 }, // TOTAL HARI DINILAI
          { wch: 18 }, // RATA-RATA NILAI
          { wch: 16 }, // NILAI TERTINGGI
          { wch: 20 }, // KRITERIA KOMPETEN
          { wch: 18 }, // STATUS UJIAN
          { wch: 18 }, // TERAKHIR DINILAI
        ];

        worksheet["!merges"] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Penilaian");

        const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        const filenameRekap = `Rekap_Penilaian_Harian_${today}.xlsx`;

        return new NextResponse(excelBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filenameRekap}"`,
          },
        });
      }
    } else {
      return errorResponse("INVALID_MODUL", "Modul ekspor tidak didukung. Pilihan: siswa, keuangan, presensi, penilaian.", 400);
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
