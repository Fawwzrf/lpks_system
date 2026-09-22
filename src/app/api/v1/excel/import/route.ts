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

/**
 * Ekstraksi baris sheet secara cerdas:
 * - Mendeteksi letak baris header yang sesungguhnya (mendukung template dengan header grup bertingkat)
 * - Melewati baris petunjuk / hint row otomatis (misal: "Otomatis", "Cth: 01.0927", "Nama lengkap")
 * - Melewati baris kosong dan menyematkan nomor baris Excel asli (_excelRowNumber)
 */
function extractSheetRows(sheet: XLSX.WorkSheet): { rows: (Record<string, unknown> & { _excelRowNumber?: number })[]; headerRowIdx: number } {
  const matrix: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!matrix || matrix.length === 0) return { rows: [], headerRowIdx: -1 };

  let headerRowIdx = -1;
  const headerKeywords = [
    "no. induk", "no induk", "nomor_induk", "nama", "nama lengkap",
    "nik", "program", "kriteria", "tgl_bayar", "tgl. pembayaran",
    "nominal", "biaya pelatihan", "status"
  ];

  for (let r = 0; r < Math.min(matrix.length, 10); r++) {
    const rowVals = (matrix[r] || []).map(v => String(v ?? "").trim().toLowerCase());
    const isHeader = rowVals.some(v => headerKeywords.includes(v));
    if (isHeader) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1) headerRowIdx = 0;

  const headers = (matrix[headerRowIdx] || []).map(h => String(h ?? "").trim());
  const rows: (Record<string, unknown> & { _excelRowNumber?: number })[] = [];

  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const rawRow = matrix[r] || [];
    const rowObj: Record<string, unknown> = {};
    headers.forEach((h, colIdx) => {
      if (h) {
        rowObj[h] = rawRow[colIdx] !== undefined ? rawRow[colIdx] : "";
      }
    });

    // Deteksi jika baris ini merupakan baris petunjuk / hint
    const valNama = String(rowObj["Nama"] || "").trim().toLowerCase();
    const valNoInduk = String(rowObj["No. Induk"] || "").trim().toLowerCase();
    const valNo = String(rowObj["No"] || "").trim().toLowerCase();
    const valNik = String(rowObj["NIK"] || "").trim().toLowerCase();
    const valBiaya = String(rowObj["Biaya Pelatihan"] || "").trim().toLowerCase();

    if (
      valNama === "nama lengkap" ||
      valNoInduk.startsWith("cth:") ||
      valNo === "otomatis" ||
      valNik.includes("16 digit") ||
      valBiaya.includes("cth:") ||
      valBiaya.includes("nominal (atau")
    ) {
      continue;
    }

    const hasValues = Object.values(rowObj).some(v => String(v ?? "").trim() !== "");
    if (!hasValues) continue;

    rowObj._excelRowNumber = r + 1;
    rows.push(rowObj);
  }

  return { rows, headerRowIdx };
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

    const { rows, headerRowIdx } = extractSheetRows(workbook.Sheets[sheetName]);

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
              let estimasiDurasiHari: number = 0;
              const isNumericCode = /^\d+$/.test(namaProgram);

              if (isNumericCode) {
                const kodePrefix = manualNoInduk.split(".")[0].trim().padStart(2, "0");
                const { data: programs } = await supabase
                  .from("master_program")
                  .select("id, kode_program, estimasi_durasi_hari")
                  .eq("kode_program", kodePrefix);

                if (!programs || programs.length === 0) {
                  errors.push({ row: i + 2, reason: `Kode program '${kodePrefix}' tidak terdaftar di sistem.`, type: "error" });
                  controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", progress: Math.round(((i + 1) / rows.length) * 100), status: `Memproses baris ${i + 1} dari ${rows.length}...` }) + "\n"));
                  continue;
                }
                programId = programs[0].id;
                estimasiDurasiHari = Number(programs[0].estimasi_durasi_hari || 0);
              } else {
                const { data: prog } = await supabase
                  .from("master_program")
                  .select("id, estimasi_durasi_hari")
                  .ilike("nama", `%${namaProgram}%`)
                  .limit(1)
                  .maybeSingle();

                if (!prog) {
                  errors.push({ row: i + 2, reason: `Program '${namaProgram}' tidak ditemukan. Pastikan nama program sesuai daftar (contoh: SMAW 4G).`, type: "error" });
                  controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", progress: Math.round(((i + 1) / rows.length) * 100), status: `Memproses baris ${i + 1} dari ${rows.length}...` }) + "\n"));
                  continue;
                }
                programId = prog.id;
                estimasiDurasiHari = Number(prog.estimasi_durasi_hari || 0);
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

              // Hitung tanggal masuk & tanggal keluar
              const tglMasukFinal = parseExcelDate(row["Tgl. Masuk"]) || new Date().toISOString().split("T")[0];
              let tglKeluarFinal = parseExcelDate(row["Tgl. Keluar"]);
              if (!tglKeluarFinal && estimasiDurasiHari > 0 && tglMasukFinal) {
                const d = new Date(tglMasukFinal);
                d.setDate(d.getDate() + estimasiDurasiHari);
                tglKeluarFinal = d.toISOString().split("T")[0];
              }

              const supabaseAdmin = createAdminClient();

              // Cek duplikat siswa:
              // Siswa boleh terdaftar lebih dari 1 kali jika mengambil program berbeda (misal 2 pelatihan berbeda).
              // Duplikat dicegah jika:
              // 1. Nomor Induk sudah terdaftar
              // 2. Username sudah terdaftar
              // 3. NIK yang sama di program yang sama sudah terdaftar
              const [{ data: byNoInduk }, { data: byUsername }, { data: byNikSameProgram }] = await Promise.all([
                supabase.from("siswa").select("id, status_siswa").eq("nomor_induk", noInduk).maybeSingle(),
                supabase.from("siswa").select("id, status_siswa").eq("username", username).maybeSingle(),
                programId ? supabase.from("siswa").select("id, status_siswa").eq("nik", nik).eq("program_id", programId).maybeSingle() : Promise.resolve({ data: null }),
              ]);

              const existingUser = byNoInduk || byNikSameProgram || byUsername;

              // Tentukan status_siswa otomatis: jika tgl_keluar sudah lewat atau ada info status di Excel
              const todayStr = new Date().toISOString().split("T")[0];
              const rawStatus = String(row["Status"] || row["Status Siswa"] || row["status_siswa"] || "").trim().toLowerCase();
              let statusSiswa: "aktif" | "alumni" | "out" = "aktif";
              if (rawStatus.includes("out") || rawStatus.includes("keluar")) {
                statusSiswa = "out";
              } else if (rawStatus.includes("alumni") || rawStatus.includes("lulus")) {
                statusSiswa = "alumni";
              } else if (tglKeluarFinal && tglKeluarFinal <= todayStr) {
                statusSiswa = "alumni";
              } else {
                statusSiswa = "aktif";
              }

              if (existingUser) {
                // Pertahankan status 'out' jika sebelumnya sudah ditandai 'out' secara manual dan kolom status di Excel kosong
                if (existingUser.status_siswa === "out" && !rawStatus) {
                  statusSiswa = "out";
                }

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
                  tgl_masuk: tglMasukFinal,
                  tgl_keluar: tglKeluarFinal,
                  status_siswa: statusSiswa,
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
                    tgl_masuk:            tglMasukFinal,
                    tgl_keluar:           tglKeluarFinal,
                    status_siswa:         statusSiswa,
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

    if (modul === "arsip_alumni") {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let importedCount = 0;
            let updatedCount = 0;
            const errors: { row: number; reason: string; type: "warning" | "error" }[] = [];

            const { data: allPrograms } = await supabase
              .from("master_program")
              .select("id, kode_program, nama, biaya");

            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              const excelRow = (row._excelRowNumber as number) || (i + 2);
              const nama = String(row["Nama"] || row["Nama Lengkap"] || row["nama"] || "").trim();
              const manualNoInduk = String(row["No. Induk"] || row["No Induk"] || row["nomor_induk"] || "").trim();
              const rawNik = String(row["NIK"] || row["nik"] || "").trim();
              const rawProgram = String(row["Program"] || row["program"] || "").trim();
              const tempatLahir = String(row["Tempat Lahir"] || row["tempat_lahir"] || "").trim();
              const tglLahir = parseExcelDate(row["Tanggal Lahir"] || row["tgl_lahir"]);
              const alamat = String(row["Alamat"] || row["alamat"] || "").trim();
              const noHp = String(row["No. HP"] || row["No HP"] || row["no_hp"] || "").trim();
              const pendidikan = String(row["Pend. Terakhir"] || row["Pendidikan Terakhir"] || row["pendidikan_terakhir"] || "").trim();
              const emailKolom = String(row["Email"] || row["email"] || "").trim();
              const tglMasuk = parseExcelDate(row["Tgl. Masuk"] || row["tgl_masuk"]) || "2015-01-01";

              // Durasi → tgl_keluar (baru); fallback ke kolom Tgl. Lulus lama
              const durasiHari = parseInt(String(row["Durasi (hari)"] || row["Durasi"] || row["durasi"] || "0").replace(/\D/g, ""), 10);
              const tglLulus = durasiHari > 0
                ? (() => {
                    const d = new Date(tglMasuk);
                    d.setDate(d.getDate() + durasiHari);
                    return d.toISOString().split("T")[0];
                  })()
                : (parseExcelDate(row["Tgl. Lulus"] || row["Tanggal Lulus"] || row["tgl_keluar"]) || tglMasuk);

              // Biaya: deteksi "(sertifikat)" → hanya data keuangan & sertifikat, tanpa nilai
              const rawBiayaStr = String(row["Biaya Pelatihan"] || row["Biaya"] || row["biaya"] || "0");
              const biaya = parseInt(rawBiayaStr.replace(/\D/g, ""), 10) || 0;

              const noSertifikat = String(row["No. Sertifikat"] || row["No Sertifikat"] || row["no_sertifikat"] || "").trim();
              const ketStr = String(row["Ket"] || row["ket"] || "Lunas").trim();

              // Lewati baris kosong
              if (!nama && !manualNoInduk && !rawNik) continue;

              if (!nama) {
                errors.push({ row: excelRow, reason: "Nama siswa wajib diisi.", type: "warning" });
                controller.enqueue(encoder.encode(JSON.stringify({
                  type: "progress",
                  progress: Math.round(((i + 1) / rows.length) * 100),
                  status: `Memproses baris ${i + 1} dari ${rows.length}...`,
                }) + "\n"));
                continue;
              }

              // Cari program: cocokkan nama terlebih dahulu (bukan kode), lalu fallback kode & prefix
              const cleanProg = rawProgram.replace(/\s*\(Banper\)\s*/i, "").trim();
              const kodePrefix = manualNoInduk.split(".")[0].trim().padStart(2, "0");

              let matchedProg =
                allPrograms?.find(p => p.nama.toLowerCase() === rawProgram.toLowerCase()) ??
                allPrograms?.find(p => p.nama.toLowerCase() === cleanProg.toLowerCase());

              if (!matchedProg && cleanProg) {
                const lowerClean = cleanProg.toLowerCase();
                if (lowerClean.includes("kombinasi")) {
                  matchedProg = allPrograms?.find(p => p.kode_program === "03");
                } else if (lowerClean.includes("fcaw") || lowerClean.includes("gmaw")) {
                  matchedProg = allPrograms?.find(p => p.kode_program === "04" || p.nama.toLowerCase().includes("fcaw"));
                } else if (lowerClean.includes("gtaw")) {
                  matchedProg = allPrograms?.find(p => p.kode_program === "02" || p.nama.toLowerCase().includes("gtaw"));
                } else if (lowerClean.includes("4g")) {
                  matchedProg = allPrograms?.find(p => p.nama.toLowerCase().includes("4g"));
                } else if (lowerClean.includes("6g")) {
                  matchedProg = allPrograms?.find(p => p.nama.toLowerCase().includes("6g"));
                } else if (lowerClean.includes("3g")) {
                  matchedProg = allPrograms?.find(p => p.nama.toLowerCase().includes("3g"));
                }
              }

              // Fallback berdasarkan kode program atau prefix nomor induk
              if (!matchedProg) {
                matchedProg =
                  allPrograms?.find(p => p.kode_program === rawProgram || p.kode_program === rawProgram.padStart(2, "0")) ??
                  allPrograms?.find(p => p.kode_program === kodePrefix);
              }

              if (!matchedProg && allPrograms && allPrograms.length > 0) {
                matchedProg = allPrograms[0];
              }
              const programId = matchedProg?.id || null;

              // Tentukan nomor induk
              let finalNoInduk = manualNoInduk;
              if (!finalNoInduk) {
                finalNoInduk = `${matchedProg?.kode_program || "01"}.${String(i + 1).padStart(4, "0")}`;
              }

              // NIK validasi / fallback anonim untuk arsip lama tanpa NIK
              let finalNik = rawNik.replace(/\D/g, "");
              if (!finalNik) {
                finalNik = `ANON-${finalNoInduk.replace(/[^a-zA-Z0-9]/g, "")}-${String(excelRow).padStart(4, "0")}`;
              }

              // Format nomor urut
              const parts = finalNoInduk.split(".");
              const urutStr = parts.length > 1 ? parts.slice(1).join(".") : parts[0];
              const numUrut = parseInt(urutStr.replace(/\D/g, ""), 10);
              const urutanNomor = isNaN(numUrut) ? null : numUrut;

              // Email & username awal
              const namaDepanClean = nama.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "alumni";
              const cleanNoIndukForUser = finalNoInduk.replace(/\./g, "");
              let emailFinal = emailKolom || `${namaDepanClean}.${cleanNoIndukForUser}@lpks.id`;
              let username = `${namaDepanClean}@${cleanNoIndukForUser}`;

              // Tentukan status_siswa:
              // Jika kolom Ket berisi "Out", set ke "out". Selain itu default "alumni".
              let statusSiswa: "aktif" | "alumni" | "out" = "alumni";
              if (ketStr.toLowerCase().includes("out")) {
                statusSiswa = "out";
              }

              // 1. Cek apakah siswa sudah ada di sistem
              // Banper: boleh ada no_induk sama jika program berbeda.
              let siswaId: string | null = null;
              const { data: existingExact } = programId
                ? await supabase
                    .from("siswa")
                    .select("id, status_siswa")
                    .eq("nomor_induk", finalNoInduk)
                    .eq("program_id", programId)
                    .maybeSingle()
                : { data: null };

              if (existingExact) {
                // Siswa dengan kombinasi no_induk + program sudah ada → update
                siswaId = existingExact.id;
                await supabase
                  .from("siswa")
                  .update({
                    status_siswa: statusSiswa,
                    nama_lengkap: nama,
                    tempat_lahir: tempatLahir || undefined,
                    tgl_lahir: tglLahir || undefined,
                    alamat_lengkap: alamat || undefined,
                    no_hp: noHp || undefined,
                    pendidikan_terakhir: pendidikan || undefined,
                    tgl_masuk: tglMasuk,
                    tgl_keluar: tglLulus,
                    urutan_nomor: urutanNomor,
                    biaya_pelatihan: biaya > 0 ? biaya : undefined,
                  })
                  .eq("id", siswaId);
                updatedCount++;
              } else {
                // Siswa baru (atau siswa yang sama mengambil program kedua / Banper)
                // Cegah konflik jika email atau username sudah dipakai record lain
                const { data: emailConflict } = await supabase
                  .from("siswa")
                  .select("id")
                  .eq("email", emailFinal)
                  .maybeSingle();

                if (emailConflict) {
                  if (emailFinal.includes("@")) {
                    const [uPart, dPart] = emailFinal.split("@");
                    emailFinal = `${uPart}+${matchedProg?.kode_program || "b"}@${dPart}`;
                  } else {
                    emailFinal = `${emailFinal}_${matchedProg?.kode_program || "b"}`;
                  }
                }

                const { data: userConflict } = await supabase
                  .from("siswa")
                  .select("id")
                  .eq("username", username)
                  .maybeSingle();

                if (userConflict) {
                  username = `${username}_${matchedProg?.kode_program || "b"}`;
                }

                const { data: newS, error: sErr } = await supabase
                  .from("siswa")
                  .insert({
                    program_id: programId,
                    nomor_induk: finalNoInduk,
                    urutan_nomor: urutanNomor,
                    nama_lengkap: nama,
                    nik: finalNik,
                    username,
                    email: emailFinal,
                    tempat_lahir: tempatLahir || null,
                    tgl_lahir: tglLahir || null,
                    alamat_lengkap: alamat || null,
                    no_hp: noHp || null,
                    pendidikan_terakhir: pendidikan || null,
                    tgl_masuk: tglMasuk,
                    tgl_keluar: tglLulus,
                    status_siswa: statusSiswa,
                    biaya_pelatihan: biaya > 0 ? biaya : null,
                    is_password_default: true,
                  })
                  .select("id")
                  .single();

                if (sErr || !newS) {
                  errors.push({ row: excelRow, reason: `Gagal menyimpan data siswa: ${sErr?.message || "Database error"}`, type: "error" });
                  continue;
                }
                siswaId = newS.id;
                importedCount++;
              }

              // 2. Transaksi Keuangan: 6 slot pembayaran
              const skema = String(row["Skema Pembayaran"] || row["Skema"] || row["status_pembayaran"] || "").trim().toLowerCase();
              const isCicilan = skema.includes("cicil") || skema.includes("angsur");

              const { data: existingTxList } = await supabase
                .from("transaksi_keuangan")
                .select("id")
                .eq("siswa_id", siswaId);

              if (!existingTxList || existingTxList.length === 0) {
                // Collect all non-empty payment slots
                const slots: { tgl: string; nominal: number; angsuranKe: number }[] = [];
                for (let slot = 1; slot <= 6; slot++) {
                  const rawTgl = row[`Tgl. Pembayaran ${slot}`] || row[`Tanggal Pembayaran ${slot}`];
                  const rawNom = String(row[`Nominal ${slot}`] || row[`Nominal Pembayaran ${slot}`] || "").replace(/\D/g, "");
                  const tgl = parseExcelDate(rawTgl);
                  const nom = rawNom ? parseInt(rawNom, 10) : 0;
                  if (tgl && nom > 0) slots.push({ tgl, nominal: nom, angsuranKe: slot });
                }

                if (slots.length > 0) {
                  // Insert each captured slot
                  for (const s of slots) {
                    const ket = slots.length === 1
                      ? (isCicilan ? "Pembayaran Angsuran 1 (Arsip Alumni)" : "Pembayaran Pelunasan (Arsip Alumni)")
                      : `Pembayaran Angsuran ${s.angsuranKe} (Arsip Alumni)`;
                    await supabase.from("transaksi_keuangan").insert({
                      siswa_id: siswaId,
                      nominal: s.nominal,
                      tgl_bayar: s.tgl,
                      metode: "Tunai",
                      keterangan: ket,
                      penerima: "Superadmin (Import)",
                    });
                  }
                } else if (biaya > 0) {
                  // Fallback: no slots filled → auto-generate from skema
                  const tglBayar1 = isCicilan ? tglMasuk : tglLulus;
                  const nominal1 = isCicilan ? Math.round(biaya / 2) : biaya;
                  await supabase.from("transaksi_keuangan").insert({
                    siswa_id: siswaId,
                    nominal: nominal1,
                    tgl_bayar: tglBayar1,
                    metode: "Tunai",
                    keterangan: isCicilan ? "Pembayaran Angsuran 1 (Arsip Alumni)" : "Pembayaran Pelunasan (Arsip Alumni)",
                    penerima: "Superadmin (Import)",
                  });
                  if (isCicilan && biaya - nominal1 > 0) {
                    await supabase.from("transaksi_keuangan").insert({
                      siswa_id: siswaId,
                      nominal: biaya - nominal1,
                      tgl_bayar: tglLulus,
                      metode: "Tunai",
                      keterangan: "Pembayaran Angsuran 2 (Pelunasan Arsip Alumni)",
                      penerima: "Superadmin (Import)",
                    });
                  }
                }

                // Update biaya_pelatihan di tabel siswa jika ada
                if (biaya > 0) {
                  await supabase
                    .from("siswa")
                    .update({ biaya_pelatihan: biaya })
                    .eq("id", siswaId);
                }
              }

              // 3. Sertifikat (Otomatis Dicetak)
              if (noSertifikat) {
                const { data: existingCert } = await supabase
                  .from("sertifikat")
                  .select("id")
                  .eq("siswa_id", siswaId)
                  .maybeSingle();

                if (!existingCert) {
                  await supabase.from("sertifikat").insert({
                    siswa_id: siswaId,
                    no_sertifikat: noSertifikat,
                    status: "dicetak",
                    tgl_antrean: tglMasuk,
                    tgl_cetak: tglLulus,
                  });
                } else {
                  await supabase.from("sertifikat").update({
                    no_sertifikat: noSertifikat,
                    status: "dicetak",
                    tgl_cetak: tglLulus,
                  }).eq("id", existingCert.id);
                }
              }

              const progress = Math.round(((i + 1) / rows.length) * 100);
              controller.enqueue(encoder.encode(JSON.stringify({
                type: "progress",
                progress,
                status: `Memproses arsip ${i + 1} dari ${rows.length} (${nama})...`,
              }) + "\n"));
            }

            const statusParts: string[] = [];
            if (importedCount > 0) statusParts.push(`${importedCount} arsip alumni baru disimpan`);
            if (updatedCount > 0) statusParts.push(`${updatedCount} data alumni diperbarui`);
            if (errors.length > 0) statusParts.push(`${errors.length} dilewati/gagal`);
            const summaryMsg = `Impor Arsip Selesai: ${statusParts.join(", ") || "0 data diproses"}. Siswa alumni, status keuangan lunas, dan nomor sertifikat telah tercatat.`;

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
