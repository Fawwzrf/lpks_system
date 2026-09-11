import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateStudentUsername, generateStudentPassword } from "@/lib/gate-checks";
import * as XLSX from "xlsx";

function parseExcelDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "number") {
    // Excel serial date to JS Date
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split("T")[0];
  }
  if (typeof val === "string") {
    const s = val.trim();
    // try to parse DD/MM/YYYY or DD-MM-YYYY
    const parts = s.split(/[\/\-]/);
    if (parts.length === 3) {
      // Assuming DD/MM/YYYY or D/M/YYYY
      let day = parts[0];
      let month = parts[1];
      let year = parts[2];
      
      // If the first part is 4 digits, it's already YYYY-MM-DD
      if (day.length === 4) return s;
      
      day = day.padStart(2, "0");
      month = month.padStart(2, "0");
      year = year.length === 2 ? `20${year}` : year;
      return `${year}-${month}-${day}`;
    }
    return s;
  }
  return null;
}

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
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let importedCount = 0;
            const errors: { row: number; reason: string }[] = [];

            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              const kodeProgram = String(row["Program"] || "").trim();
              const manualNoInduk = String(row["No. Induk"] || "").trim();
              const namaLengkap = String(row["Nama"] || "").trim();
              const nik = String(row["NIK"] || "").trim();
              const email = String(row["Email"] || "").trim();

              if (!kodeProgram && !namaLengkap && !nik && !email) {
                // Abaikan baris yang benar-benar kosong (biasanya sisa baris excel)
                continue;
              }

              if (!kodeProgram || !namaLengkap || !nik || !email) {
                errors.push({ row: i + 2, reason: "Data wajib (Program, Nama, NIK, atau Email Excel) belum terisi lengkap." });
              } else {
                const { data: program } = await supabase
                  .from("master_program")
                  .select("id")
                  .or(`kode_program.ilike.${kodeProgram},nama.ilike.${kodeProgram}`)
                  .maybeSingle();

                if (!program) {
                  errors.push({ row: i + 2, reason: `Program '${kodeProgram}' tidak dikenali (pastikan nama/kode program sesuai template).` });
                } else {
                  let noInduk = manualNoInduk;
                  if (!noInduk || noInduk.toLowerCase().includes("abaikan") || noInduk.toLowerCase().includes("auto")) {
                    const { data: generatedNoInduk } = await supabase.rpc("generate_nomor_induk", {
                      p_program_id: program.id,
                    });
                    noInduk = generatedNoInduk;
                  }

                  const urutan = String(noInduk).split(".")[1] || "0001";
                  const username = generateStudentUsername(namaLengkap, urutan);
                  const generatedPassword = generateStudentPassword(username);
                  // Ensure strictly valid email by removing anything that isn't a-z or 0-9 from the username part
                  const authEmail = `${username.replace(/[^a-zA-Z0-9]/g, "")}@lpks.id`.toLowerCase();

                  const supabaseAdmin = createAdminClient();

                  const { data: existingUser } = await supabase
                    .from("siswa")
                    .select("id")
                    .or(`username.eq.${username},nik.eq.${nik}`)
                    .maybeSingle();

                  if (existingUser) {
                    errors.push({ row: i + 2, reason: `Siswa dengan NIK atau Username ini sudah terdaftar sebelumnya.` });
                  } else {
                    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
                      email: authEmail,
                      password: generatedPassword,
                      email_confirm: true,
                      user_metadata: { role: "siswa", nama: namaLengkap.trim() },
                    });

                    if (authCreateError || !authData.user) {
                      errors.push({ row: i + 2, reason: `Gagal mendaftarkan akun sistem: ${authCreateError?.message === 'Unable to validate email address: invalid format' ? 'Format email/nama memuat karakter tidak valid' : authCreateError?.message}` });
                    } else {
                      const { error: insertError } = await supabase.from("siswa").insert({
                        auth_id: authData.user.id,
                        program_id: program.id,
                        nomor_induk: noInduk,
                        username,
                        nama_lengkap: namaLengkap,
                        nik,
                        email,
                        no_hp: String(row["No. HP"] || "").trim() || null,
                        tempat_lahir: String(row["Tempat Lahir"] || "").trim() || null,
                        tgl_lahir: parseExcelDate(row["Tanggal Lahir"]),
                        alamat_lengkap: String(row["Alamat"] || "").trim() || null,
                        nama_ayah: String(row["Nama Ayah"] || "").trim() || null,
                        nama_ibu: String(row["Nama Ibu"] || "").trim() || null,
                        pendidikan_terakhir: String(row["Pend. Terakhir"] || "").trim() || null,
                        nisn: String(row["NISN"] || "").trim() || null,
                        tgl_masuk: parseExcelDate(row["Tgl. Masuk"]) || new Date().toISOString().split("T")[0],
                        tgl_keluar: parseExcelDate(row["Tgl. Keluar"]),
                        checklist_berkas: {
                          ijazah: true,
                          ktp: true,
                          kk: true,
                          foto: true,
                          suket_sehat: true,
                        },
                        is_password_default: true,
                      });

                      if (insertError) {
                        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                        errors.push({ row: i + 2, reason: insertError.message });
                      } else {
                        importedCount++;
                      }
                    }
                  }
                }
              }

              // Send progress
              const progress = Math.round(((i + 1) / rows.length) * 100);
              const progressMsg = JSON.stringify({
                type: "progress",
                progress,
                status: `Memproses baris ${i + 1} dari ${rows.length}...`
              });
              controller.enqueue(encoder.encode(progressMsg + "\n"));
            }

            // Send done
            const doneMsg = JSON.stringify({
              type: "done",
              result: {
                total_rows: rows.length,
                imported_count: importedCount,
                failed_count: errors.length,
                errors,
                message: `Impor selesai: ${importedCount} data siswa baru disimpan (${errors.length} gagal/dilewati).`
              }
            });
            controller.enqueue(encoder.encode(doneMsg + "\n"));
            controller.close();
          } catch (streamErr) {
            const errMsg = JSON.stringify({
              type: "error",
              message: streamErr instanceof Error ? streamErr.message : String(streamErr)
            });
            controller.enqueue(encoder.encode(errMsg + "\n"));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
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
