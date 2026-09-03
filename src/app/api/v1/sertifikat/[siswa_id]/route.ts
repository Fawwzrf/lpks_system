import { NextRequest, NextResponse } from "next/server";
import { errorResponse, requireStudentOwnerOrAdmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface Params {
  params: Promise<{ siswa_id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { siswa_id } = await params;
    const { errorResponse: authError } = await requireStudentOwnerOrAdmin(siswa_id);
    if (authError) return authError;

    const supabase = await createClient();

    // 1. Ambil data siswa & program
    const { data: siswa, error: siswaError } = await supabase
      .from("siswa")
      .select("*, program:master_program(*)")
      .eq("id", siswa_id)
      .single();

    if (siswaError || !siswa) {
      return errorResponse("NOT_FOUND", "Data siswa tidak ditemukan.", 404);
    }

    const totalBiaya = Number(((siswa.program as unknown) as { biaya: number })?.biaya) || 0;

    // 2. Gate 1: Cek Status Keuangan (Wajib LUNAS)
    const { data: transaksi } = await supabase
      .from("transaksi_keuangan")
      .select("nominal")
      .eq("siswa_id", siswa_id);

    const totalTerbayar = transaksi?.reduce((acc, curr) => acc + Number(curr.nominal), 0) || 0;
    const sisaTagihan = Math.max(0, totalBiaya - totalTerbayar);
    const isKeuanganLunas = sisaTagihan === 0 && totalBiaya > 0;

    // 3. Gate 2: Cek Status Ujian Internal (Wajib LULUS)
    const { data: ujian } = await supabase
      .from("ujian")
      .select("*")
      .eq("siswa_id", siswa_id)
      .single();

    const isUjianLulus = !!(ujian && ujian.is_lulus);

    // 4. Evaluasi Gate-Check Mutlak
    if (!isKeuanganLunas || !isUjianLulus) {
      const alasanList: string[] = [];
      if (!isKeuanganLunas) {
        alasanList.push(`Status keuangan belum lunas (Sisa tagihan: Rp ${sisaTagihan.toLocaleString("id-ID")}).`);
      }
      if (!isUjianLulus) {
        if (!ujian) {
          alasanList.push("Siswa belum mengikuti Ujian Internal.");
        } else {
          alasanList.push("Nilai Ujian Internal belum memenuhi ambang kelulusan minimum (>= 80 di setiap kriteria).");
        }
      }

      return errorResponse(
        "CERTIFICATE_LOCKED",
        "Sertifikat terkunci: Syarat kelulusan belum terpenuhi.",
        403,
        {
          keuangan_lunas: isKeuanganLunas,
          ujian_lulus: isUjianLulus,
          keterangan: alasanList.join(" "),
        }
      );
    }

    // 5. Generate PDF Sertifikat Resmi Menggunakan jsPDF
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4", // 297 x 210 mm
    });

    const namaSiswa = siswa.nama_lengkap.toUpperCase();
    const nomorInduk = siswa.nomor_induk;
    const programNama = ((siswa.program as unknown) as { nama: string })?.nama || "PENGELASAN";
    const noSertifikat = `LPKS-SH/${new Date().getFullYear()}/${nomorInduk.replace(".", "/")}`;

    // Desain Sertifikat Profesional
    // Border Ganda Elegan
    doc.setDrawColor(220, 38, 38); // Spark Merah
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);

    doc.setDrawColor(31, 41, 55); // Dark Charcoal
    doc.setLineWidth(0.5);
    doc.rect(13, 13, 271, 184);

    // Header Lembaga
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(220, 38, 38);
    doc.text("LEMBAGA PELATIHAN KERJA SWASTA (LPKS)", 148.5, 30, { align: "center" });

    doc.setFontSize(28);
    doc.setTextColor(17, 24, 39);
    doc.text("SUMBU HIDUP", 148.5, 42, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Spesialisasi Pelatihan & Sertifikasi Pengelasan Industri Terakreditasi", 148.5, 48, { align: "center" });

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(40, 52, 257, 52);

    // Judul Sertifikat
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(17, 24, 39);
    doc.text("SERTIFIKAT KELULUSAN", 148.5, 64, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Nomor: ${noSertifikat}`, 148.5, 70, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text("Diberikan secara sah kepada:", 148.5, 82, { align: "center" });

    // Nama Siswa
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(220, 38, 38);
    doc.text(namaSiswa, 148.5, 93, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    doc.text(`Nomor Induk Siswa: ${nomorInduk} | NIK: ${siswa.nik}`, 148.5, 100, { align: "center" });

    // Narasi Kelulusan
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text(
      `Telah menyelesaikan seluruh rangkaian pelatihan teori dan praktek pengelasan, serta dinyatakan LULUS`,
      148.5,
      112,
      { align: "center" }
    );
    doc.text(
      `Ujian Internal Pengelasan dengan kompetensi memuaskan pada Program:`,
      148.5,
      118,
      { align: "center" }
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(17, 24, 39);
    doc.text(programNama.toUpperCase(), 148.5, 128, { align: "center" });

    // Tabel Nilai Ringkas
    autoTable(doc, {
      startY: 135,
      margin: { left: 45, right: 45 },
      head: [["Teori", "Root Pass", "Hot Pass", "Filler", "Capping", "Gerinda", "Hasil Akhir"]],
      body: [
        [
          `${ujian?.teori || 0}`,
          `${ujian?.root || 0}`,
          `${ujian?.hotpass || 0}`,
          `${ujian?.filler || 0}`,
          `${ujian?.capping || 0}`,
          `${ujian?.gerinda || 0}`,
          "KOMPETEN / LULUS",
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [31, 41, 55],
        textColor: [255, 255, 255],
        fontSize: 9,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 9,
        halign: "center",
      },
    });

    // Tanda Tangan
    const tglCetak = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(`Bandung, ${tglCetak}`, 235, 168, { align: "center" });
    doc.text("Pimpinan / Instruktur Utama LPKS", 235, 173, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.text("( ___________________________ )", 235, 193, { align: "center" });

    // Output binary buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    const safeFileName = `Sertifikat_${nomorInduk.replace(/[^a-zA-Z0-9]/g, "_")}_${siswa.nama_lengkap.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFileName}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal membuat sertifikat PDF.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
