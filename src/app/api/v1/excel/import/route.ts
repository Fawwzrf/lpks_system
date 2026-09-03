import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const modul = request.nextUrl.searchParams.get("modul") || "siswa";
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("NO_FILE", "File spreadsheet (.xlsx / .csv) wajib diunggah.", 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return errorResponse("EMPTY_FILE", "File spreadsheet tidak memiliki sheet aktif.", 400);
    }

    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows || rows.length === 0) {
      return errorResponse("EMPTY_DATA", "Sheet tidak memuat baris data untuk diimpor.", 400);
    }

    const supabase = await createClient();

    if (modul === "siswa") {
      let importedCount = 0;
      const errors: { row: number; reason: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const kodeProgram = String(row["kode_program"] || "").trim();
        const namaLengkap = String(row["nama_lengkap"] || "").trim();
        const nik = String(row["nik"] || "").trim();
        const email = String(row["email"] || "").trim();

        if (!kodeProgram || !namaLengkap || !nik || !email) {
          errors.push({ row: i + 2, reason: "Kolom kode_program, nama_lengkap, nik, atau email kosong." });
          continue;
        }

        // Cari program_id berdasarkan kode_program
        const { data: program } = await supabase
          .from("master_program")
          .select("id")
          .eq("kode_program", kodeProgram)
          .single();

        if (!program) {
          errors.push({ row: i + 2, reason: `Kode program '${kodeProgram}' tidak ditemukan.` });
          continue;
        }

        // Generate nomor induk
        const { data: noInduk } = await supabase.rpc("generate_nomor_induk", {
          p_program_id: program.id,
        });

        const { error: insertError } = await supabase.from("siswa").insert({
          program_id: program.id,
          nomor_induk: noInduk,
          nama_lengkap: namaLengkap,
          nik,
          email,
          no_hp: String(row["no_hp"] || "").trim() || null,
          tempat_lahir: String(row["tempat_lahir"] || "").trim() || null,
          tgl_lahir: row["tgl_lahir"] || null,
          alamat_lengkap: String(row["alamat_lengkap"] || "").trim() || null,
          nama_ayah: String(row["nama_ayah"] || "").trim() || null,
          nama_ibu: String(row["nama_ibu"] || "").trim() || null,
          pendidikan_terakhir: String(row["pendidikan_terakhir"] || "").trim() || null,
          nisn: String(row["nisn"] || "").trim() || null,
          tgl_masuk: row["tgl_masuk"] || new Date().toISOString().split("T")[0],
          checklist_berkas: {
            ijazah: true,
            ktp: true,
            kk: true,
            foto: true,
            suket_sehat: true,
          },
        });

        if (insertError) {
          errors.push({ row: i + 2, reason: insertError.message });
        } else {
          importedCount++;
        }
      }

      return successResponse({
        total_rows: rows.length,
        imported_count: importedCount,
        failed_count: errors.length,
        errors,
        message: `Impor berhasil: ${importedCount} data siswa baru disimpan (${errors.length} dilewati).`,
      });
    }

    return errorResponse("NOT_IMPLEMENTED", `Impor untuk modul '${modul}' belum didukung.`, 400);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memproses file impor Excel.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
