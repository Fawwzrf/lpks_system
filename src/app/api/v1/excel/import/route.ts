import { NextRequest } from "next/server";
import { errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateStudentUsername, generateStudentPassword } from "@/lib/gate-checks";
import * as XLSX from "xlsx";

/** Normalise Excel date values (serial number or DD/MM/YYYY string) to YYYY-MM-DD. */
function parseExcelDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split("T")[0];
  }
  if (typeof val === "string") {
    const s = val.trim();
    const parts = s.split(/[\/\-]/);
    if (parts.length === 3) {
      let [d1, d2, d3] = parts;
      // Already YYYY-MM-DD or YYYY/MM/DD
      if (d1.length === 4) return `${d1}-${d2.padStart(2, "0")}-${d3.padStart(2, "0")}`;
      // DD/MM/YYYY or D/M/YYYY
      const day   = d1.padStart(2, "0");
      const month = d2.padStart(2, "0");
      const year  = d3.length === 2 ? `20${d3}` : d3;
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
            let updatedCount = 0;
            const errors: { row: number; reason: string; type: "warning" | "error" }[] = [];

            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];

              const namaProgram   = String(row["Program"]       || "").trim();
              const manualNoInduk = String(row["No. Induk"]     || "").trim();
              const namaLengkap   = String(row["Nama"]          || "").trim();
              const nik           = String(row["NIK"]           || "").trim();
              const email         = String(row["Email"]         || "").trim();

              // Skip completely empty rows (trailing blank rows in Excel)
              if (!namaProgram && !namaLengkap && !nik) continue;

              // Nama, NIK, dan Program wajib ada
              if (!namaProgram || !namaLengkap || !nik) {
                errors.push({ row: i + 2, reason: "Kolom wajib belum diisi: pastikan Program, Nama, dan NIK terisi.", type: "warning" });
                // send progress & continue
                controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", progress: Math.round(((i + 1) / rows.length) * 100), status: `Memproses baris ${i + 1} dari ${rows.length}...` }) + "\n"));
                continue;
              }

              // ── Cari program ────────────────────────────────────────────
              // Jika kolom Program berisi angka (misal "01"), pakai prefix No. Induk sebagai kode
              // karena kode yang sama bisa punya >1 program (mis. SMAW 4G & SMAW 6G).
              // Jika berisi teks (mis. "SMAW 4G"), cari berdasarkan nama.
              let programId: string | null = null;
              const isNumericCode = /^\d+$/.test(namaProgram);

              if (isNumericCode) {
                const kodePrefix = manualNoInduk.split(".")[0].trim().padStart(2, "0");
                const { data: programs } = await supabase
                  .from("master_program")
                  .select("id, kode_program")
                  .eq("kode_program", kodePrefix);

                if (!programs || programs.length === 0) {
                  errors.push({ row: i + 2, reason: `Kode program '${kodePrefix}' tidak terdaftar di sistem.`, type: "error" });
                  controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", progress: Math.round(((i + 1) / rows.length) * 100), status: `Memproses baris ${i + 1} dari ${rows.length}...` }) + "\n"));
                  continue;
                }
                programId = programs[0].id;
              } else {
                const { data: prog } = await supabase
                  .from("master_program")
                  .select("id")
                  .ilike("nama", `%${namaProgram}%`)
                  .limit(1)
                  .maybeSingle();

                if (!prog) {
                  errors.push({ row: i + 2, reason: `Program '${namaProgram}' tidak ditemukan. Pastikan nama program sesuai daftar (contoh: SMAW 4G).`, type: "error" });
                  controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", progress: Math.round(((i + 1) / rows.length) * 100), status: `Memproses baris ${i + 1} dari ${rows.length}...` }) + "\n"));
                  continue;
                }
                programId = prog.id;
              }

              // ── Nomor Induk ─────────────────────────────────────────────
              // Normalisasi format dari Excel: "03. 1032" → "03.1032"
              let noInduk = manualNoInduk.replace(/\.\s+/g, ".");
              if (!noInduk || noInduk.toLowerCase().includes("abaikan") || noInduk.toLowerCase().includes("auto")) {
                const { data: generated } = await supabase.rpc("generate_nomor_induk");
                noInduk = generated;
              }

              // ── Username & auth email ────────────────────────────────────
              const urutanRaw = String(noInduk).includes(".")
                ? String(noInduk).split(".")[1].trim()
                : String(noInduk);
              const username = generateStudentUsername(namaLengkap, urutanRaw);
              const generatedPassword = generateStudentPassword(username);
              const namaDepanClean = namaLengkap.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "siswa";
              const cleanNoInduk = urutanRaw.replace(/\D/g, "") || String(Math.floor(1000 + Math.random() * 9000));
              const generatedEmail = `${namaDepanClean}.${cleanNoInduk}@lpks.id`;
              // Validasi email Excel: harus berformat x@y.z dan hanya satu @
              const emailValid = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.split("@").length === 2;
              // Pakai email Excel jika valid, fallback ke generated
              let authEmail = emailValid ? email : generatedEmail;

              const supabaseAdmin = createAdminClient();

              // Cek duplikat siswa:
              // Siswa boleh terdaftar lebih dari 1 kali jika mengambil program berbeda (misal 2 pelatihan berbeda).
              // Duplikat dicegah jika:
              // 1. Nomor Induk sudah terdaftar
              // 2. Username sudah terdaftar
              // 3. NIK yang sama di program yang sama sudah terdaftar
              const [{ data: byNoInduk }, { data: byUsername }, { data: byNikSameProgram }] = await Promise.all([
                supabase.from("siswa").select("id").eq("nomor_induk", noInduk).maybeSingle(),
                supabase.from("siswa").select("id").eq("username", username).maybeSingle(),
                programId ? supabase.from("siswa").select("id").eq("nik", nik).eq("program_id", programId).maybeSingle() : Promise.resolve({ data: null }),
              ]);

              const existingUser = byNoInduk || byNikSameProgram || byUsername;

              if (existingUser) {
                // Perbarui biodata siswa yang sudah ada (misal perbaikan Nama Ibu, Alamat, dsb)
                const updatePayload: Record<string, unknown> = {
                  nama_lengkap: namaLengkap,
                  nik,
                  tempat_lahir: String(row["Tempat Lahir"] || "").trim() || null,
                  tgl_lahir: parseExcelDate(row["Tanggal Lahir"]),
                  alamat_lengkap: String(row["Alamat"] || "").trim() || null,
                  nama_ayah: String(row["Nama Ayah"] || "").trim() || null,
                  nama_ibu: String(row["Nama Ibu"] || "").trim() || null,
                  no_hp: String(row["No. HP"] || "").trim() || null,
                  pendidikan_terakhir: String(row["Pend. Terakhir"] || "").trim() || null,
                  nisn: String(row["NISN"] || "").trim() || null,
                  tgl_masuk: parseExcelDate(row["Tgl. Masuk"]) || new Date().toISOString().split("T")[0],
                  tgl_keluar: parseExcelDate(row["Tgl. Keluar"]),
                  updated_at: new Date().toISOString(),
                };

                if (programId) {
                  updatePayload.program_id = programId;
                }
                if (noInduk) {
                  updatePayload.nomor_induk = noInduk;
                }

                // Jika di Excel ada email valid dan email di DB saat ini masih dummy @lpks.id, perbarui
                if (emailValid) {
                  const { data: currentSiswa } = await supabase
                    .from("siswa")
                    .select("email")
                    .eq("id", existingUser.id)
                    .single();
                  if (currentSiswa?.email?.toLowerCase().includes("@lpks.id")) {
                    updatePayload.email = email;
                  }
                }

                const { error: updateError } = await supabase
                  .from("siswa")
                  .update(updatePayload)
                  .eq("id", existingUser.id);

                if (updateError) {
                  errors.push({ row: i + 2, reason: `Gagal memperbarui data siswa: ${updateError.message}`, type: "error" });
                } else {
                  updatedCount++;
                }
              } else {
                // Jika authEmail sudah terpakai di tabel siswa (misal siswa mendaftar program ke-2 dengan email sama), fallback ke generatedEmail
                const { data: existingEmailInSiswa } = await supabase
                  .from("siswa")
                  .select("id")
                  .eq("email", authEmail)
                  .maybeSingle();

                if (existingEmailInSiswa) {
                  authEmail = generatedEmail;
                }

                let authData = null;
                let authCreateError = null;

                // Coba dengan authEmail; jika email sudah terdaftar di Auth, retry dengan generated email
                const attempt1 = await supabaseAdmin.auth.admin.createUser({
                  email: authEmail,
                  password: generatedPassword,
                  email_confirm: true,
                  user_metadata: { role: "siswa", nama: namaLengkap.trim() },
                });

                if (attempt1.error && attempt1.error.message.includes("already been registered") && authEmail !== generatedEmail) {
                  // Retry dengan generated email karena email Excel sudah dipakai
                  authEmail = generatedEmail;
                  const attempt2 = await supabaseAdmin.auth.admin.createUser({
                    email: authEmail,
                    password: generatedPassword,
                    email_confirm: true,
                    user_metadata: { role: "siswa", nama: namaLengkap.trim() },
                  });
                  authData = attempt2.data;
                  authCreateError = attempt2.error;
                } else {
                  authData = attempt1.data;
                  authCreateError = attempt1.error;
                }

                if (authCreateError || !authData?.user) {
                  errors.push({ row: i + 2, reason: `Gagal membuat akun untuk siswa ini. Coba import ulang baris ini.`, type: "error" });
                } else {
                  const { error: insertError } = await supabase.from("siswa").insert({
                    auth_id:              authData.user.id,
                    program_id:           programId,
                    nomor_induk:          noInduk,
                    username,
                    nama_lengkap:         namaLengkap,
                    nik,
                    email:                authEmail,
                    no_hp:                String(row["No. HP"]        || "").trim() || null,
                    tempat_lahir:         String(row["Tempat Lahir"]  || "").trim() || null,
                    tgl_lahir:            parseExcelDate(row["Tanggal Lahir"]),
                    alamat_lengkap:       String(row["Alamat"]        || "").trim() || null,
                    nama_ayah:            String(row["Nama Ayah"]     || "").trim() || null,
                    nama_ibu:             String(row["Nama Ibu"]      || "").trim() || null,
                    pendidikan_terakhir:  String(row["Pend. Terakhir"]|| "").trim() || null,
                    nisn:                 String(row["NISN"]          || "").trim() || null,
                    tgl_masuk:            parseExcelDate(row["Tgl. Masuk"]) || new Date().toISOString().split("T")[0],
                    tgl_keluar:           parseExcelDate(row["Tgl. Keluar"]),
                    checklist_berkas: { ijazah: true, ktp: true, kk: true, foto: true, suket_sehat: true },
                    is_password_default:  true,
                  });

                  if (insertError) {
                    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                    errors.push({ row: i + 2, reason: `Gagal menyimpan data siswa ke database. Silakan coba lagi.`, type: "error" });
                  } else {
                    importedCount++;
                  }
                }
              }

              // Send progress update after each row
              const progress = Math.round(((i + 1) / rows.length) * 100);
              controller.enqueue(encoder.encode(JSON.stringify({
                type: "progress",
                progress,
                status: `Memproses baris ${i + 1} dari ${rows.length}...`,
              }) + "\n"));
            }

            // Send done
            const statusParts: string[] = [];
            if (importedCount > 0) statusParts.push(`${importedCount} data siswa baru disimpan`);
            if (updatedCount > 0) statusParts.push(`${updatedCount} data siswa diperbarui`);
            if (errors.length > 0) statusParts.push(`${errors.length} gagal/dilewati`);
            const summaryMsg = `Impor selesai: ${statusParts.join(", ") || "0 data diproses"}.`;

            controller.enqueue(encoder.encode(JSON.stringify({
              type: "done",
              result: {
                total_rows:     rows.length,
                imported_count: importedCount,
                updated_count:  updatedCount,
                failed_count:   errors.length,
                errors,
                message: summaryMsg,
              },
            }) + "\n"));
            controller.close();
          } catch (streamErr) {
            controller.enqueue(encoder.encode(JSON.stringify({
              type: "error",
              message: streamErr instanceof Error ? streamErr.message : String(streamErr),
            }) + "\n"));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else if (modul === "presensi") {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let importedCount = 0;
            let updatedCount = 0;
            const errors: { row: number; reason: string; type: "warning" | "error" }[] = [];

            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              const rawNoInduk = String(row["nomor_induk"] || row["Nomor Induk"] || row["No. Induk"] || "").trim();
              const noInduk = rawNoInduk.replace(/\.\s+/g, ".");
              const rawTanggal = row["tanggal"] || row["Tanggal"];
              const tanggal = parseExcelDate(rawTanggal);
              const rawStatus = String(row["status"] || row["Status"] || "Hadir").trim();
              const keterangan = String(row["keterangan"] || row["Keterangan"] || "").trim() || null;

              if (!noInduk && !rawTanggal) continue;

              if (!noInduk) {
                errors.push({ row: i + 2, reason: "Nomor Induk siswa wajib diisi.", type: "error" });
                continue;
              }

              if (!tanggal) {
                errors.push({ row: i + 2, reason: "Format tanggal tidak valid. Gunakan YYYY-MM-DD atau DD/MM/YYYY.", type: "error" });
                continue;
              }

              // Normalisasi status (Hadir, Izin, Sakit, Alpa)
              let statusFormatted = "Hadir";
              const sLower = rawStatus.toLowerCase();
              if (sLower === "izin" || sLower === "i") statusFormatted = "Izin";
              else if (sLower === "sakit" || sLower === "s") statusFormatted = "Sakit";
              else if (sLower === "alpa" || sLower === "a" || sLower === "alpha") statusFormatted = "Alpa";
              else if (sLower === "hadir" || sLower === "h") statusFormatted = "Hadir";
              else {
                errors.push({ row: i + 2, reason: `Status '${rawStatus}' tidak dikenal. Pilihan: Hadir, Izin, Sakit, Alpa.`, type: "error" });
                continue;
              }

              // Cari siswa
              const { data: siswa } = await supabase
                .from("siswa")
                .select("id")
                .eq("nomor_induk", noInduk)
                .maybeSingle();

              if (!siswa) {
                errors.push({ row: i + 2, reason: `Siswa dengan No. Induk '${noInduk}' tidak ditemukan di sistem.`, type: "warning" });
                continue;
              }

              // Cek apakah sudah ada presensi pada tanggal tersebut
              const { data: existing } = await supabase
                .from("presensi")
                .select("id")
                .eq("siswa_id", siswa.id)
                .eq("tanggal", tanggal)
                .maybeSingle();

              if (existing) {
                const { error: updErr } = await supabase
                  .from("presensi")
                  .update({
                    status: statusFormatted,
                    keterangan,
                    created_by: "superadmin",
                  })
                  .eq("id", existing.id);

                if (updErr) {
                  errors.push({ row: i + 2, reason: `Gagal memperbarui presensi: ${updErr.message}`, type: "error" });
                } else {
                  updatedCount++;
                }
              } else {
                const { error: insErr } = await supabase.from("presensi").insert({
                  siswa_id: siswa.id,
                  tanggal,
                  jam: "07:30:00",
                  status: statusFormatted,
                  keterangan,
                  created_by: "superadmin",
                });

                if (insErr) {
                  errors.push({ row: i + 2, reason: `Gagal menyimpan presensi: ${insErr.message}`, type: "error" });
                } else {
                  importedCount++;
                }
              }

              const progress = Math.round(((i + 1) / rows.length) * 100);
              controller.enqueue(encoder.encode(JSON.stringify({
                type: "progress",
                progress,
                status: `Memproses baris ${i + 1} dari ${rows.length}...`,
              }) + "\n"));
            }

            const statusParts: string[] = [];
            if (importedCount > 0) statusParts.push(`${importedCount} riwayat presensi baru disimpan`);
            if (updatedCount > 0) statusParts.push(`${updatedCount} riwayat presensi diperbarui`);
            if (errors.length > 0) statusParts.push(`${errors.length} gagal/dilewati`);
            const summaryMsg = `Impor selesai: ${statusParts.join(", ") || "0 data diproses"}.`;

            controller.enqueue(encoder.encode(JSON.stringify({
              type: "done",
              result: {
                total_rows: rows.length,
                imported_count: importedCount,
                updated_count: updatedCount,
                failed_count: errors.length,
                errors,
                message: summaryMsg,
              },
            }) + "\n"));
            controller.close();
          } catch (streamErr) {
            controller.enqueue(encoder.encode(JSON.stringify({
              type: "error",
              message: streamErr instanceof Error ? streamErr.message : String(streamErr),
            }) + "\n"));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
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
